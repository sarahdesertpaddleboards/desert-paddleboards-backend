import { db } from "../db";
import { productOverrides, classProducts } from "../db/schema";
import { eq } from "drizzle-orm";

export type PublicProduct = {
  productKey: string;
  name: string;
  description: string | null;
  price: number;
  currency: string;
  type: "class" | "digital" | "physical";
  active: boolean;
  imageUrl?: string | null;
};

export async function loadPublicProducts(): Promise<PublicProduct[]> {
  // Load class products
  const classes = await db.select().from(classProducts);

  // Load overrides (same table used for old system)
  const overrides = await db.select().from(productOverrides);

  const overrideMap = new Map(
    overrides.map((o) => [o.productKey, o])
  );

  const merged = classes.map((p) => {
    const override = overrideMap.get(p.productKey);

    const active =
      override?.active !== undefined ? override.active : p.active;

    const price =
      override?.price !== undefined && override?.price !== null
        ? override.price
        : p.price;

    return {
      productKey: p.productKey,
      name: p.name,
      description: p.description ?? "",
      price,
      currency: p.currency,
      type: "class",
      active,
      imageUrl: p.imageUrl,
    } as PublicProduct;
  });

  // Only return active products
  return merged.filter((p) => p.active);
}
