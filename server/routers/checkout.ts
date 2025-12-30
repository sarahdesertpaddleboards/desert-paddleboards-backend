import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { orders, purchases, productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";
import { mergeProducts } from "../products/mergeProducts";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const checkoutRouter = Router();

/**
 * ============================================================
 * CREATE STRIPE CHECKOUT SESSION
 * ============================================================
 *
 * POST /checkout/create
 */
checkoutRouter.post("/create", async (req, res) => {
  try {
    const { productKey } = req.body ?? {};

    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }

    // Load product catalog (base + overrides)
    const overrides = await db.select().from(productOverrides);
    const products = mergeProducts(overrides);

    const product = products.find(p => p.key === productKey);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL;
    if (!PUBLIC_SITE_URL) {
      throw new Error("PUBLIC_SITE_URL not set");
    }

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

    return res.json({ url: session.url });
  } catch (err: any) {
    console.error("CHECKOUT CREATE ERROR", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
});

/**
 * ============================================================
 * CHECKOUT SUCCESS DATA
 * ============================================================
 *
 * GET /checkout/success/:sessionId
 *
 * Called by frontend success page
 */
checkoutRouter.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    // 1️⃣ Load order
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    // 2️⃣ Load purchases linked to this order
    const orderPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripe_session_id, sessionId));

    // 3️⃣ Map to delivery model
    const deliveries = orderPurchases.map(p => {
      let type: "digital" | "gift" | "booking" = "digital";

      if (p.product_key.includes("GIFT")) type = "gift";
      if (p.product_key.includes("CLASS")) type = "booking";

      return {
        purchaseId: p.id,
        productKey: p.product_key,
        type,
      };
    });

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
