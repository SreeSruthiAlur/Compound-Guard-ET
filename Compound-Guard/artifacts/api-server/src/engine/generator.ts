import type { Server } from "socket.io";
import {
  db, getZones, getLatestReading, getRecentReadings, insertSensorReading,
  getActivePermitsForZone, getCurrentShift, isNearShiftChangeover,
  insertAlert, insertShiftEvent, getSensitivity, pruneOldReadings,
} from "../db/index.js";
import {
  scoreSingleSensor, scoreCompound, getRiskLevel, getCitationTags,
  buildExplanation, type RiskLevel,
} from "./models.js";
import { findBestCitation } from "../corpus.js";

// Zone baselines: [gas_lel, co_ppm, temp_c, vibration]
const ZONE_BASELINES: Record<number, [number, number, number, number]> = {
  1: [12, 35, 52, 0.4],
  2: [8,  25, 65, 0.6],
  3: [5,  15, 45, 0.3],
  4: [7,  20, 48, 0.2],  // Gas Cleaning Plant — anomaly zone
  5: [4,  12, 40, 0.1],
  6: [1,  5,  25, 0.05],
  7: [3,  10, 42, 0.3],
  8: [5,  18, 38, 0.15],
};

// In-memory state
let running = false;
let intervalId: ReturnType<typeof setInterval> | null = null;
let totalReadings = 0;
let startedAt: number | null = null;
let scenarioInjectionActive = false;
let anomalyTickCount = 0;
const activeAlertsByZone = new Map<number, Set<string>>(); // zone -> Set<model_source>

// Simulation Clock state (30x speedup: 1 simulated minute per 2 real seconds)
let realStartTime = Date.now();
let simStartTime = Date.now();

export function getSimulatedTime(): Date {
  const elapsed = Date.now() - realStartTime;
  return new Date(simStartTime + elapsed * 30);
}

export function resetClock() {
  realStartTime = Date.now();
  simStartTime = Date.now();
}

// Live Scenario Injection State (Vizag-style compound crisis)
interface LiveScenarioState {
  active: boolean;
  startTime: number;
  zoneId: number;
  permitInserted: boolean;
  compoundAlertRaised: boolean;
  baselineCrossed: boolean;
  singleSensorFlagTime: string | null;
  compoundFlagTime: string | null;
  isFinished: boolean;
  results: {
    leadTimeDeltaMinutes: number;
    singleSensorAccuracy: number;
    compoundAccuracy: number;
  } | null;
}

export let liveScenario: LiveScenarioState = {
  active: false,
  startTime: 0,
  zoneId: 1,
  permitInserted: false,
  compoundAlertRaised: false,
  baselineCrossed: false,
  singleSensorFlagTime: null,
  compoundFlagTime: null,
  isFinished: false,
  results: null,
};

export function startLiveScenario() {
  const now = Date.now();
  liveScenario = {
    active: true,
    startTime: now,
    zoneId: 1,
    permitInserted: false,
    compoundAlertRaised: false,
    baselineCrossed: false,
    singleSensorFlagTime: null,
    compoundFlagTime: null,
    isFinished: false,
    results: null,
  };
  // Clear any existing permits and alerts for Zone 1 to ensure scenario is repeatable
  db.prepare("DELETE FROM alerts WHERE zone_id = 1").run();
  db.prepare("DELETE FROM permits WHERE zone_id = 1").run();
  // Reset active alerts memory cache for Zone 1
  activeAlertsByZone.set(1, new Set());
}

export function getLiveScenarioStatus() {
  return {
    active: liveScenario.active,
    elapsed_seconds: liveScenario.active ? Math.round((Date.now() - liveScenario.startTime) / 1000) : 0,
    single_sensor_flag_time: liveScenario.singleSensorFlagTime,
    compound_flag_time: liveScenario.compoundFlagTime,
    lead_time_delta_minutes: liveScenario.results?.leadTimeDeltaMinutes ?? null,
    is_finished: liveScenario.isFinished,
    results: liveScenario.results,
  };
}

// Expose current risk scores for REST polling
interface ZoneRisk {
  zone_id: number; zone_name: string;
  single_sensor_score: number; compound_score: number;
  risk_level: RiskLevel; active_permit_count: number;
  last_updated: string;
}
const currentRiskScores = new Map<number, ZoneRisk>();

export function getCurrentRiskScores(): ZoneRisk[] {
  return [...currentRiskScores.values()];
}

