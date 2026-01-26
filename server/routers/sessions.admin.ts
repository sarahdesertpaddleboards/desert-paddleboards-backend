// server/routers/sessions.admin.ts
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
  // MySQL Drizzle does NOT support .returning()
  await db.insert(classSessions).values(req.body);

  // Best effort fetch:
  // 1) If req.body includes id (rare), fetch by id.
  // 2) Otherwise fallback to last row (admin usage).
  const bodyAny = req.body as any;

  if (bodyAny?.id) {
    const [row] = await db
      .select()
      .from(classSessions)
      .where(eq(classSessions.id, Number(bodyAny.id)))
      .limit(1);

    return res.json(row ?? null);
  }

  const rows = await db.select().from(classSessions);
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
  await db.update(classSessions).set(req.body).where(eq(classSessions.id, id));

  // Then fetch updated row
  const [row] = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, id))
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

  await db.delete(classSessions).where(eq(classSessions.id, id));
  res.json({ ok: true });
});

export default router;
