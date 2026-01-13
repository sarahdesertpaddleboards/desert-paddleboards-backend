// server/routers/checkout.ts
// Unified checkout for all product types + class session support

import { Router } from "express";
import { db } from "../db";
import { products, classSessions } from "../db/schema";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

export const checkoutRouter = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

checkoutRouter.post("/", async (req, res) => {
  try {
    const { productKey, sessionId } = req.body;

    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }

    const product = await db
      .select()
      .from(products)
      .where(eq(products.productKey, productKey))
      .limit(1)
      .then((r) => r[0]);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    // CLASS SESSION VALIDATION
    let session = null;

    if (sessionId) {
      session = await db
        .select()
        .from(classSessions)
        .where(eq(classSessions.id, sessionId))
        .limit(1)
        .then((r) => r[0]);

      if (!session) {
        return res.status(400).json({ error: "Session not found" });
      }

      if (session.seatsAvailable < 1) {
        return res.status(400).json({ error: "This session is sold out" });
      }
    }

    // STRIPE SESSION CREATION
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: product.price,
            product_data: {
              name: product.name,
            },
          },
          quantity: 1,
        },
      ],
      metadata: {
        productId: product.id,
        sessionId: session?.id || "",
        productKey,
      },
    });

    return res.json({ url: stripeSession.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});
