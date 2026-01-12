import { db } from "../db";
import { classProducts, productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";

export type PublicProduct = {
  productKey: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: "class" | "digital" | "merch" | "gift";
  active: boolean;
  imageUrl?: string | null;
};

/**
 * Loads products from class_products and merges optional overrides.
 *
 * class_products is now the master table for ALL product types:
 *   - classes
 *   - digital downloads
 *   - merch
 *   - gift certificates
 *
 * product_overrides allows admin adjustments:
 *   - active override
 *   - price override
 *   - type override (optional)
 */
export async function loadPublicProducts(): Promise<PublicProduct[]> {
  // Load products from master table
  const baseProducts = await db.select().from(classProducts);

  // Load overrides
  const overrides = await db.select().from(productOverrides);

  const overrideMap = new Map(
    overrides.map((o) => [o.productKey, o])
  );

  const merged: PublicProduct[] = baseProducts.map((p) => {
    const o = overrideMap.get(p.productKey);

    const active = o?.active !== undefined ? o.active : p.active;

    const price =
      o?.price !== undefined && o?.price !== null
        ? o.price
        : p.price;

    const type =
      (o?.type as PublicProduct["type"]) ||
      (p.productType as PublicProduct["type"]) ||
      "class";

    return {
      productKey: p.productKey,
      name: p.name,
      description: p.description ?? "",
      price,
      currency: p.currency,
      type,
      active,
      imageUrl: p.imageUrl,
    };
  });

  return merged.filter((p) => p.active);
}
