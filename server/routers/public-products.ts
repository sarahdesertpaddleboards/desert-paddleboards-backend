// server/routers/public-products.ts

import { Router } from "express";
import { db } from "../db";
import { products } from "../db/schema";

const router = Router();

// GET /products/public  -> list all public products
router.get("/", async (req, res) => {
  try {
    const rows = await db.select().from(products);
    res.json(rows);
  } catch (err) {
    console.error("PUBLIC PRODUCTS ERROR", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});

// GET /products/public/:id  -> single product
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const rows = await db
      .select()
      .from(products)
      .where(products.id.eq(id));

    if (!rows.length) {
      return res.status(404).json({ error: "Not found" });
    }

    res.json(rows[0]);
  } catch (err) {
    console.error("PUBLIC PRODUCT ERROR", err);
    res.status(500).json({ error: "Failed to load product" });
  }
});

export default router;
