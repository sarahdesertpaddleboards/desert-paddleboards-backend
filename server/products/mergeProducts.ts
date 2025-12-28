import { PRODUCTS, ProductKey } from "../products";

export type PublicProduct = {
  key: ProductKey;
  name: string;
  description: string;
  price: number;
  currency: string;
  type: string;
  active: boolean;
};

export function mergeProducts(
  overrides: Array<{
    productKey: string;
    active: boolean;
    price: number | null;
  }>
): PublicProduct[] {
  const overrideMap = new Map(
    overrides.map((o) => [o.productKey, o])
  );

  return (Object.entries(PRODUCTS) as [ProductKey, any][])
    .map(([key, base]) => {
      const override = overrideMap.get(key);

      const active =
      override && override.active !== undefined && override.active !== null
        ? override.active
        : true;
    
    if (!active) return null;

      return {
        key,
        name: base.name,
        description: base.description,
        currency: base.currency,
        type: base.type,
        price: override?.price ?? base.price,
        active: true,
      };
    })
    .filter(Boolean) as PublicProduct[];
}
