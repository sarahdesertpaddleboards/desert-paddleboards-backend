import { Router } from "express";
import { sdk } from "../_core/sdk";
import { db } from "../db";
import { purchases, products } from "../db/schema";
import { eq } from "drizzle-orm";

export const adminOrdersRouter = Router();

/**
 * GET /admin/orders
 * Returns full list of customer purchases
 */
adminOrdersRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const result = await db
      .select({
        id: purchases.id,
        email: purchases.customerEmail,
        productKey: purchases.productKey,
        amount: purchases.amount,
        currency: purchases.currency,
        stripeSessionId: purchases.stripeSessionId,
        createdAt: purchases.createdAt,
      })
      .from(purchases);

    res.json(result);
  } catch (err) {
    console.error("ADMIN ORDERS ERROR:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/orders/:id/resend
 * Re-sends the download email via the worker
 */
adminOrdersRouter.post("/:id/resend", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const id = Number(req.params.id);

    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, id))
      .limit(1)
      .then(r => r[0]);

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    // Tell worker to resend
    const secret = process.env.DOWNLOAD_WORKER_SECRET;
    if (!secret) {
      throw new Error("Missing DOWNLOAD_WORKER_SECRET");
    }

    await fetch(`${process.env.WORKER_URL}/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": secret,
      },
      body: JSON.stringify({ purchaseId: purchase.id }),
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN RESEND ERROR", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});
