import type { SensorRow, PermitRow } from "../db/index.js";

export type RiskLevel = "safe" | "watch" | "elevated" | "critical";

export function getRiskLevel(score: number, sensitivity = 1.0): RiskLevel {
  const s = score * sensitivity;
  if (s >= 70) return "critical";
  if (s >= 45) return "elevated";
  if (s >= 22) return "watch";
  return "safe";
}

/** Single-sensor baseline: purely sensor-threshold + trend, no context */
export function scoreSingleSensor(
  reading: Pick<SensorRow, "gas_lel_pct" | "co_ppm" | "temperature_c">,
  recentReadings: Pick<SensorRow, "gas_lel_pct" | "co_ppm">[] = []
): number {
  let score = 0;

  // Gas LEL component
  if (reading.gas_lel_pct >= 40) score += 50;
  else if (reading.gas_lel_pct >= 25) score += 35;
  else if (reading.gas_lel_pct >= 15) score += 20;
  else if (reading.gas_lel_pct >= 10) score += 10;

  // CO component
  if (reading.co_ppm >= 100) score += 30;
  else if (reading.co_ppm >= 50) score += 20;
  else if (reading.co_ppm >= 25) score += 10;

  // Temperature component
  if (reading.temperature_c >= 80) score += 15;
  else if (reading.temperature_c >= 65) score += 8;

  // Trend: rising gas over recent window (rolling z-score proxy)
  if (recentReadings.length >= 5) {
    const vals = recentReadings.slice(0, 5).map((r) => r.gas_lel_pct); // newest first
    const oldAvg = (vals[3] + vals[4]) / 2;
    const newAvg = (vals[0] + vals[1]) / 2;
    if (oldAvg > 0 && newAvg / oldAvg > 1.25) score += 8; // 25% rise
  }

  return Math.min(100, Math.round(score));
}

export interface CompoundResult {
  score: number;
  sensorContribution: number;
  permitContribution: number;
  shiftContribution: number;
  triggerConditions: string[];
}

/** Compound engine: sensor + permit conflicts + shift context */
export function scoreCompound(
  sensorScore: number,
  reading: Pick<SensorRow, "gas_lel_pct" | "co_ppm" | "temperature_c">,
  activePermits: Pick<PermitRow, "type">[],
  shift: "day" | "evening" | "night",
  isNearChangeover: boolean,
  recentReadings: Pick<SensorRow, "gas_lel_pct">[] = []
): CompoundResult {
  let permitBonus = 0;
  const triggerConditions: string[] = [];

  if (sensorScore > 0) {
    if (reading.gas_lel_pct >= 10)
      triggerConditions.push(`Gas at ${reading.gas_lel_pct.toFixed(1)}% LEL (sensor baseline)`);
    if (reading.co_ppm >= 25)
      triggerConditions.push(`CO at ${reading.co_ppm.toFixed(0)} ppm (sensor baseline)`);
  }

  const hasHotWork = activePermits.some((p) => p.type === "hot_work");
  const hasConfinedSpace = activePermits.some((p) => p.type === "confined_space");
  const hasElectrical = activePermits.some((p) => p.type === "electrical");

  // Gas trend
  const gasRising =
    recentReadings.length >= 3 &&
    recentReadings[0].gas_lel_pct > recentReadings[2].gas_lel_pct * 1.08;

  if (hasHotWork && reading.gas_lel_pct >= 8) {
    permitBonus += 30;
    triggerConditions.push("Hot-work permit active with gas ≥8% LEL — ignition source present");
  }
  if (hasHotWork && gasRising) {
    permitBonus += 10;
    triggerConditions.push("Hot-work permit active with rising gas trend detected");
  }
  if (hasConfinedSpace && reading.gas_lel_pct >= 5) {
    permitBonus += 20;
    triggerConditions.push("Confined-space permit with gas presence — personnel at risk");
  }
  if (hasConfinedSpace && reading.co_ppm >= 20) {
    permitBonus += 15;
    triggerConditions.push("Confined-space permit with CO ≥20 ppm — IDLH risk");
  }
  if (hasElectrical && reading.temperature_c >= 55) {
    permitBonus += 15;
    triggerConditions.push("Electrical permit active with elevated temperature");
  }
  if (activePermits.length > 1) {
    permitBonus += 10;
    triggerConditions.push(
      `${activePermits.length} concurrent permits in zone — SIMOPS risk (OISD-STD-105 §5.2)`
    );
  }

  // Shift context multiplier
  let shiftMult = 1.0;
  if (isNearChangeover) {
    shiftMult *= 1.12;
    triggerConditions.push("Within 30 min of shift changeover — elevated handoff error risk");
  }
  if (shift === "night") {
    shiftMult *= 1.06;
    triggerConditions.push("Night shift — reduced staffing, fatigue risk");
  }

  const sensorContribution = sensorScore;
  const permitContribution = permitBonus;
  const rawScore = (sensorScore + permitBonus) * shiftMult;
  const shiftContribution = Math.round(rawScore - (sensorScore + permitBonus));

  return {
    score: Math.min(100, Math.round(rawScore)),
    sensorContribution,
    permitContribution,
    shiftContribution,
    triggerConditions,
  };
}

/** Derive citation tags from trigger conditions and hazard class */
export function getCitationTags(
  hazardClass: string,
  triggerConditions: string[],
  hasHotWork: boolean,
  hasConfinedSpace: boolean
): string[] {
  const tags: string[] = [];
  if (hazardClass === "gas_release_risk") tags.push("gas", "lel");
  if (hazardClass === "confined_space") tags.push("confined_space", "gas");
  if (hazardClass === "hot_work_adjacent") tags.push("hot_work");
  if (hazardClass === "electrical_hazard") tags.push("electrical");
  if (hasHotWork) tags.push("hot_work", "gas");
  if (hasConfinedSpace) tags.push("confined_space");
  if (triggerConditions.some((c) => c.includes("SIMOPS"))) tags.push("simops", "compound_risk");
  if (triggerConditions.some((c) => c.includes("night"))) tags.push("night_shift");
  if (triggerConditions.some((c) => c.includes("changeover"))) tags.push("shift");
  return [...new Set(tags)];
}

export function buildExplanation(
  zoneName: string,
  sensorScore: number,
  compound: CompoundResult,
  level: RiskLevel
): string {
  const parts = [
    `${level.toUpperCase()} compound risk in ${zoneName}.`,
    `Compound score: ${compound.score}/100 (sensor baseline: ${sensorScore}/100).`,
    ...compound.triggerConditions.map((c) => `• ${c}`),
  ];
  return parts.join(" ");
}
