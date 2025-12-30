import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { orders, purchases, productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { mergeProducts } from "../products/mergeProducts";

/**
 * ============================================================
 * CHECKOUT ROUTER
 * ============================================================
 *
 * Responsibilities:
 *  - Create Stripe Checkout sessions
 *  - Expose checkout success data to frontend
 *
 * This router does NOT:
 *  - Serve HTML
 *  - Handle file downloads
 *  - Perform fulfillment (handled by webhook)
 */

export const checkoutRouter = Router();

/**
 * ------------------------------------------------------------
 * Stripe client
 * ------------------------------------------------------------
 * Uses the same secret key as the webhook
 */
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

/**
 * ------------------------------------------------------------
 * POST /checkout/create
 * ------------------------------------------------------------
 *
 * Called by frontend when user clicks "Buy"
 *
 * Responsibilities:
 *  - Validate productKey
 *  - Create Stripe Checkout Session
 *  - Return redirect URL
 */
checkoutRouter.post("/create", async (req, res) => {
  try {
    const { productKey } = req.body ?? {};

    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }

    /**
     * Load product catalog (base products + DB overrides)
     */
    const overrides = await db.select().from(productOverrides);
    const products = mergeProducts(overrides);

    const product = products.find(p => p.key === productKey);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    /**
     * PUBLIC_SITE_URL determines where Stripe redirects the browser
     *
     * - Railway: set this env var to https://desertpaddleboards.com
     * - Local dev: fallback to http://localhost:3000
     *
     * The backend should NEVER hardcode domains.
     */
    const PUBLIC_SITE_URL =
      process.env.PUBLIC_SITE_URL || "http://localhost:3000";

    /**
     * Create Stripe Checkout Session
     */
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: product.currency,
            unit_amount: product.price,
            product_data: {
              name: product.name,
              description: product.description,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_SITE_URL}/cancel`,
      metadata: {
        productKey: product.key,
      },
    });

    /**
     * Frontend will redirect user to this URL
     */
    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("CHECKOUT CREATE ERROR", err);

    return res.status(500).json({
      error: "Checkout failed",
      stripeError: err?.message || err,
    });
  }
});

/**
 * ------------------------------------------------------------
 * GET /checkout/success/:sessionId
 * ------------------------------------------------------------
 *
 * Called by:
 *  - Frontend success page
 *
 * Responsibilities:
 *  - Load order created by Stripe webhook
 *  - Load purchases linked to that order
 *  - Return delivery instructions
 *
 * This endpoint is READ-ONLY.
 */
checkoutRouter.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    /**
     * 1️⃣ Load order by Stripe session ID
     */
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    /**
     * 2️⃣ Load purchases linked to this order
     */
    const orderPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId));

    /**
     * 3️⃣ Map purchases into delivery instructions
     *
     * This keeps frontend logic simple and generic.
     */
    const deliveries = orderPurchases.map(p => {
      let type: "digital" | "gift" | "booking" = "digital";

      if (p.product_key.includes("GIFT")) type = "gift";
      if (p.product_key.includes("BOOKING")) type = "booking";

      return {
        purchaseId: p.id,
        productKey: p.product_key,
        type,
      };
    });

    /**
     * 4️⃣ Respond
     */
    return res.json({
      sessionId,
      customerEmail: order.customer_email,
      deliveries,
    });
  } catch (err) {
    console.error("CHECKOUT SUCCESS ERROR", err);
    return res.status(500).json({ error: "Unable to load order" });
  }
});
