import { Router } from "express";
import { getCurrentRiskScores, startLiveScenario, getLiveScenarioStatus } from "../engine/generator.js";
import { runScenarios, getScenarioStatus } from "../engine/scenario.js";

const router = Router();

// GET /api/risk-scores
router.get("/risk-scores", (_req, res) => {
  res.json(getCurrentRiskScores());
});

// POST /api/scenario/run
router.post("/scenario/run", (_req, res) => {
  const result = runScenarios();
  res.json(result);
});

// GET /api/scenario/status
router.get("/scenario/status", (_req, res) => {
  res.json(getScenarioStatus());
});

// POST /api/scenario/run-live
router.post("/scenario/run-live", (_req, res) => {
  startLiveScenario();
  res.json({ success: true, message: "Live Vizag scenario injected." });
});

// GET /api/scenario/live-status
router.get("/scenario/live-status", (_req, res) => {
  res.json(getLiveScenarioStatus());
});

export default router;
