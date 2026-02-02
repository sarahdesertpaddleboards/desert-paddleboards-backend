// server/routers/checkout.ts
import { Router } from "express";
import Stripe from "stripe";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

/**
 * Backwards-compatible checkout creator.
 *
 * WHY THIS EXISTS:
 * - Your stripe-webhook.ts expects session.metadata.productKey and session.metadata.type
 * - Your older flows may be sending different shapes (e.g. productId, productType, etc.)
 * - We must NOT break digital downloads while evolving checkout for class sessions.
 *
 * Supports (legacy + new):
 * A) Legacy-ish:
 *    { productId, productType, quantity, email, name }
 *    where productId might be:
 *      - string/number (an id)
 *      - OR an object that accidentally contains price fields (seen in earlier code)
 *
 * B) New-ish (recommended):
 *    { productKey, productType, quantity, email, name, unitAmount, currency }
 *
 * IMPORTANT:
 * - Stripe expects unit_amount in the smallest currency unit (cents).
 */
router.post("/create", async (req, res) => {
  
  console.log("CHECKOUT BODY:", JSON.stringify(req.body, null, 2));

  try {
    // -----------------------------
    // 1) Pull possible inputs
    // -----------------------------
    const {
      // New recommended fields
      productKey: productKeyFromBody,
      unitAmount: unitAmountFromBody,
      currency: currencyFromBody,

      // Legacy fields
      productId,
      productType,
      quantity,
      email,
      name,
    } = req.body ?? {};

    // -----------------------------
    // 2) Determine productKey safely
    // -----------------------------
    // We ALWAYS set metadata.productKey for the webhook.
    // Priority:
    // - explicit productKey
    // - productId if it is a string/number
    // - productId.productKey or productId.key if it's an object
    let productKey: string | null = null;

    if (typeof productKeyFromBody === "string" && productKeyFromBody.trim()) {
      productKey = productKeyFromBody.trim();
    } else if (typeof productId === "string" && productId.trim()) {
      productKey = productId.trim();
    } else if (typeof productId === "number" && Number.isFinite(productId)) {
      productKey = String(productId);
    } else if (productId && typeof productId === "object") {
      // Legacy object shape support (just in case)
      if (typeof productId.productKey === "string" && productId.productKey.trim()) {
        productKey = productId.productKey.trim();
      } else if (typeof productId.key === "string" && productId.key.trim()) {
        productKey = productId.key.trim();
      } else if (typeof productId.id === "string" && productId.id.trim()) {
        productKey = productId.id.trim();
      } else if (typeof productId.id === "number" && Number.isFinite(productId.id)) {
        productKey = String(productId.id);
      }
    }

    if (!productKey) {
      return res.status(400).json({
        error:
          "Missing product identifier. Provide productKey (recommended) or productId (legacy).",
      });
    }

    // -----------------------------
    // 3) Determine productType safely
    // -----------------------------
    // Your webhook uses metadata.type and expects values like:
    // "digital" | "gift" | "merch" | (later) "class_session"
    if (!productType || typeof productType !== "string") {
      return res.status(400).json({ error: "productType is required (string)" });
    }
    const normalizedType = productType.trim();

    // -----------------------------
    // 4) Determine quantity safely
    // -----------------------------
    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({
        error: "quantity must be an integer between 1 and 20",
      });
    }

    // -----------------------------
    // 5) Determine unitAmount safely (cents)
    // -----------------------------
    // We support multiple cases to avoid breaking old clients:
    // - unitAmount in body (preferred)
    // - productId.price if productId was accidentally an object in old code
    // - productId.unitAmount if used previously
    let unitAmount: number | null = null;

    if (Number.isInteger(Number(unitAmountFromBody))) {
      unitAmount = Number(unitAmountFromBody);
    } else if (productId && typeof productId === "object") {
      // Legacy object fallback: productId.price or productId.unitAmount
      if (Number.isInteger(Number(productId.unitAmount))) {
        unitAmount = Number(productId.unitAmount);
      } else if (Number.isInteger(Number(productId.price))) {
        unitAmount = Number(productId.price);
      }
    }

    if (!unitAmount || !Number.isInteger(unitAmount) || unitAmount < 50) {
      return res.status(400).json({
        error:
          "Missing or invalid unitAmount (integer cents). Provide unitAmount, or ensure legacy payload includes productId.price/unitAmount.",
      });
    }

    // -----------------------------
    // 6) Determine currency safely
    // -----------------------------
    const currency =
      typeof currencyFromBody === "string" && currencyFromBody.length === 3
        ? currencyFromBody.toLowerCase()
        : "usd";

    // -----------------------------
    // 7) Determine display name safely
    // -----------------------------
    const itemName =
      typeof name === "string" && name.trim() ? name.trim() : `Product ${productKey}`;

    // -----------------------------
    // 8) Build success/cancel URLs safely
    // -----------------------------
    // In production, set FRONTEND_BASE_URL on Railway.
    // For local dev, fallback to Vite default port.
    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

    // -----------------------------
    // 9) Create Stripe Checkout Session
    // -----------------------------
    const session = await stripe.checkout.sessions.create({
      customer_email: typeof email === "string" ? email : undefined,
      mode: "payment",

      line_items: [
        {
          price_data: {
            currency,
            unit_amount: unitAmount,
            product_data: {
              name: itemName,
            },
          },
          quantity: qty,
        },
      ],

      // CRITICAL: webhook expects these
      metadata: {
        productKey,
        type: normalizedType,
        // Keep a breadcrumb for debugging legacy clients
        source: productKeyFromBody ? "new_payload" : "legacy_payload",
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
