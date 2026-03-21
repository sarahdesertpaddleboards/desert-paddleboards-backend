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

async function createCheckout(req: any, res: any) {
  try {
    const { productId, productKey, quantity, email } = req.body ?? {};

    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: "quantity must be 1-20" });
    }

    const query = db
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
      .leftJoin(productOverrides, eq(productOverrides.productId, products.id));

    let rows;

    if (typeof productKey === "string" && productKey.trim()) {
      rows = await query.where(eq(products.productKey, productKey.trim())).limit(1);
    } else {
      const id = Number(productId);
      if (!Number.isFinite(id)) {
        return res.status(400).json({ error: "productId or productKey is required" });
      }
      rows = await query.where(eq(products.id, id)).limit(1);
    }

    const p = rows[0];

    if (!p || p.active === false) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    const itemName = (p.overrideName ?? p.name) || `Product ${p.productKey}`;
    const unitAmount = Number(p.overridePrice ?? p.price);
    const currency = (p.currency ?? "usd").toLowerCase();

    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      return res.status(400).json({ error: "Invalid product price" });
    }

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
      metadata: {
        productKey: p.productKey,
        type: p.type,
        ...(sessionId ? { sessionId: String(sessionId) } : {}),
      },
      success_url: `${frontendBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/cancel`,
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}

router.post("/", createCheckout);
router.post("/create", createCheckout);

export default router;
