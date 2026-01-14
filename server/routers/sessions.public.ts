import { Router } from "express";
import { db } from "../db";
import { classSessions } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET all sessions
router.get("/", async (_req, res) => {
  const list = await db.select().from(classSessions);
  res.json(list);
});

// GET specific session
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const row = await db
    .select()
    .from(classSessions)
    .where(eq(classSessions.id, id))
    .then(r => r[0]);

  if (!row) return res.status(404).json({ error: "Not found" });

  res.json(row);
});

export default router;
