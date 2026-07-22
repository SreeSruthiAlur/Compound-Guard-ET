import { Router } from "express";
import {
  getRecentShiftEvents, getAlerts, getAllPermits,
  getSensitivity, getSetting,
} from "../db/index.js";
import {
  isRunning, isScenarioInjectionActive, getTotalReadings, getUptimeSeconds,
  getCurrentRiskScores, getSimulatedTime,
} from "../engine/generator.js";
import { getAlert } from "../db/index.js";
import { getCorpusItem } from "../corpus.js";

const router = Router();

// GET /api/shift-events
router.get("/shift-events", (req, res) => {
  const limit = parseInt(String(req.query.limit ?? "20"));
  res.json(getRecentShiftEvents(limit));
});

// GET /api/generator/status
router.get("/generator/status", (_req, res) => {
  res.json({
    running: isRunning(),
    interval_seconds: 2,
    total_readings_generated: getTotalReadings(),
    scenario_injection_active: isScenarioInjectionActive(),
    uptime_seconds: getUptimeSeconds(),
    current_simulated_time: getSimulatedTime().toISOString(),
  });
});

// GET /api/settings/sensitivity
router.get("/settings/sensitivity", (_req, res) => {
  const sensitivity = getSensitivity();
  const dismissed = parseInt(getSetting("dismissed_count") ?? "0");
  res.json({
    sensitivity,
    dismissed_count: dismissed,
    watch_threshold: Math.round(22 / sensitivity),
    elevated_threshold: Math.round(45 / sensitivity),
    critical_threshold: Math.round(70 / sensitivity),
  });
});

// GET /api/stats
router.get("/stats", (_req, res) => {
  const activePermits = getAllPermits(true).length;
  const riskScores = getCurrentRiskScores();
  const zonesAtRisk = riskScores.filter((z) => z.risk_level !== "safe").length;
  const activeAlerts = getAlerts({ limit: 200, includeDismissed: false }).length;
  const criticalAlerts = getAlerts({ limit: 200, severity: "critical", includeDismissed: false }).length;

  res.json({
    active_permits: activePermits,
    zones_at_risk: zonesAtRisk,
    active_alerts: activeAlerts,
    critical_alerts: criticalAlerts,
    sensitivity: getSensitivity(),
    generator_running: isRunning(),
    last_updated: new Date().toISOString(),
  });
});

// GET /api/emergency/:alertId
router.get("/emergency/:alertId", (req, res) => {
  const alertId = parseInt(req.params.alertId);
  if (isNaN(alertId)) return res.status(400).json({ error: "Invalid alertId" });

  const alert = getAlert(alertId);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  const now = new Date().toISOString();
  const generatedAt = now;

  const evacuationNotice = `DRAFT EVACUATION NOTICE — ${alert.zone_name.toUpperCase()}

INCIDENT TIME: ${new Date(alert.timestamp).toLocaleString()}
ZONE: ${alert.zone_name}
SEVERITY: ${alert.severity.toUpperCase()}
COMPOUND RISK SCORE: ${alert.score.toFixed(0)}/100

IMMEDIATE ACTIONS REQUIRED:

1. EVACUATE all non-essential personnel from ${alert.zone_name} and adjacent zones immediately.
2. SUSPEND all active work permits in ${alert.zone_name} until area is declared safe.
3. NOTIFY site emergency coordinator and plant manager.
4. DEPLOY emergency response team to muster point Alpha.
5. INITIATE continuous gas monitoring — do not re-enter without atmospheric clearance.
6. ISOLATE utilities (gas supply, electrical feeds) to ${alert.zone_name} per emergency isolation procedure.

ASSEMBLY POINT: Gate 3 Emergency Muster Area
EMERGENCY CONTACT: Plant Control Room +91-891-XXX-XXXX

This notice is auto-generated based on compound risk detection. Requires authorized supervisor sign-off before transmission.`;

  const incidentReport = `PRELIMINARY INCIDENT REPORT — DRAFT

Report No.: CGD-${Date.now().toString().slice(-6)}
Date/Time: ${new Date(alert.timestamp).toLocaleString()}
Prepared By: CompoundGuard Automated System
Status: PRELIMINARY — NOT FOR EXTERNAL DISTRIBUTION

INCIDENT DETAILS:
Zone: ${alert.zone_name}
Detection Model: ${alert.model_source === "compound" ? "Compound Risk Engine" : "Single-Sensor Baseline"}
Risk Score: ${alert.score.toFixed(0)}/100 (${alert.severity.toUpperCase()})
Detection Timestamp: ${alert.timestamp}

TRIGGER CONDITIONS:
${alert.explanation_text}

${alert.citation_id ? `APPLICABLE REGULATION:\nSee citation: ${alert.citation_id}` : ""}

IMMEDIATE RESPONSE STATUS:
[ ] Evacuation initiated
[ ] Work permits suspended
[ ] Emergency coordinator notified
[ ] Gas monitoring team deployed
[ ] Utility isolation completed

PRELIMINARY CAUSE ASSESSMENT:
Compound risk flagged by automated monitoring system based on correlation of sensor readings,
active work permits, and shift context. Root cause investigation to be initiated by safety officer.

NEXT STEPS:
1. Complete evacuation and headcount verification
2. Obtain atmospheric clearance from safety officer
3. Conduct formal incident investigation within 24 hours
4. File regulatory report per Factory Act 1948 §41B requirements

— END OF PRELIMINARY REPORT —
This report requires review and signature by the Site Safety Officer before filing.`;

  res.json({
    alert_id: alertId,
    zone_name: alert.zone_name,
    severity: alert.severity,
    evacuation_notice: evacuationNotice,
    incident_report: incidentReport,
    generated_at: generatedAt,
    is_draft: true,
    citation: alert.citation_id ? getCorpusItem(alert.citation_id) ?? null : null,
  });
});

export default router;
