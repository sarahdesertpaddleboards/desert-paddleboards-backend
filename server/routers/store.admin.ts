import { Router } from "express";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../_core/requireAdmin";

const router = Router();

// GET ALL
router.get("/", requireAdmin, async (_req, res) => {
  const items = await db.select().from(productOverrides);
  res.json(items);
});

// CREATE
router.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    const [item] = await db.insert(productOverrides).values(data).returning();
    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN CREATE ERROR", err);
    res.status(500).json({ error: "Failed to create store product" });
  }
});

// UPDATE
router.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db
      .update(productOverrides)
      .set(req.body)
      .where(eq(productOverrides.id, id))
      .returning();

    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN UPDATE ERROR", err);
    res.status(500).json({ error: "Failed to update store product" });
  }
});

// DELETE
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(productOverrides).where(eq(productOverrides.id, id));
  res.json({ ok: true });
});

export default router;
