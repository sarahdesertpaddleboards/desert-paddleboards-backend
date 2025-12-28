import { Router } from "express";
import { PRODUCTS, ProductKey } from "../products";
import { db } from "../db";
import { productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const adminProductsRouter = Router();

/**
 * GET /admin/products
 * Return canonical products merged with ACTIVE overrides
 */
adminProductsRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const overrides = await db
      .select()
      .from(productOverrides)
      .where(eq(productOverrides.active, true));

    const overridesByKey = new Map(
      overrides.map(o => [o.productKey, o])
    );

    const products = Object.entries(PRODUCTS).map(
      ([key, base]) => {
        const override = overridesByKey.get(key);

        return {
          key,
          name: override?.name ?? base.name,
          description: override?.description ?? base.description,
          price: override?.price ?? base.price,
          currency: base.currency,
          type: base.type,
          active: override?.active ?? true,
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
 * POST /admin/products/:key
 * Create or update a product override
 */
adminProductsRouter.post("/:key", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const productKey = req.params.key as ProductKey;

    if (!(productKey in PRODUCTS)) {
      return res.status(404).json({ error: "Invalid product key" });
    }

    const { name, description, price, active } = req.body ?? {};

    if (
      name === undefined &&
      description === undefined &&
      price === undefined &&
      active === undefined
    ) {
      return res.status(400).json({ error: "No fields provided" });
    }

    await db
      .insert(productOverrides)
      .values({
        productKey,
        name,
        description,
        price,
        active,
      })
      .onDuplicateKeyUpdate({
        set: {
          name,
          description,
          price,
          active,
        },
      });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN PRODUCT UPDATE ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
