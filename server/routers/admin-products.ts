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
 * Requires admin session.
 * Returns ALL products (base config + overrides)
 * ============================================================
 */
adminProductsRouter.get("/", async (req, res) => {
  try {
    // 🔐 Require admin session cookie
    await sdk.requireAdmin(req);

    // Load all override rows
    const overrides = await db.select().from(productOverrides);
    const overrideMap = new Map(overrides.map(o => [o.productKey, o]));

    // Merge base PRODUCTS with overrides
    const merged = Object.entries(PRODUCTS).map(([key, base]) => {
      const override = overrideMap.get(key);

      return {
        productKey: key,
        name: base.name,
        description: base.description,
        currency: base.currency,

        // Editable fields
        active: override?.active ?? true,
        price: override?.price ?? base.price,
        type: override?.type ?? base.type ?? null,

        hasOverride: Boolean(override),
      };
    });

    return res.json(merged);
  } catch (err) {
    console.error("ADMIN PRODUCTS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * ============================================================
 * POST /admin/products/:productKey
 *
 * Create/update admin-editable fields:
 * - active (boolean)
 * - price (number)
 * - type (string | null)
 *
 * This uses UPSERT to merge edits safely.
 * ============================================================
 */
adminProductsRouter.post("/:productKey", async (req, res) => {
  try {
    // 🔐 Must be admin
    await sdk.requireAdmin(req);

    const productKey = req.params.productKey as ProductKey;

    if (!(productKey in PRODUCTS)) {
      return res.status(404).json({ error: "Invalid product key" });
    }

    const { active, price, type } = req.body ?? {};

    // Required: At least 1 field
    const hasFields =
      active !== undefined ||
      price !== undefined ||
      type !== undefined;

    if (!hasFields) {
      return res.status(400).json({ error: "No editable fields provided" });
    }

    const values: Record<string, any> = { productKey };

    if (active !== undefined) {
      values.active = Boolean(active);
    }
    if (price !== undefined) {
      const num = Number(price);
      if (Number.isNaN(num) || num <= 0) {
        return res.status(400).json({ error: "Invalid price value" });
      }
      values.price = num;
    }
    if (type !== undefined) {
      values.type = type || null;
    }

    await db
      .insert(productOverrides)
      .values(values)
      .onDuplicateKeyUpdate({
        set: values,
      });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN PRODUCT UPDATE ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