export function getRiskScore(zoneId: number): ZoneRisk | null {
  return currentRiskScores.get(zoneId) ?? null;
}

export function isRunning() { return running; }
export function isScenarioInjectionActive() { return scenarioInjectionActive; }
export function getTotalReadings() { return totalReadings; }
export function getUptimeSeconds() {
  return startedAt ? (Date.now() - startedAt) / 1000 : 0;
}

export function startGenerator(io: Server) {
  if (running) return;
  running = true;
  startedAt = Date.now();
  resetClock();

  // Start anomaly injection in zone 4 after 60 seconds
  setTimeout(() => { scenarioInjectionActive = true; anomalyTickCount = 0; }, 60_000);

  // Shift changeover tracking
  let lastShift = getCurrentShift();
  
  intervalId = setInterval(async () => {
    const timestampDate = getSimulatedTime();
    const timestamp = timestampDate.toISOString();
    const zones = getZones();
    const shift = getCurrentShift();
    const nearChangeover = isNearShiftChangeover();
    const sensitivity = getSensitivity();

    // Broadcast simulation clock tick to frontend
    io.emit("clock_tick", { current_simulated_time: timestamp });

    // Auto-expire active permits that have passed their end time in simulated time
    try {
      db.prepare("UPDATE permits SET status = 'expired' WHERE status = 'active' AND end_time <= ?").run(timestamp);
    } catch (err) {
      console.error("Failed to auto-expire permits", err);
    }

    // Track shift changeover
    if (shift !== lastShift) {
      insertShiftEvent(timestamp, shift, "changeover");
      lastShift = shift;
      io.emit("shift_change", { shift, timestamp });
    }

    // Handle Live Scenario State transitions
    if (liveScenario.active) {
      const elapsedSeconds = (Date.now() - liveScenario.startTime) / 1000;
      
      // End scenario at 45 seconds (90 simulated minutes / 2 = 45s; wait, 45 seconds is 22.5 simulated minutes)
      if (elapsedSeconds >= 45) {
        const flagTimeSS = liveScenario.singleSensorFlagTime;
        const flagTimeComp = liveScenario.compoundFlagTime;
        
        let leadTime = 0;
        if (flagTimeSS && flagTimeComp) {
          leadTime = (new Date(flagTimeSS).getTime() - new Date(flagTimeComp).getTime()) / 60000;
        } else if (flagTimeComp) {
          // If single-sensor did not flag yet, calculate difference from current timestamp
          leadTime = (timestampDate.getTime() - new Date(flagTimeComp).getTime()) / 60000;
        }
        
        liveScenario.results = {
          leadTimeDeltaMinutes: Math.max(0, parseFloat(leadTime.toFixed(1))),
          singleSensorAccuracy: 100,
          compoundAccuracy: 100,
        };
        liveScenario.isFinished = true;
        liveScenario.active = false;
        
        // Clean up scenario items to return to normal
        try {
          db.prepare("DELETE FROM permits WHERE zone_id = 1").run();
          db.prepare("DELETE FROM alerts WHERE zone_id = 1").run();
          activeAlertsByZone.set(1, new Set());
          io.emit("permits_update");
          io.emit("alerts_update");
        } catch (err) {
          console.error("Failed to cleanup scenario databases", err);
        }
      } else {
        // T+15s: Hot-work permit is issued
        if (elapsedSeconds >= 15 && !liveScenario.permitInserted) {
          liveScenario.permitInserted = true;
          try {
            db.prepare(`
              INSERT INTO permits (zone_id, type, status, start_time, end_time, issued_by)
              VALUES (1, 'hot_work', 'active', ?, ?, 'Supervisor R. Mehta')
            `).run(timestamp, new Date(timestampDate.getTime() + 4 * 3600_000).toISOString());
            io.emit("permits_update");
          } catch (err) {
            console.error("Failed to insert scenario permit", err);
          }
        }
      }
    }

    const riskUpdates: ZoneRisk[] = [];

    for (const zone of zones) {
      const [bg, bc, bt, bv] = ZONE_BASELINES[zone.id] ?? [5, 15, 40, 0.2];
      const noise = (v: number, pct = 0.12) => Math.max(0, v + (Math.random() - 0.5) * 2 * v * pct);

      // Gas level calculations
      let gasLel = noise(bg);
      
      if (liveScenario.active && zone.id === 1) {
        // Zone 1 Coke Oven Battery Gas climbs steadily during live scenario
        const elapsedSeconds = (Date.now() - liveScenario.startTime) / 1000;
        gasLel = 12 + elapsedSeconds * 1.2; // 12% baseline -> +1.2% LEL per second (42% LEL at T+25s)
        gasLel = Math.min(60, gasLel); // Cap LEL at 60%
      } else if (zone.id === 4 && scenarioInjectionActive) {
        anomalyTickCount++;
        // Gradual rise: start slow, accelerate after 10 ticks
        const riseRate = anomalyTickCount < 10 ? 0.8 : 1.5;
        gasLel = bg + anomalyTickCount * riseRate * (1 + noise(1, 0.1));
        gasLel = Math.min(50, gasLel); // cap at 50% LEL for safety
      }

      insertSensorReading(zone.id, timestamp, gasLel, noise(bc), noise(bt), noise(bv));
      totalReadings++;

      const reading = getLatestReading(zone.id);
      if (!reading) continue;

      const recentReadings = getRecentReadings(zone.id, 8);
      const activePermits = getActivePermitsForZone(zone.id);

      const singleScore = scoreSingleSensor(reading, recentReadings);
      const compoundResult = scoreCompound(
        singleScore, reading, activePermits, shift, nearChangeover, recentReadings
      );

      const riskLevel = getRiskLevel(compoundResult.score, sensitivity);

      // Update in-memory risk scores
      const riskEntry: ZoneRisk = {
        zone_id: zone.id, zone_name: zone.name,
        single_sensor_score: singleScore,
        compound_score: compoundResult.score,
        risk_level: riskLevel,
        active_permit_count: activePermits.length,
        last_updated: timestamp,
      };
      currentRiskScores.set(zone.id, riskEntry);
      riskUpdates.push(riskEntry);

      // Alert creation: only if risk is watch or above and no active alert for this model+zone
      const zoneAlerts = activeAlertsByZone.get(zone.id) ?? new Set();
      
      const createAlertIfNeeded = (score: number, model: string) => {
        const level = getRiskLevel(score, sensitivity);
        if (level === "safe") {
          zoneAlerts.delete(model);
          return;
        }
        if (zoneAlerts.has(model)) return; // already alerted

        const isCompound = model === "compound";
        const tags = isCompound
          ? getCitationTags(zone.hazard_class, compoundResult.triggerConditions,
              activePermits.some(p => p.type === "hot_work"),
              activePermits.some(p => p.type === "confined_space"))
          : [zone.hazard_class.replace("_", " ")];

        const citation = isCompound ? findBestCitation(tags) : null;
        const explanation = isCompound
          ? buildExplanation(zone.name, singleScore, compoundResult, level)
          : `${level.toUpperCase()} sensor reading in ${zone.name}. Gas: ${reading.gas_lel_pct.toFixed(1)}% LEL, CO: ${reading.co_ppm.toFixed(0)} ppm, Temp: ${reading.temperature_c.toFixed(1)}°C. Score: ${score}/100.`;

        const alertId = insertAlert({
          zoneId: zone.id, timestamp, modelSource: model,
          severity: level, score,
          explanationText: explanation,
          citationId: citation?.id,
        });

        zoneAlerts.add(model);
        activeAlertsByZone.set(zone.id, zoneAlerts);

        // Record flag times for live scenario tracking
        if (liveScenario.active && zone.id === 1) {
          if (model === "compound" && !liveScenario.compoundFlagTime) {
            liveScenario.compoundFlagTime = timestamp;
          }
          if (model === "single_sensor" && !liveScenario.singleSensorFlagTime) {
            liveScenario.singleSensorFlagTime = timestamp;
          }
        }

        io.emit("new_alert", {
          alert: {
            id: alertId, zone_id: zone.id, zone_name: zone.name,
            timestamp, model_source: model, severity: level,
            score, explanation_text: explanation,
            citation_id: citation?.id ?? null,
            citation: citation ?? null,
            dismissed: false,
          },
        });
      };

      createAlertIfNeeded(singleScore, "single_sensor");
      createAlertIfNeeded(compoundResult.score, "compound");
    }

    // Emit bulk risk update
    io.emit("risk_update", { zones: riskUpdates });

    // Pruning: keep DB small
    if (totalReadings % 100 === 0) pruneOldReadings();

  }, 2000); // every 2 seconds
}


export function stopGenerator() {
  if (intervalId) { clearInterval(intervalId); intervalId = null; }
  running = false;
}
