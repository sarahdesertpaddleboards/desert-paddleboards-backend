import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { purchases, downloads, classSessions, classProducts, venues } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

/**
 * GET /checkout/success/:sessionId
 *
 * Returns purchase + download token (if digital) + booking session details (if present)
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

    let bookedSession: any = null;

    try {
      const stripeSession = await stripe.checkout.sessions.retrieve(sessionId);
      const bookedSessionId = Number(stripeSession.metadata?.sessionId || "");

      if (Number.isFinite(bookedSessionId)) {
        bookedSession = await db
          .select({
            id: classSessions.id,
            classProductId: classSessions.classProductId,
            startTime: classSessions.startTime,
            endTime: classSessions.endTime,
            seatsTotal: classSessions.seatsTotal,
            seatsAvailable: classSessions.seatsAvailable,
            venueId: classSessions.venueId,
            venueName: venues.name,
            venueCity: venues.city,
            venueState: venues.state,
            venueSlug: venues.slug,
            venueTimezone: venues.timezone,
            className: classProducts.name,
            productKey: classProducts.productKey,
          })
          .from(classSessions)
          .leftJoin(venues, eq(classSessions.venueId, venues.id))
          .leftJoin(classProducts, eq(classSessions.classProductId, classProducts.id))
          .where(eq(classSessions.id, bookedSessionId))
          .limit(1)
          .then((r) => r[0] || null);
      }
    } catch (err) {
      console.error("Checkout success session lookup failed:", err);
    }

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
      sessionId: bookedSession?.id ? String(bookedSession.id) : null,
      bookedSession,
    });
  } catch (err) {
    console.error("Checkout success error:", err);
    return res.status(500).json({ error: "Server error" });
  }
});

export default router;
