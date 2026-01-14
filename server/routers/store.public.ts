import { Router } from "express";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /store/products
router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(productOverrides);
    res.json(items);
  } catch (err) {
    console.error("STORE PUBLIC LIST ERROR", err);
    res.status(500).json({ error: "Failed to load store products" });
  }
});

// GET /store/products/:key
router.get("/:key", async (req, res) => {
  try {
    const key = req.params.key;

    const item = await db
      .select()
      .from(productOverrides)
      .where(eq(productOverrides.productKey, key))
      .then(r => r[0]);

    if (!item) return res.status(404).json({ error: "Not found" });

    res.json(item);
  } catch (err) {
    console.error("STORE PUBLIC GET ERROR", err);
    res.status(500).json({ error: "Failed to load item" });
  }
});

export default router;
