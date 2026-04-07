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
  products,
} from "./db/schema";
import { eq } from "drizzle-orm";
import { sendOrderConfirmationEmail } from "./_core/email";
import crypto from "crypto";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

function generateGiftCode() {
  return `BWE-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

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
    console.error("Invalid Stripe signature", err);
    return res.status(400).send("Invalid signature");
  }

  // Only handle completed checkout sessions
  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const productKey = metadata.productKey;
  const productType = metadata.type;

  if (!productKey) {
    console.error("Missing productKey in metadata");
    return res.status(400).json({ error: "Missing productKey" });
  }

  // Insert purchase record
  await db.insert(purchases).values({
    stripeSessionId: session.id,
    productKey,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    customerEmail: session.customer_details?.email ?? null,
  });

  // DIGITAL DOWNLOAD
  if (productType === "digital") {
    const token = crypto.randomBytes(24).toString("hex");

    await db.insert(downloads).values({
      orderId: session.id,
      productKey,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    console.log("Digital token created:", token);
  }

  // GIFT CERTIFICATE
  if (productType === "gift") {
    let code = generateGiftCode();
    for (let attempt = 0; attempt < 5; attempt++) {
      const existing = await db
        .select({ id: giftCertificates.id })
        .from(giftCertificates)
        .where(eq(giftCertificates.generatedCode, code))
        .limit(1);
      if (!existing[0]) break;
      code = generateGiftCode();
    }

    const amount = session.amount_total ?? 0;

    await db.insert(giftCertificates).values({
      purchaseId,
      productKey,
      generatedCode: code,
      originalAmount: amount,
      remainingAmount: amount,
      currency: session.currency ?? "usd",
      purchaserEmail: session.customer_details?.email ?? null,
      stripeSessionId: session.id,
      status: "active",
      redeemed: false,
      updatedAt: new Date(),
    });

    console.log("Gift certificate issued:", code);
  }

  console.log("Order fulfilled:", session.id);

  return res.json({ received: true });
}

