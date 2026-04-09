// server/routers/store.admin.ts
import { Router } from "express";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

async function requireModernAdmin(req: any, res: any, next: any) {
  try {
    await sdk.requireAdmin(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

const router = Router();

// GET ALL
router.get("/", requireModernAdmin, async (_req, res) => {
  const items = await db.select().from(productOverrides);
  res.json(items);
});

// CREATE
router.post("/", requireModernAdmin, async (req, res) => {
  try {
    const data = req.body as any;

    // MySQL Drizzle does NOT support .returning()
    await db.insert(productOverrides).values(data);

    // Best effort: fetch by id if provided, else fallback to last row.
    if (data?.id) {
      const [item] = await db
        .select()
        .from(productOverrides)
        .where(eq(productOverrides.id, Number(data.id)))
        .limit(1);

      return res.json(item ?? null);
    }

    const rows = await db.select().from(productOverrides);
    const last = rows[rows.length - 1] ?? null;
    res.json(last);
  } catch (err) {
    console.error("STORE ADMIN CREATE ERROR", err);
    res.status(500).json({ error: "Failed to create store product" });
  }
});

// UPDATE
router.patch("/:id", requireModernAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    // Update first (no returning on MySQL)
    await db
      .update(productOverrides)
      .set(req.body)
      .where(eq(productOverrides.id, id));

    // Then fetch updated row
    const [item] = await db
      .select()
      .from(productOverrides)
      .where(eq(productOverrides.id, id))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN UPDATE ERROR", err);
    res.status(500).json({ error: "Failed to update store product" });
  }
});

// DELETE
router.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await db.delete(productOverrides).where(eq(productOverrides.id, id));
  res.json({ ok: true });
});

export default router;
