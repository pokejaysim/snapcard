import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../middleware/auth.js";
import {
  createListingBatch,
  getListingBatch,
} from "../services/autopilot.js";

const router = Router();

router.post("/listing-batches", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;
  const body = req.body as {
    items?: Array<{ front_url?: string; back_url?: string | null }>;
  };

  const items = Array.isArray(body.items)
    ? body.items.map((item) => ({
        front_url: item.front_url ?? "",
        back_url: item.back_url ?? null,
      }))
    : [];

  try {
    const batch = await createListingBatch(authReq.userId, { items });
    res.status(201).json(batch);
  } catch (error) {
    res.status(400).json({
      error:
        error instanceof Error
          ? error.message
          : "Failed to create listing batch",
      code: "LISTING_BATCH_CREATE_ERROR",
    });
  }
});

router.get("/listing-batches/:id", requireAuth, async (req, res) => {
  const authReq = req as AuthenticatedRequest;

  try {
    const batchId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;
    if (!batchId) {
      res.status(400).json({ error: "Listing batch id is required." });
      return;
    }

    const batch = await getListingBatch(authReq.userId, batchId);
    res.json(batch);
  } catch (error) {
    res.status(404).json({
      error:
        error instanceof Error ? error.message : "Listing batch not found",
      code: "LISTING_BATCH_NOT_FOUND",
    });
  }
});

export default router;
