// server/routers/stripe.webhook.route.ts
import { Router } from "express";
import express from "express";
import { handleStripeWebhook } from "../stripe-webhook";

const router = Router();

/**
 * Stripe webhook endpoint.
 * IMPORTANT: Must use express.raw() for signature verification.
 */
router.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  handleStripeWebhook
);

export default router;
