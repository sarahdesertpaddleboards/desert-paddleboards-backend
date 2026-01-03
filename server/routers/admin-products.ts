import { Router } from "express";
import { PRODUCTS, ProductKey } from "../products";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const adminProductsRouter = Router();

/**
 * ============================================================
 * GET /admin/products
 *
 * Admin-only endpoint.
 *
 * Returns ALL products with admin-controllable fields merged:
 * - active
 * - price
 * - type
 *
 * Base product data (name, description, currency) always
 * comes from PRODUCTS and is not editable here.
 * ============================================================
 */
adminProductsRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    // Load ALL overrides (active + inactive)
    const overrides = await db.select().from(productOverrides);

    const overridesByKey = new Map(
      overrides.map(o => [o.productKey, o])
    );

    const products = Object.entries(PRODUCTS).map(
      ([key, base]) => {
        const override = overridesByKey.get(key);

        return {
          productKey: key,
          name: base.name,
          description: base.description,
          currency: base.currency,

          // Admin-controlled fields
          active: override?.active ?? true,
          price: override?.price ?? base.price,
          type: override?.type ?? base.type ?? null,

          hasOverride: Boolean(override),
        };
      }
    );

    return res.json(products);
  } catch (err) {
    console.error("ADMIN PRODUCTS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * ============================================================
 * POST /admin/products/:productKey
 *
 * Create or update a product override.
 *
 * Allowed fields:
 * - active
 * - price
 * - type
 *
 * This uses UPSERT so admins can safely edit repeatedly.
 * ============================================================
 */
adminProductsRouter.post("/:productKey", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const productKey = req.params.productKey as ProductKey;

    if (!(productKey in PRODUCTS)) {
      return res.status(404).json({ error: "Invalid product key" });
    }

    const { active, price, type } = req.body ?? {};

    if (
      active === undefined &&
      price === undefined &&
      type === undefined
    ) {
      return res.status(400).json({ error: "No fields provided" });
    }

    await db
      .insert(productOverrides)
      .values({
        productKey,
        active,
        price,
        type,
      })
      .onDuplicateKeyUpdate({
        set: {
          active,
          price,
          type,
        },
      });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN PRODUCT UPDATE ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
