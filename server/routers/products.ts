import { Router } from "express";
import { db } from "../db";
import { productOverrides, classProducts } from "../db/schema";
import { mergeProducts } from "../products/mergeProducts";

export const productsRouter = Router();

/**
 * GET /products
 * Returns ALL public products:
 * - normal products (digital / physical)
 * - class products (from classProducts table)
 */
productsRouter.get("/", async (_req, res) => {
  try {
    // load normal product override data
    const overrides = await db.select().from(productOverrides);
    const mergedNormal = mergeProducts(overrides);

    // load class products
    const classRows = await db.select().from(classProducts);

    const mergedClasses = classRows.map(row => ({
      productKey: row.slug,               // 👈 CRITICAL FIX
      name: row.name,
      description: row.description,
      price: row.defaultPrice,
      type: row.type,                     // "class"
      active: row.active,                 // boolean
      isClass: true,
    }));

    // combine normal + class products
    const combined = [
      ...mergedNormal.filter(p => p.active !== false),
      ...mergedClasses.filter(c => c.active !== false),
    ];

    return res.json(combined);
  } catch (err) {
    console.error("PUBLIC PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
});
