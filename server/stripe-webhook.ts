import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import { orders } from "./db/schema";
import { purchases } from "./db/schema";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];

  if (!sig) {
    return res.status(400).send("Missing Stripe signature");
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch (err) {
    console.error("Webhook signature verification failed", err);
    return res.status(400).send("Invalid signature");
  }

  const existing = await db
  .select()
  .from(orders)
  .where(eq(orders.stripeEventId, event.id))
  .limit(1);

if (existing.length > 0) {
  console.log("🔁 Duplicate webhook ignored:", event.id);
  return res.json({ received: true });
}


if (event.type === "checkout.session.completed") {
  const session = event.data.object as Stripe.Checkout.Session;

  if (!session.metadata?.productKey) {
    console.error("❌ Missing productKey in metadata");
    return res.status(400).end();
  }

  await db.insert(orders).values({
    id: session.id,
    productKey: session.metadata.productKey,
    amount: session.amount_total!,
    currency: session.currency!,
    status: "paid",
    customerEmail: session.customer_details?.email ?? null,
    stripeEventId: event.id,
    raw: session,
  });

  console.log("✅ Order recorded:", session.id);
}
  console.log("🔔 STRIPE EVENT:", event.type);

  res.json({ received: true });
}
