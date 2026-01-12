import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import {
  orders,
  purchases,
  downloads,
  giftCertificates,
  shippingAddresses,
  productOverrides,
} from "./db/schema";
import { eq } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "./_core/email";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export async function handleStripeWebhook(req: Request, res: Response) {
  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).send("Missing Stripe signature");

  let event: Stripe.Event;

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

  // 1. GLOBAL IDEMPOTENCY
  const existingEvent = await db
    .select()
    .from(orders)
    .where(eq(orders.stripeEventId, event.id))
    .limit(1)
    .then((r) => r[0]);

  if (existingEvent) {
    console.log("🔁 Duplicate webhook ignored:", event.id);
    return res.json({ received: true });
  }

  // 2. HANDLE CHECKOUT SUCCESS
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata || {};
    const productKey = metadata.productKey;
    const productType = metadata.type; // digital | class | merch | gift

    if (!productKey) {
      console.error("❌ Missing productKey on session");
      return res.status(400).end();
    }

    // [A] CREATE ORDER RECORD
    await db.insert(orders).values({
      id: session.id,
      productKey,
      amount: session.amount_total!,
      currency: session.currency!,
      status: "fulfilled",
      customerEmail: session.customer_details?.email ?? null,
      stripeEventId: event.id,
      raw: session,
      fulfilledAt: new Date(),
    });

    // [B] PURCHASE RECORD (idempotent)
    const existingPurchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, session.id))
      .limit(1)
      .then((r) => r[0]);

    let purchaseRecord;

    if (!existingPurchase) {
      const inserted = await db.insert(purchases).values({
        stripeSessionId: session.id,
        productKey,
        amount: session.amount_total!,
        currency: session.currency!,
        customerEmail: session.customer_details?.email ?? null,
      });
      purchaseRecord = inserted[0];
    } else {
      purchaseRecord = existingPurchase;
    }

    // ---------------------------------------------------------
    // 3. FULFILLMENT LOGIC BASED ON PRODUCT TYPE
    // ---------------------------------------------------------

    // DIGITAL PRODUCT → issue secure download token
    if (productType === "digital") {
      const token = crypto.randomBytes(24).toString("hex");

      await db.insert(downloads).values({
        orderId: session.id,
        productKey,
        token,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7), // 7 days
      });

      console.log("💾 Digital download token created:", token);
    }

    // GIFT CERTIFICATE → store details + generate code
    if (productType === "gift") {
      const code = crypto.randomBytes(6).toString("hex").toUpperCase();

      await db.insert(giftCertificates).values({
        purchaseId: purchaseRecord.id,
        productId: productKey, // productKey is string; adjust schema if needed
        recipientName: metadata.recipientName || null,
        recipientEmail: metadata.recipientEmail || null,
        message: metadata.message || null,
        generatedCode: code,
      });

      console.log("🎁 Gift certificate created with code:", code);
    }

    // MERCH → store shipping address
    if (productType === "merch") {
      await db.insert(shippingAddresses).values({
        purchaseId: purchaseRecord.id,
        productId: productKey,
        fullName: metadata.shipping_fullName ?? "",
        addressLine1: metadata.shipping_address1 ?? "",
        addressLine2: metadata.shipping_address2 ?? "",
        city: metadata.shipping_city ?? "",
        state: metadata.shipping_state ?? "",
        postalCode: metadata.shipping_postal ?? "",
        country: metadata.shipping_country ?? "",
      });

      console.log("📦 Shipping address stored for merch order");
    }

    // ---------------------------------------------------------
    // 4. EMAIL CONFIRMATION (NON-BLOCKING)
    // ---------------------------------------------------------
    try {
      const relatedPurchases = await db
        .select()
        .from(purchases)
        .where(eq(purchases.stripeSessionId, session.id));

      await sendOrderConfirmationEmail({
        order: {
          id: session.id,
          customerEmail: session.customer_details?.email ?? null,
        },
        purchases: relatedPurchases,
      });
    } catch (err) {
      console.error("📧 Email send error (ignored):", err);
    }

    console.log("✅ Order fulfilled:", session.id);
  }

  // 5. ALWAYS ACKNOWLEDGE
  return res.json({ received: true });
}
