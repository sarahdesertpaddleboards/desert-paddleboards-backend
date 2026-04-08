// server/routers/checkout.ts
import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { products, productOverrides, classProducts, classSessions, giftCertificates } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

type CheckoutProduct = {
  id: number;
  productKey: string;
  type: string;
  name: string | null;
  price: number;
  currency: string | null;
  active: boolean | null;
};

async function findCheckoutProduct(productId: unknown, productKey: unknown): Promise<CheckoutProduct | null> {
  const storeQuery = db
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

  if (typeof productKey === "string" && productKey.trim()) {
    const key = productKey.trim();

    const storeRows = await storeQuery.where(eq(products.productKey, key)).limit(1);
    const storeProduct = storeRows[0];

    if (storeProduct) {
      return {
        id: storeProduct.id,
        productKey: storeProduct.productKey,
        type: storeProduct.type,
        name: storeProduct.overrideName ?? storeProduct.name,
        price: Number(storeProduct.overridePrice ?? storeProduct.price),
        currency: storeProduct.currency,
        active: storeProduct.active,
      };
    }

    const classRows = await db
      .select({
        id: classProducts.id,
        productKey: classProducts.productKey,
        type: classProducts.productType,
        name: classProducts.name,
        price: classProducts.price,
        currency: classProducts.currency,
        active: classProducts.active,
      })
      .from(classProducts)
      .where(eq(classProducts.productKey, key))
      .limit(1);

    const classProduct = classRows[0];
    if (classProduct) {
      return {
        id: classProduct.id,
        productKey: classProduct.productKey,
        type: classProduct.type,
        name: classProduct.name,
        price: Number(classProduct.price),
        currency: classProduct.currency,
        active: classProduct.active,
      };
    }

    return null;
  }

  const id = Number(productId);
  if (!Number.isFinite(id)) {
    return null;
  }

  const rows = await storeQuery.where(eq(products.id, id)).limit(1);
  const storeProduct = rows[0];
  if (!storeProduct) return null;

  return {
    id: storeProduct.id,
    productKey: storeProduct.productKey,
    type: storeProduct.type,
    name: storeProduct.overrideName ?? storeProduct.name,
    price: Number(storeProduct.overridePrice ?? storeProduct.price),
    currency: storeProduct.currency,
    active: storeProduct.active,
  };
}

async function previewGiftCode(giftCode: string, totalAmount: number) {
  const normalized = giftCode.trim().toUpperCase();
  if (!normalized) return null;

  const cert = await db
    .select()
    .from(giftCertificates)
    .where(eq(giftCertificates.generatedCode, normalized))
    .limit(1)
    .then((r) => r[0] || null);

  if (!cert) {
    return { valid: false, error: "Gift code not found" } as const;
  }

  if (cert.status && cert.status !== "active") {
    return { valid: false, error: "Gift code is not active" } as const;
  }

  const remaining = Number(cert.remainingAmount ?? 0);
  if (!Number.isFinite(remaining) || remaining <= 0 || cert.redeemed) {
    return { valid: false, error: "Gift code has no remaining balance" } as const;
  }

  const amountApplied = Math.min(remaining, totalAmount);
  const payableAmount = Math.max(0, totalAmount - amountApplied);

  return {
    valid: true,
    code: normalized,
    originalAmount: totalAmount,
    amountApplied,
    payableAmount,
    remainingBalanceAfterPurchase: remaining - amountApplied,
    currency: cert.currency ?? "usd",
  } as const;
}

router.post("/gift-code/preview", async (req, res) => {
  try {
    const { productId, productKey, quantity, giftCode } = req.body ?? {};

    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: "quantity must be 1-20" });
    }

    if (typeof giftCode !== "string" || !giftCode.trim()) {
      return res.status(400).json({ error: "giftCode is required" });
    }

    const p = await findCheckoutProduct(productId, productKey);
    if (!p || p.active === false) {
      return res.status(404).json({ error: "Product not found" });
    }

    const totalAmount = Number(p.price) * qty;
    const preview = await previewGiftCode(giftCode, totalAmount);

    if (!preview) {
      return res.status(400).json({ error: "Unable to preview gift code" });
    }

    if (!preview.valid) {
      return res.status(400).json({ error: preview.error });
    }

    return res.json(preview);
  } catch (err) {
    console.error("GIFT PREVIEW ERROR", err);
    return res.status(500).json({ error: "Failed to preview gift code" });
  }
});

async function createCheckout(req: any, res: any) {
  try {
    const { productId, productKey, quantity, email, sessionId, giftCode } = req.body ?? {};

    const qty = Number(quantity ?? 1);
    if (!Number.isInteger(qty) || qty < 1 || qty > 20) {
      return res.status(400).json({ error: "quantity must be 1-20" });
    }

    const p = await findCheckoutProduct(productId, productKey);

    if (!p) {
      return res.status(400).json({ error: "productId or productKey is required" });
    }

    if (p.active === false) {
      return res.status(404).json({ error: "Product not found or inactive" });
    }

    if (sessionId) {
      const bookedSessionId = Number(sessionId);
      if (Number.isFinite(bookedSessionId)) {
        const sessionRow = await db
          .select({
            id: classSessions.id,
            seatsAvailable: classSessions.seatsAvailable,
          })
          .from(classSessions)
          .where(eq(classSessions.id, bookedSessionId))
          .limit(1)
          .then((r) => r[0]);

        if (!sessionRow) {
          return res.status(404).json({ error: "Session not found" });
        }

        if (qty > sessionRow.seatsAvailable) {
          return res.status(400).json({ error: `Only ${sessionRow.seatsAvailable} spots remain for this session` });
        }
      }
    }

    const itemName = p.name || `Product ${p.productKey}`;
    const unitAmount = Number(p.price);
    const currency = (p.currency ?? "usd").toLowerCase();

    if (!Number.isInteger(unitAmount) || unitAmount < 50) {
      return res.status(400).json({ error: "Invalid product price" });
    }

    const originalAmount = unitAmount * qty;
    let amountApplied = 0;
    let payableAmount = originalAmount;
    let normalizedGiftCode: string | null = null;

    if (typeof giftCode === "string" && giftCode.trim()) {
      const preview = await previewGiftCode(giftCode, originalAmount);
      if (!preview || !preview.valid) {
        return res.status(400).json({ error: preview?.error || "Invalid gift code" });
      }
      normalizedGiftCode = preview.code;
      amountApplied = preview.amountApplied;
      payableAmount = preview.payableAmount;
    }

    if (payableAmount < 50) {
      return res.status(400).json({ error: "Gift certificates cannot fully cover checkout yet. Please use a code with a smaller balance or add another item." });
    }

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

    const session = await stripe.checkout.sessions.create({
      customer_email: typeof email === "string" ? email : undefined,
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency,
            unit_amount: payableAmount,
            product_data: {
              name: normalizedGiftCode ? `${itemName} (gift applied)` : itemName,
            },
          },
          quantity: 1,
        },
      ],
      success_url: `${frontendBaseUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${frontendBaseUrl}/buy/${p.productKey}`,
      metadata: {
        productId: String(p.id),
        productKey: p.productKey,
        type: p.type,
        quantity: String(qty),
        email: typeof email === "string" ? email : "",
        sessionId: sessionId ? String(sessionId) : "",
        giftCode: normalizedGiftCode || "",
        giftAmountApplied: String(amountApplied),
        originalAmount: String(originalAmount),
      },
    });

    res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
}

router.post("/create-checkout-session", createCheckout);
router.post("/create-session", createCheckout);

export default router;
