import { Router } from "express";
import { db } from "../db";
import { classProducts } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const classProductsRouter = Router();

/**
 * GET /admin/class-products
 * List all class products
 */
classProductsRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const rows = await db.select().from(classProducts);
    return res.json(rows);
  } catch (err) {
    console.error("CLASS PRODUCTS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/class-products
 * Create a new class product
 */
classProductsRouter.post("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const { productKey, name, description, price, currency, capacity, imageUrl } =
      req.body ?? {};

    if (!productKey || !name || !price || !currency) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const insert = await db.insert(classProducts).values({
      productKey,
      name,
      description,
      price,
      currency,
      capacity,
      imageUrl,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("CLASS PRODUCT CREATE ERROR", err);
    return res.status(500).json({ error: "Failed to create class product" });
  }
});

/**
 * PUT /admin/class-products/:id
 * Update an existing class product
 */
classProductsRouter.put("/:id", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const id = Number(req.params.id);
    const { name, description, price, currency, capacity, active, imageUrl } =
      req.body ?? {};

    await db
      .update(classProducts)
      .set({
        name,
        description,
        price,
        currency,
        capacity,
        active,
        imageUrl,
      })
      .where(eq(classProducts.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("CLASS PRODUCT UPDATE ERROR", err);
    return res.status(500).json({ error: "Failed to update class product" });
  }
});
