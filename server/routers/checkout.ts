import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { purchases } from "../db/schema";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

// POST /checkout/create
router.post("/create", async (req, res) => {
  try {
    const { productId, productType, quantity, email, name } = req.body;

    // You can expand this later depending on store/class product types

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: productId.price,
            product_data: {
              name,
            },
          },
          quantity,
        },
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_BASE_URL}/cancel`,
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});

export default router;
