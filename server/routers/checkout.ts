import { Router } from "express";
import Stripe from "stripe";
import { mergeProducts } from "../products/mergeProducts";
import { db } from "../db";
import { productOverrides } from "../db/schema";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2023-10-16",
});

export const checkoutRouter = Router();

/**
 * POST /checkout/create
 */
checkoutRouter.post("/create", async (req, res) => {
  try {
    const { productKey } = req.body ?? {};

    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }

    // Load overrides
    const overrides = await db.select().from(productOverrides);

    // Merge products
    const products = mergeProducts(overrides);

    console.log("CHECKOUT productKey:", productKey);
    console.log("CHECKOUT merged product keys:", products.map(p => p.key));
    
    const product = products.find((p) => p.key === productKey);

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
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
      success_url: `${process.env.PUBLIC_SITE_URL}/success`,
      cancel_url: `${process.env.PUBLIC_SITE_URL}/cancel`,
      metadata: {
        productKey: product.key,
      },
    });

    return res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT CREATE ERROR", err);
    return res.status(500).json({ error: "Checkout failed" });
  }
});
