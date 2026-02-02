// server/routers/store.public.ts
import { Router } from "express";
import { db } from "../db";
import { products, productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /store/products
 * Returns active products.
 * Applies optional overrides (override_name / override_price) if present.
 */
router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: products.id,
        productKey: products.productKey,
        type: products.type,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        imageUrl: products.imageUrl,
        active: products.active,

        // Optional overrides
        overrideName: productOverrides.overrideName,
        overridePrice: productOverrides.overridePrice,
      })
      .from(products)
      .leftJoin(productOverrides, eq(productOverrides.productId, products.id));

    // Apply overrides into the returned "name" and "price"
    const items = rows
      .filter((r) => r.active !== false) // active can be null/true/false depending on driver; treat false as inactive
      .map((r) => ({
        id: r.id,
        productKey: r.productKey,
        type: r.type,
        name: r.overrideName ?? r.name,
        description: r.description,
        price: r.overridePrice ?? r.price,
        currency: r.currency ?? "usd",
        imageUrl: r.imageUrl,
        active: r.active ?? true,
      }));

    return res.json(items);
  } catch (err) {
    console.error("STORE PUBLIC LIST ERROR", err);
    return res.status(500).json({ error: "Failed to load store products" });
  }
});

/**
 * GET /store/products/:key
 * Fetch a single product by productKey, with overrides applied.
 */
router.get("/:key", async (req, res) => {
  try {
    const key = req.params.key;

    const rows = await db
      .select({
        id: products.id,
        productKey: products.productKey,
        type: products.type,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        imageUrl: products.imageUrl,
        active: products.active,

        overrideName: productOverrides.overrideName,
        overridePrice: productOverrides.overridePrice,
      })
      .from(products)
      .leftJoin(productOverrides, eq(productOverrides.productId, products.id))
      .where(eq(products.productKey, key))
      .limit(1);

    const r = rows[0];

    if (!r || r.active === false) {
      return res.status(404).json({ error: "Not found" });
    }

    return res.json({
      id: r.id,
      productKey: r.productKey,
      type: r.type,
      name: r.overrideName ?? r.name,
      description: r.description,
      price: r.overridePrice ?? r.price,
      currency: r.currency ?? "usd",
      imageUrl: r.imageUrl,
      active: r.active ?? true,
    });
  } catch (err) {
    console.error("STORE PUBLIC GET ERROR", err);
    return res.status(500).json({ error: "Failed to load item" });
  }
});

export default router;
