//-----------------------------------------------------------
// server/routers/checkout.ts (FULLY REWRITTEN)
//-----------------------------------------------------------

import { Router } from "express";
import Stripe from "stripe";

import { db } from "../db";

// Import tables from your Drizzle schema
import {
  purchases,
  shippingAddresses,
  giftCertificates,
  classSessions,
} from "../db/schema";

// Unified product loader (classProducts + overrides)
import { loadPublicProducts } from "../products/mergeProducts";

// Drizzle operator
import { eq } from "drizzle-orm";

// Crypto for gift certificate code
import crypto from "crypto";

export const checkoutRouter = Router();

// Initialise Stripe client
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

//-----------------------------------------------------------
// POST /checkout
//-----------------------------------------------------------
// Handles:
// • digital products
// • class sessions
// • physical merch (shipping required)
// • gift certificates (recipient required)
//
// Body example:
// {
//   "productKey": "BLACK_CANYON_GUIDE",
//   "email": "customer@example.com",
//   "quantity": 1,
//   "sessionId": 12,                     // only for classes
//   "shipping": { ... },                 // only for merch
//   "recipient": { ... }                 // only for gift certs
// }
//-----------------------------------------------------------

checkoutRouter.post("/", async (req, res) => {
  try {
    //-------------------------------------------------------
    // Extract request body
    //-------------------------------------------------------
    const {
      productKey,     // required for all product types
      email,          // required
      quantity = 1,   // default quantity
      sessionId,      // class-only
      shipping,       // merch-only
      recipient,      // gift certificate only
    } = req.body;

    //-------------------------------------------------------
    // Basic validation
    //-------------------------------------------------------
    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }
    if (!email) {
      return res.status(400).json({ error: "Missing customer email" });
    }

    //-------------------------------------------------------
    // Load all public products (classProducts + overrides)
    //-------------------------------------------------------
    const products = await loadPublicProducts();

    // Find the requested product
    // IMPORTANT: unified products use product.productKey (NOT product.key)
    const product = products.find((p) => p.productKey === productKey);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    //-------------------------------------------------------
    // Stripe checkout session creation helper
    //-------------------------------------------------------
    async function createStripeSession() {
      return stripe.checkout.sessions.create({
        mode: "payment",
        customer_email: email,
        line_items: [
          {
            price_data: {
              currency: product.currency,
              unit_amount: product.price,
              product_data: { name: product.name },
            },
            quantity,
          },
        ],
        success_url:
          `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      });
    }

    //-------------------------------------------------------
    // Switch based on product.type ("digital", "class", "merch", "gift")
    //-------------------------------------------------------
    switch (product.type) {

      // ----------------------------------------------------
      // DIGITAL PRODUCTS
      // ----------------------------------------------------
      case "digital": {
        const session = await createStripeSession();

        // Insert purchase record immediately
        await db.insert(purchases).values({
          stripeSessionId: session.id,
          productKey: product.productKey,
          amount: product.price * quantity,
          currency: product.currency,
          customerEmail: email,
        });

        return res.json({ url: session.url });
      }

      // ----------------------------------------------------
      // CLASS BOOKINGS
      // ----------------------------------------------------
      case "class": {
        // Class bookings require a sessionId
        if (!sessionId) {
          return res.status(400).json({ error: "Missing class sessionId" });
        }

        // Load class session safely
        const sessionRow = await db
          .select()
          .from(classSessions)
          .where(eq(classSessions.id, sessionId))
          .then((r) => r[0]);

        if (!sessionRow) {
          return res.status(404).json({ error: "Class session not found" });
        }

        if (sessionRow.seatsAvailable < quantity) {
          return res.status(400).json({ error: "Not enough seats available" });
        }

        const stripeSession = await createStripeSession();

        // Save purchase
        await db.insert(purchases).values({
          stripeSessionId: stripeSession.id,
          productKey: product.productKey,
          amount: product.price * quantity,
          currency: product.currency,
          customerEmail: email,
        });

        return res.json({ url: stripeSession.url });
      }

      // ----------------------------------------------------
      // MERCH (requires shipping info)
      // ----------------------------------------------------
      case "merch": {
        // Validate shipping info
        if (!shipping || !shipping.fullName) {
          return res
            .status(400)
            .json({ error: "Shipping information required" });
        }

        const session = await createStripeSession();

        // Save purchase (shipping details saved on webhook after payment)
        await db.insert(purchases).values({
          stripeSessionId: session.id,
          productKey: product.productKey,
          amount: product.price * quantity,
          currency: product.currency,
          customerEmail: email,
        });

        return res.json({ url: session.url });
      }

      // ----------------------------------------------------
      // GIFT CERTIFICATE
      // ----------------------------------------------------
      case "gift": {
        if (!recipient || !recipient.name) {
          return res
            .status(400)
            .json({ error: "Recipient details required" });
        }

        const session = await createStripeSession();

        // Save purchase
        await db.insert(purchases).values({
          stripeSessionId: session.id,
          productKey: product.productKey,
          amount: product.price * quantity,
          currency: product.currency,
          customerEmail: email,
        });

        return res.json({ url: session.url });
      }

      //-----------------------------------------------------
      // DEFAULT (should never happen)
      //-----------------------------------------------------
      default:
        return res.status(500).json({ error: "Unsupported product type" });
    }

  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
});
