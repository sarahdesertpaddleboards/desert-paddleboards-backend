import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { orders, purchases } from "../db/schema";
import { eq } from "drizzle-orm";
import { loadPublicProducts } from "../products/mergeProducts";

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

    // Load DB-backed public products
    const products = await loadPublicProducts();

    // Note: new format uses product.productKey
    const product = products.find(p => p.productKey === productKey);

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
              description: product.description ?? "",
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${PUBLIC_SITE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${PUBLIC_SITE_URL}/cancel`,
      metadata: {
        productKey: product.productKey,
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
 * CHECKOUT SUCCESS ENDPOINT
 * ============================================================
 */
checkoutRouter.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const orderPurchases = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId));

    const deliveries = orderPurchases.map(p => {
      let type: "digital" | "gift" | "booking" = "digital";

      if (p.productKey.includes("GIFT")) type = "gift";
      if (p.productKey.includes("CLASS")) type = "booking";

      return {
        purchaseId: p.id,
        productKey: p.productKey,
        type,
      };
    });

    return res.json({
      sessionId,
      status: order.status,
      customerEmail: order.customerEmail,
      deliveries,
    });
  } catch (err) {
    console.error("CHECKOUT SUCCESS ERROR", err);
    return res.status(500).json({ error: "Unable to load order" });
  }
});
