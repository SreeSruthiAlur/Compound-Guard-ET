import { Router } from "express";
import { getAlerts, getAlert, dismissAlertById, updateSensitivityOnDismiss } from "../db/index.js";
import { getCorpusItem } from "../corpus.js";

const router = Router();

// GET /api/alerts
router.get("/alerts", (req, res) => {
  const limit = parseInt(String(req.query.limit ?? "50"));
  const modelSource = req.query.model_source as string | undefined;
  const severity = req.query.severity as string | undefined;
  const includeDismissed = req.query.include_dismissed === "true";

  const alerts = getAlerts({ limit, modelSource, severity, includeDismissed });
  res.json(
    alerts.map((a) => ({
      ...a,
      dismissed: a.dismissed === 1,
      citation: a.citation_id ? getCorpusItem(a.citation_id) ?? null : null,
    }))
  );
});

// POST /api/alerts/:alertId/dismiss
router.post("/alerts/:alertId/dismiss", (req, res) => {
  const alertId = parseInt(req.params.alertId);
  if (isNaN(alertId)) return res.status(400).json({ error: "Invalid alertId" });

  const alert = getAlert(alertId);
  if (!alert) return res.status(404).json({ error: "Alert not found" });

  dismissAlertById(alertId);
  const newSensitivity = updateSensitivityOnDismiss();

  res.json({ success: true, new_sensitivity: newSensitivity });
});

export default router;
