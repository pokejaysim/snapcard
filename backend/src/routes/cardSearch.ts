import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { searchCards, getCard } from "../services/pokemonTcg.js";

const router = Router();

// Search Pokemon TCG cards by name (free for all authenticated users)
router.get("/cards/search", requireAuth, async (req, res) => {
  const q = typeof req.query.q === "string" ? req.query.q : undefined;
  const page = parseInt(String(req.query.page ?? "1")) || 1;
  const pageSize = Math.min(parseInt(String(req.query.pageSize ?? "10")) || 10, 20);

  if (!q || q.trim().length < 2) {
    res.status(400).json({ error: "Query must be at least 2 characters" });
    return;
  }

  const result = await searchCards(q.trim(), page, pageSize);
  if (!result) {
    res.status(502).json({ error: "Card search is temporarily unavailable. Enter details manually." });
    return;
  }

  res.json(result);
});

// Get full card details by Pokemon TCG API ID
router.get("/cards/pokemon-tcg/:id", requireAuth, async (req, res) => {
  const id = req.params.id as string;

  const card = await getCard(id);
  if (!card) {
    res.status(404).json({ error: "Card not found" });
    return;
  }

  res.json(card);
});

export default router;
