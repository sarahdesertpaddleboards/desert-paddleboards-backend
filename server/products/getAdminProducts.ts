import { db } from "../db";
import { productOverrides } from "../db/schema";
import { mergeProductsWithOverrides } from "./mergeProducts";

export async function getAdminProducts() {
  const overrides = await db
    .select({
      productKey: productOverrides.productKey,
      active: productOverrides.active,
      price: productOverrides.price,
    })
    .from(productOverrides);

  return mergeProductsWithOverrides(overrides);
}
