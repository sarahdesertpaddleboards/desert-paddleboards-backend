// server/routers/classes.admin.ts
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
  // MySQL Drizzle does NOT support .returning()
  await db.insert(classProducts).values(req.body);

  // We need to fetch the inserted row. Best effort:
  // 1) If caller supplies product_key (unique), fetch by that.
  // 2) Otherwise, fallback to "latest inserted row" (not perfect, but works for admin tools).
  const bodyAny = req.body as any;

  if (bodyAny?.productKey) {
    const [row] = await db
      .select()
      .from(classProducts)
      .where(eq(classProducts.productKey, bodyAny.productKey))
      .limit(1);

    return res.json(row ?? null);
  }

  // Fallback: return all rows last one (simple + reliable enough for admin usage)
  const rows = await db.select().from(classProducts);
  const last = rows[rows.length - 1] ?? null;
  res.json(last);
});

// UPDATE
router.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  // Update first (no returning on MySQL)
  await db.update(classProducts).set(req.body).where(eq(classProducts.id, id));

  // Then fetch updated row
  const [row] = await db
    .select()
    .from(classProducts)
    .where(eq(classProducts.id, id))
    .limit(1);

  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});

// DELETE
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await db.delete(classProducts).where(eq(classProducts.id, id));
  res.json({ ok: true });
});

export default router;
