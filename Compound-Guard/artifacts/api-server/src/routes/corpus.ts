import { Router } from "express";
import { getCorpusItems, getCorpusItem } from "../corpus.js";

const router = Router();

// GET /api/corpus
router.get("/corpus", (req, res) => {
  const tags = req.query.tags as string | undefined;
  res.json(getCorpusItems(tags));
});

// GET /api/corpus/:corpusId
router.get("/corpus/:corpusId", (req, res) => {
  const item = getCorpusItem(req.params.corpusId);
  if (!item) return res.status(404).json({ error: "Corpus item not found" });
  res.json(item);
});

export default router;
