import { Router } from "express";
import { db } from "../db";
import { purchases, downloads } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /checkout/success/:sessionId
 *
 * Returns purchase + download token (if digital)
 */
router.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId))
      .limit(1)
      .then((r) => r[0]);

    if (!purchase) {
      return res.json({
        order: null,
        downloadToken: null,
        pending: true,
      });
    }

    const download = await db
      .select()
      .from(downloads)
      .where(eq(downloads.orderId, sessionId))
      .limit(1)
      .then((r) => r[0]);

    return res.json({
      order: {
        id: purchase.stripeSessionId,
        productKey: purchase.productKey,
        amount: purchase.amount,
        currency: purchase.currency,
        status: "paid",
        customerEmail: purchase.customerEmail,
      },
      downloadToken: download?.token ?? null,
      sessionId: null,
    });
  } catch (err) {
    console.error("Checkout success error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
