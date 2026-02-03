import { Router } from "express";
import { db } from "../db";
import { orders, downloads } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

// GET /checkout/success/:sessionId
router.get("/success/:sessionId", async (req, res) => {
  try {
    const sessionId = req.params.sessionId;

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order) return res.status(404).json({ error: "Order not found" });

    // Determine delivery type.
    // Preferred: use Stripe metadata stored in orders.raw
    let type: "digital" | "gift" | "merch" | "booking" | "unknown" = "unknown";
    try {
      const raw = JSON.parse(order.raw);
      type = (raw?.metadata?.type as any) || "unknown";
    } catch {}

    const deliveries: Array<{ purchaseId: number; productKey: string; type: any }> = [];

    if (type === "digital") {
      // Find latest token for this order_id
      const dl = await db
        .select()
        .from(downloads)
        .where(eq(downloads.orderId, sessionId))
        .limit(1)
        .then(r => r[0]);

      // purchaseId here is used by frontend only as an identifier.
      // We'll send downloads.id if present, else 0.
      deliveries.push({
        purchaseId: dl?.id ?? 0,
        productKey: order.productKey,
        type: "digital",
      });
    } else if (type === "gift") {
      deliveries.push({ purchaseId: 0, productKey: order.productKey, type: "gift" });
    } else if (type === "merch") {
      deliveries.push({ purchaseId: 0, productKey: order.productKey, type: "merch" });
    } else if (type === "booking") {
      deliveries.push({ purchaseId: 0, productKey: order.productKey, type: "booking" });
    }

    return res.json({
      sessionId: order.id,
      status: order.status,
      customerEmail: order.customerEmail ?? null,
      deliveries,
    });
  } catch (err) {
    console.error("CHECKOUT SUCCESS ERROR", err);
    return res.status(500).json({ error: "Failed to load order" });
  }
});

export default router;
