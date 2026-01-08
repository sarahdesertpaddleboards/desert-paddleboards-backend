import { Router } from "express";
import { PRODUCTS, ProductKey } from "../products";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const adminProductsRouter = Router();

/**
 * GET /admin/products (Admin Only)
 */
adminProductsRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const overrides = await db.select().from(productOverrides);
    const overridesByKey = new Map(overrides.map(o => [o.productKey, o]));

    const products = Object.entries(PRODUCTS).map(([key, base]) => {
      const override = overridesByKey.get(key);
      return {
        productKey: key,
        name: base.name,
        description: base.description,
        currency: base.currency,
        active: override?.active ?? true,
        price: override?.price ?? base.price,
        type: override?.type ?? base.type ?? null,
        hasOverride: Boolean(override),
      };
    });

    return res.json(products);
  } catch (err) {
    console.error("ADMIN PRODUCTS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/products/:productKey (Admin Only)
 */
adminProductsRouter.post("/:productKey", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const productKey = req.params.productKey as ProductKey;
    const { active, price, type } = req.body ?? {};

    if (!(productKey in PRODUCTS)) {
      return res.status(404).json({ error: "Invalid product key" });
    }

    await db
      .insert(productOverrides)
      .values({ productKey, active, price, type })
      .onDuplicateKeyUpdate({ set: { active, price, type } });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN PRODUCT UPDATE ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
