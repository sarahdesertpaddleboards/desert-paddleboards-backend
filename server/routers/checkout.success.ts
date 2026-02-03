// server/routers/checkout.success.ts
import { Router } from "express";
import { db } from "../db";
import { orders, purchases } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

type DeliveryType = "digital" | "gift" | "booking" | "merch";

router.get("/success/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    // 1) Find the order by Stripe session id (orders.id is varchar PK)
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then((r) => r[0]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 2) Extract metadata from stored Stripe session object
    const raw: any = order.raw ?? {};
    const metadata: any = raw.metadata ?? {};

    const productKey: string = metadata.productKey || order.productKey || "unknown";
    const typeFromMeta: string = metadata.type || "digital";

    // Normalize "class_session" into frontend's "booking"
    const deliveryType: DeliveryType =
      typeFromMeta === "class_session" || typeFromMeta === "class"
        ? "booking"
        : (typeFromMeta as DeliveryType);

    // 3) Purchases row (needed for download link /downloads/:purchaseId)
    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId))
      .limit(1)
      .then((r) => r[0]);

    const purchaseId = purchase?.id ?? 0;

    return res.json({
      sessionId,
      status: order.status === "fulfilled" ? "fulfilled" : "paid",
      customerEmail: order.customerEmail ?? null,
      deliveries: [
        {
          purchaseId,
          productKey,
          type: deliveryType,
        },
      ],
    });
  } catch (err) {
    console.error("CHECKOUT SUCCESS ERROR", err);
    return res.status(500).json({ error: "Failed to load order" });
  }
});

export default router;
