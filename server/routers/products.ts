import { Router } from "express";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { mergeProducts } from "../products/mergeProducts";

export const productsRouter = Router();

/**
 * GET /products
 * Public products endpoint
 */
productsRouter.get("/", async (_req, res) => {
  try {
    const overrides = await db.select().from(productOverrides);
    const merged = mergeProducts(overrides);

    return res.json(merged.filter(p => p.active !== false));
  } catch (err) {
    console.error("PUBLIC PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
});
