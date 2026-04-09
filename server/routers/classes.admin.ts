// server/routers/classes.admin.ts
import { Router } from "express";
import { db } from "../db";
import { classProducts } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

const router = Router();

async function requireModernAdmin(req: any, res: any, next: any) {
  try {
    await sdk.requireAdmin(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

router.get("/", requireModernAdmin, async (_req, res) => {
  const rows = await db.select().from(classProducts);
  res.json(rows);
});

router.post("/", requireModernAdmin, async (req, res) => {
  const payload = req.body ?? {};
  const result = await db.insert(classProducts).values(payload as any);
  res.json(result);
});

router.patch("/:id", requireModernAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  await db.update(classProducts).set(req.body ?? {}).where(eq(classProducts.id, id));
  res.json({ ok: true });
});

router.delete("/:id", requireModernAdmin, async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isFinite(id)) return res.status(400).json({ error: "Invalid id" });

  await db.delete(classProducts).where(eq(classProducts.id, id));
  res.json({ ok: true });
});

export default router;
