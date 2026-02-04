import { Router } from "express";
import { db } from "../db";
import { orders, downloads } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

/**
 * GET /checkout/success/:sessionId
 *
 * Returns order + download token (if digital)
 */
router.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    if (!sessionId) {
      return res.status(400).json({ error: "Missing sessionId" });
    }

    // Fetch order
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // If digital product, fetch download token
    const download = await db
      .select()
      .from(downloads)
      .where(eq(downloads.orderId, sessionId))
      .limit(1)
      .then(r => r[0]);

    return res.json({
      order,
      downloadToken: download?.token ?? null,
    });

  } catch (err) {
    console.error("Checkout success error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
