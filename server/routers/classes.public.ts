import { Router } from "express";
import { db } from "../db";
import { classProducts } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /classes/products
router.get("/", async (_req, res) => {
  const list = await db.select().from(classProducts);
  res.json(list);
});

// GET /classes/products/:id
router.get("/:id", async (req, res) => {
  const id = Number(req.params.id);

  const item = await db
    .select()
    .from(classProducts)
    .where(eq(classProducts.id, id))
    .then(r => r[0]);

  if (!item) return res.status(404).json({ error: "Not found" });

  res.json(item);
});

export default router;
