import { Router } from "express";
import { getAllPermits } from "../db/index.js";

const router = Router();

// GET /api/permits
router.get("/permits", (req, res) => {
  const activeOnly = req.query.active_only === "true";
  const zoneId = req.query.zone_id ? parseInt(String(req.query.zone_id)) : undefined;
  const permits = getAllPermits(activeOnly, zoneId);

  // Mark conflicts: hot_work permit in a zone that also has confined_space or elevated gas (simple heuristic)
  const byZone = new Map<number, typeof permits>();
  for (const p of permits) {
    if (!byZone.has(p.zone_id)) byZone.set(p.zone_id, []);
    byZone.get(p.zone_id)!.push(p);
  }

  res.json(
    permits.map((p) => {
      const zonePermits = byZone.get(p.zone_id) ?? [];
      const activeTypes = zonePermits
        .filter((x) => x.status === "active")
        .map((x) => x.type);
      const hasConflict =
        activeTypes.includes("hot_work") &&
        (activeTypes.includes("confined_space") || activeTypes.length > 1);
      return { ...p, has_conflict: hasConflict };
    })
  );
});

export default router;
