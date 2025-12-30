import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import { orders, purchases } from "./db/schema";
import { eq } from "drizzle-orm";

/**
 * Stripe client
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * Stripe Webhook Handler
 * Called ONLY by Stripe
 * Uses express.raw() upstream
 */
export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event: Stripe.Event;

  /**
   * 1. Verify authenticity
   */
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("❌ Invalid Stripe signature", err);
    return res.status(400).send("Invalid signature");
  }

  /**
   * 2. Idempotency guard
   */
  const existing = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeEventId, event.id))
    .limit(1);

  if (existing.length > 0) {
    console.log("🔁 Duplicate webhook ignored:", event.id);
    return res.json({ received: true });
  }

  /**
   * 3. Handle successful checkout
   */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const productKey = session.metadata?.productKey;
    if (!productKey) {
      console.error("❌ Missing productKey");
      return res.status(400).end();
    }

    /**
     * 4. Record the order (money received)
     */
    await db.insert(orders).values({
      id: session.id,
      productKey,
      amount: session.amount_total!,
      currency: session.currency!,
      status: "fulfilled", // 👈 IMPORTANT
      customerEmail: session.customer_details?.email ?? null,
      stripeEventId: event.id,
      raw: session,
      fulfilledAt: new Date(),
    });
    
    // ✅ Create purchase for digital / downloadable products
await db.insert(purchases).values({
  stripeSessionId: session.id,
  productKey,
  amount: session.amount_total!,
  currency: session.currency!,
  customerEmail: session.customer_details?.email ?? null,
});
    /**
     * 5. Create a purchase record
     * This represents entitlement to delivery
     */
    await db.insert(purchases).values({
      stripeSessionId: session.id,
      productKey,
      amount: session.amount_total!,
      currency: session.currency!,
      customerEmail: session.customer_details?.email ?? null,
    });
    /**
     * 6. Mark order fulfilled
     * (Delivery UX will pick up from purchases)
     */
    await db
      .update(orders)
      .set({
        status: "fulfilled",
        fulfilledAt: new Date(),
      })
      .where(eq(orders.id, session.id));

    console.log("✅ Order fulfilled:", session.id);
  }

  /**
   * 7. Always acknowledge
   */
  res.json({ received: true });
}
