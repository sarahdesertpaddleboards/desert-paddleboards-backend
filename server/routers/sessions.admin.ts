import { Router } from "express";
import { db } from "../db";
import { classSessions } from "../db/schema";
import { requireAdmin } from "../_core/requireAdmin";
import { eq } from "drizzle-orm";

const router = Router();

// LIST
router.get("/", requireAdmin, async (_req, res) => {
  const list = await db.select().from(classSessions);
  res.json(list);
});

// CREATE
router.post("/", requireAdmin, async (req, res) => {
  const [row] = await db.insert(classSessions).values(req.body).returning();
  res.json(row);
});

// UPDATE
router.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db
    .update(classSessions)
    .set(req.body)
    .where(eq(classSessions.id, id))
    .returning();
  res.json(row);
});

// DELETE
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(classSessions).where(eq(classSessions.id, id));
  res.json({ ok: true });
});

export default router;
