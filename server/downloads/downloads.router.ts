import { Router } from "express";
import { db } from "../db";
import { purchases, orders, products, productOverrides } from "../db/schema";
import { and, eq, or } from "drizzle-orm";

const router = Router();

const legacyObjectKeyByProduct: Record<string, string> = {
  SONORAN_ECHOES_DIGITAL: "sonoran-echoes.zip",
  BLACK_CANYON_GUIDE: "black-canyon-guide.pdf",
  LEES_FERRY_GUIDE: "lees-ferry-guide.pdf",
};

async function resolveObjectKey(productKey: string): Promise<string | null> {
  const row = await db
    .select({
      digitalObjectKey: productOverrides.digitalObjectKey,
      productKey: products.productKey,
    })
    .from(products)
    .leftJoin(productOverrides, eq(productOverrides.productId, products.id))
    .where(eq(products.productKey, productKey))
    .limit(1)
    .then((r) => r[0] || null);

  if (row?.digitalObjectKey) {
    return row.digitalObjectKey;
  }

  return legacyObjectKeyByProduct[productKey] || null;
}

router.get("/verify/:purchaseId", async (req, res) => {
  const purchaseId = Number(req.params.purchaseId);
  const token = String(req.query.token || "");

  if (!Number.isFinite(purchaseId) || !token) {
    return res.status(400).json({ error: "Invalid request" });
  }

  const purchase = await db
    .select({
      id: purchases.id,
      stripeSessionId: purchases.stripeSessionId,
      productKey: purchases.productKey,
      customerEmail: purchases.customerEmail,
    })
    .from(purchases)
    .where(eq(purchases.id, purchaseId))
    .limit(1)
    .then((r) => r[0] || null);

  if (!purchase) {
    return res.status(404).json({ error: "Purchase not found" });
  }

  const order = await db
    .select({
      id: orders.id,
      token: orders.token,
      email: orders.email,
      stripeSessionId: orders.stripeSessionId,
    })
    .from(orders)
    .where(
      and(
        eq(orders.token, token),
        or(
          eq(orders.stripeSessionId, purchase.stripeSessionId),
          eq(orders.email, purchase.customerEmail || "")
        )
      )
    )
    .limit(1)
    .then((r) => r[0] || null);

  if (!order) {
    return res.status(403).json({ error: "Unauthorized" });
  }

  const objectKey = await resolveObjectKey(purchase.productKey);
  if (!objectKey) {
    return res.status(404).json({ error: "No download configured for this product" });
  }

  return res.json({ ok: true, objectKey });
});

export default router;
