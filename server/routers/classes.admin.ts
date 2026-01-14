import { Router } from "express";
import { db } from "../db";
import { requireAdmin } from "../_core/requireAdmin";
import { classProducts } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// LIST
router.get("/", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(classProducts);
  res.json(rows);
});

// CREATE
router.post("/", requireAdmin, async (req, res) => {
  const [row] = await db.insert(classProducts).values(req.body).returning();
  res.json(row);
});

// UPDATE
router.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .update(classProducts)
    .set(req.body)
    .where(eq(classProducts.id, id))
    .returning();
  res.json(row);
});

// DELETE
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(classProducts).where(eq(classProducts.id, id));
  res.json({ ok: true });
});

export default router;
