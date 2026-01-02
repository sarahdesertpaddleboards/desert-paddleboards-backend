import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import { orders, purchases } from "./db/schema";
import { eq } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "./_core/email";

/**
 * Stripe client
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * Stripe Webhook Handler
 * ----------------------
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
   * 1️⃣ Verify webhook signature (security)
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
   * 2️⃣ Global idempotency guard
   * We NEVER process the same Stripe event twice
   */
  const existingEvent = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeEventId, event.id))
    .limit(1)
    .then(r => r[0]);

  if (existingEvent) {
    console.log("🔁 Duplicate webhook ignored:", event.id);
    return res.json({ received: true });
  }

  /**
   * 3️⃣ Handle successful checkout
   */
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;

    const productKey = session.metadata?.productKey;
    if (!productKey) {
      console.error("❌ Missing productKey on session");
      return res.status(400).end();
    }

    /**
     * 4️⃣ Create ORDER record
     * Represents money received + Stripe confirmation
     */
    await db.insert(orders).values({
      id: session.id, // Stripe session ID
      productKey,
      amount: session.amount_total!,
      currency: session.currency!,
      status: "fulfilled",
      customerEmail: session.customer_details?.email ?? null,
      stripeEventId: event.id,
      raw: session,
      fulfilledAt: new Date(),
    });

    /**
     * 5️⃣ Create PURCHASE record (IDEMPOTENT)
     * Represents entitlement to delivery
     * Stripe may retry the webhook, so we must check first
     */
    const existingPurchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, session.id))
      .limit(1)
      .then(r => r[0]);

    if (!existingPurchase) {
      await db.insert(purchases).values({
        stripeSessionId: session.id,
        productKey,
        amount: session.amount_total!,
        currency: session.currency!,
        customerEmail: session.customer_details?.email ?? null,
      });
    }

    /**
     * 6️⃣ Send confirmation email (NON-BLOCKING)
     * Email failure must NEVER break webhook success
     */
    try {
      const orderPurchases = await db
        .select()
        .from(purchases)
        .where(eq(purchases.stripeSessionId, session.id));

      await sendOrderConfirmationEmail({
        order: {
          id: session.id,
          customerEmail: session.customer_details?.email ?? null,
        },
        purchases: orderPurchases,
      });
    } catch (err) {
      console.error("📧 EMAIL ERROR (non-blocking)", err);
    }

    console.log("✅ Order fulfilled:", session.id);
  }

  /**
   * 7️⃣ Always acknowledge webhook
   * Stripe only cares about a 200 OK
   */
  return res.json({ received: true });
}
