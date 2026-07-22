import { Router } from "express";
import { getZones, getZone, getZoneSensors, getActivePermitsForZone, getAlerts } from "../db/index.js";
import { getRiskScore, getCurrentRiskScores } from "../engine/generator.js";
import { scoreSingleSensor, scoreCompound, getRiskLevel, getCitationTags, buildExplanation } from "../engine/models.js";
import { getLatestReading, getRecentReadings, getCurrentShift, isNearShiftChangeover, getSensitivity } from "../db/index.js";
import { findBestCitation, getCorpusItem } from "../corpus.js";

const router = Router();

// GET /api/zones
router.get("/zones", (_req, res) => {
  const zones = getZones();
  const riskScores = getCurrentRiskScores();
  const riskMap = new Map(riskScores.map((r) => [r.zone_id, r]));

  const result = zones.map((z) => {
    const risk = riskMap.get(z.id);
    const activePermits = getActivePermitsForZone(z.id);
    const activeAlerts = getAlerts({ zoneId: z.id, limit: 5, includeDismissed: false });
    const latest = getLatestReading(z.id);
    return {
      ...z,
      current_compound_score: risk?.compound_score ?? 0,
      current_single_sensor_score: risk?.single_sensor_score ?? 0,
      risk_level: risk?.risk_level ?? "safe",
      active_alert_count: activeAlerts.length,
      active_permit_count: activePermits.length,
      last_sensor_at: latest?.timestamp ?? null,
    };
  });
  res.json(result);
});

// GET /api/zones/:zoneId
router.get("/zones/:zoneId", (req, res) => {
  const zoneId = parseInt(req.params.zoneId);
  if (isNaN(zoneId)) return res.status(400).json({ error: "Invalid zoneId" });

  const zone = getZone(zoneId);
  if (!zone) return res.status(404).json({ error: "Zone not found" });

  const risk = getRiskScore(zoneId);
  const activePermits = getActivePermitsForZone(zoneId);
  const activeAlerts = getAlerts({ zoneId, limit: 10, includeDismissed: false });
  const latestSensors = getZoneSensors(zoneId, 5);
  const latest = latestSensors[0];
  const recentReadings = getRecentReadings(zoneId, 8);
  const sensitivity = getSensitivity();
  const shift = getCurrentShift();
  const nearChangeover = isNearShiftChangeover();

  let riskBreakdown = null;
  if (latest) {
    const singleScore = scoreSingleSensor(latest, recentReadings);
    const compResult = scoreCompound(singleScore, latest, activePermits, shift, nearChangeover, recentReadings);
    const level = getRiskLevel(compResult.score, sensitivity);
    const tags = getCitationTags(zone.hazard_class, compResult.triggerConditions,
      activePermits.some(p => p.type === "hot_work"),
      activePermits.some(p => p.type === "confined_space"));
    const citation = findBestCitation(tags);
    riskBreakdown = {
      zone_id: zoneId,
      single_sensor_score: singleScore,
      compound_score: compResult.score,
      risk_level: level,
      sensor_contribution: compResult.sensorContribution,
      permit_conflict_contribution: compResult.permitContribution,
      shift_context_contribution: compResult.shiftContribution,
      trigger_conditions: compResult.triggerConditions,
      active_citation_id: citation?.id ?? null,
    };
  }

  // Enrich alerts with citations
  const enrichedAlerts = activeAlerts.map(a => ({
    ...a, dismissed: a.dismissed === 1,
    citation: a.citation_id ? getCorpusItem(a.citation_id) ?? null : null,
  }));

  const enrichedPermits = activePermits.map(p => ({
    ...p,
    has_conflict: p.type === "hot_work" && (latest?.gas_lel_pct ?? 0) >= 8,
  }));

  res.json({
    ...zone,
    current_compound_score: risk?.compound_score ?? 0,
    current_single_sensor_score: risk?.single_sensor_score ?? 0,
    risk_level: risk?.risk_level ?? "safe",
    active_alert_count: activeAlerts.length,
    active_permit_count: activePermits.length,
    last_sensor_at: latest?.timestamp ?? null,
    latest_sensors: latestSensors,
    active_permits: enrichedPermits,
    active_alerts: enrichedAlerts,
    risk_breakdown: riskBreakdown,
  });
});

