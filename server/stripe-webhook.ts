import Stripe from "stripe";
import { Request, Response } from "express";
import { db } from "./db";
import {
  purchases,
  downloads,
  giftCertificates,
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

  if (event.type !== "checkout.session.completed") {
    return res.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const metadata = session.metadata || {};
  const productKey = metadata.productKey;
  const productType = metadata.type;
  const redeemedGiftCode = metadata.giftCode?.trim() || "";
  const redeemedGiftAmountApplied = Number(metadata.giftAmountApplied || 0);
  const customerEmail = session.customer_details?.email ?? null;

  if (!productKey) {
    console.error("Missing productKey in metadata");
    return res.status(400).json({ error: "Missing productKey" });
  }

  const insertedPurchase = await db.insert(purchases).values({
    stripeSessionId: session.id,
    productKey,
    amount: session.amount_total ?? 0,
    currency: session.currency ?? "usd",
    customerEmail,
  });

  const purchaseId = Number((insertedPurchase as any)?.[0]?.insertId || (insertedPurchase as any)?.insertId || 0);

  let downloadToken: string | null = null;
  let issuedGiftCode: string | null = null;
  let issuedGiftAmount: number | null = null;
  let issuedGiftCurrency: string | null = null;

  if (productType === "digital") {
    const token = crypto.randomBytes(24).toString("hex");

    await db.insert(downloads).values({
      orderId: session.id,
      productKey,
      token,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    downloadToken = token;
    console.log("Digital token created:", token);
  }

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
    const currency = session.currency ?? "usd";

    await db.insert(giftCertificates).values({
      purchaseId,
      productKey,
      generatedCode: code,
      originalAmount: amount,
      remainingAmount: amount,
      currency,
      purchaserEmail: customerEmail,
      stripeSessionId: session.id,
      status: "active",
      redeemed: false,
      updatedAt: new Date(),
    });

    issuedGiftCode = code;
    issuedGiftAmount = amount;
    issuedGiftCurrency = currency;
    console.log("Gift certificate issued:", code);
  }

  if (redeemedGiftCode && redeemedGiftAmountApplied > 0) {
    const existingGift = await db
      .select()
      .from(giftCertificates)
      .where(eq(giftCertificates.generatedCode, redeemedGiftCode))
      .limit(1)
      .then((r) => r[0] || null);

    if (existingGift) {
      const currentRemaining = Number(existingGift.remainingAmount ?? 0);
      const nextRemaining = Math.max(0, currentRemaining - redeemedGiftAmountApplied);
      await db
        .update(giftCertificates)
        .set({
          remainingAmount: nextRemaining,
          redeemed: nextRemaining <= 0,
          status: nextRemaining <= 0 ? "redeemed" : "active",
          updatedAt: new Date(),
        })
        .where(eq(giftCertificates.id, existingGift.id));

      console.log("Gift certificate redeemed:", redeemedGiftCode, redeemedGiftAmountApplied);
    } else {
      console.warn("Gift certificate not found for redemption:", redeemedGiftCode);
    }
  }

  if (customerEmail) {
    try {
      await sendOrderConfirmationEmail({
        to: customerEmail,
        productKey,
        downloadToken,
        giftCertificate: issuedGiftCode
          ? {
              code: issuedGiftCode,
              amount: issuedGiftAmount,
              currency: issuedGiftCurrency,
            }
          : null,
      });
    } catch (err) {
      console.error("Failed to send confirmation email", err);
    }
  }

  console.log("Order fulfilled:", session.id);

  return res.json({ received: true });
}
