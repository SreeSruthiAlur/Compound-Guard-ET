import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import zonesRouter from "./zones.js";
import permitsRouter from "./permits.js";
import alertsRouter from "./alerts.js";
import riskRouter from "./risk.js";
import corpusRouter from "./corpus.js";
import miscRouter from "./misc.js";

const router: IRouter = Router();

router.use(healthRouter);
router.use(zonesRouter);
router.use(permitsRouter);
router.use(alertsRouter);
router.use(riskRouter);
router.use(corpusRouter);
router.use(miscRouter);

export default router;
