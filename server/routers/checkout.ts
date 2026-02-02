// server/routers/checkout.ts
import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { products, productOverrides } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

/**
 * POST /checkout/create
 * Backwards compatible with existing frontend payload:
 *   { productId: number, quantity: number, email: string, name: string }
 *
 * We look up the product in DB to get:
 * - unit amount (price in cents)
 * - productKey and type for webhook metadata
 */
router.post("/create", async (req, res) => {
  try {
    const { productId, quantity, email } = req.body ?? {};

    const id = Number(productId);
    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "productId must be a number" });
    }

    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: "quantity must be 1-20" });
    }

    // Look up product + optional overrides
    const rows = await db
      .select({
        id: products.id,
        productKey: products.productKey,
        type: products.type,
        name: products.name,
        price: products.price,
        currency: products.currency,
        active: products.active,
        overrideName: productOverrides.overrideName,
        overridePrice: productOverrides.overridePrice,
      })
      .from(products)
      .leftJoin(productOverrides, eq(productOverrides.productId, products.id))
      .where(eq(products.id, id))
      .limit(1);

    const p = rows[0];

    if (!p || p.active === false) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    const itemName = (p.overrideName ?? p.name) || `Product ${p.productKey}`;
    const unitAmount = Number(p.overridePrice ?? p.price); // cents
    const currency = (p.currency ?? "usd").toLowerCase();

    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      return res.status(400).json({ error: "Invalid product price" });
    }

    // For local fallback, assume Vite port 5173
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer_email: typeof email === "string" ? email : undefined,
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: { name: itemName },
          },
          quantity: qty,
        },
      ],

      // CRITICAL: your stripe-webhook.ts expects these
      metadata: {
        productKey: p.productKey,
        type: p.type, // "digital" | "gift" | "merch" | later "class_session"
      },

      success_url: `${frontendBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