// GET /api/zones/:zoneId/sensors
router.get("/zones/:zoneId/sensors", (req, res) => {
  const zoneId = parseInt(req.params.zoneId);
  if (isNaN(zoneId)) return res.status(400).json({ error: "Invalid zoneId" });
  const limit = parseInt(String(req.query.limit ?? "60"));
  const since = req.query.since as string | undefined;
  res.json(getZoneSensors(zoneId, limit, since));
});

// GET /api/zones/:zoneId/permits
router.get("/zones/:zoneId/permits", async (req, res) => {
  const zoneId = parseInt(req.params.zoneId);
  if (isNaN(zoneId)) return res.status(400).json({ error: "Invalid zoneId" });
  const activeOnly = req.query.active_only === "true";

  const permits = getActivePermitsForZone(zoneId);
  const all = activeOnly ? permits : getZoneSensors; // reuse helper
  const latest = getLatestReading(zoneId);

  // use the DB helper directly
  const { getPermitsByZone } = await import("../db/index.js") as any;
  const rows = activeOnly ? getActivePermitsForZone(zoneId) : getPermitsByZone(zoneId, false);
  res.json(rows.map((p: any) => ({
    ...p,
    has_conflict: p.type === "hot_work" && (latest?.gas_lel_pct ?? 0) >= 8,
  })));
});

// GET /api/zones/:zoneId/alerts
router.get("/zones/:zoneId/alerts", (req, res) => {
  const zoneId = parseInt(req.params.zoneId);
  if (isNaN(zoneId)) return res.status(400).json({ error: "Invalid zoneId" });
  const limit = parseInt(String(req.query.limit ?? "20"));
  const alerts = getAlerts({ zoneId, limit, includeDismissed: false });
  res.json(alerts.map(a => ({
    ...a, dismissed: a.dismissed === 1,
    citation: a.citation_id ? getCorpusItem(a.citation_id) ?? null : null,
  })));
});

// GET /api/zones/:zoneId/risk
router.get("/zones/:zoneId/risk", (req, res) => {
  const zoneId = parseInt(req.params.zoneId);
  if (isNaN(zoneId)) return res.status(400).json({ error: "Invalid zoneId" });

  const zone = getZone(zoneId);
  if (!zone) return res.status(404).json({ error: "Zone not found" });

  const latest = getLatestReading(zoneId);
  if (!latest) return res.json({
    zone_id: zoneId, single_sensor_score: 0, compound_score: 0,
    risk_level: "safe", sensor_contribution: 0, permit_conflict_contribution: 0,
    shift_context_contribution: 0, trigger_conditions: [], active_citation_id: null,
  });

  const recentReadings = getRecentReadings(zoneId, 8);
  const activePermits = getActivePermitsForZone(zoneId);
  const sensitivity = getSensitivity();
  const shift = getCurrentShift();
  const nearChangeover = isNearShiftChangeover();
  const singleScore = scoreSingleSensor(latest, recentReadings);
  const compResult = scoreCompound(singleScore, latest, activePermits, shift, nearChangeover, recentReadings);
  const level = getRiskLevel(compResult.score, sensitivity);
  const tags = getCitationTags(zone.hazard_class, compResult.triggerConditions,
    activePermits.some(p => p.type === "hot_work"),
    activePermits.some(p => p.type === "confined_space"));
  const citation = findBestCitation(tags);

  res.json({
    zone_id: zoneId,
    single_sensor_score: singleScore,
    compound_score: compResult.score,
    risk_level: level,
    sensor_contribution: compResult.sensorContribution,
    permit_conflict_contribution: compResult.permitContribution,
    shift_context_contribution: compResult.shiftContribution,
    trigger_conditions: compResult.triggerConditions,
    active_citation_id: citation?.id ?? null,
  });
});

export default router;
