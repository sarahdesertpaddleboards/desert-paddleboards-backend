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
    fullyCovered: payableAmount === 0,
  } as const;
}

async function createZeroAmountPurchase(args: {
  product: CheckoutProduct;
  email?: string;
  quantity: number;
  sessionId?: unknown;
  giftCode: string;
  amountApplied: number;
}) {
  const stripeSessionId = `gift_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

  const insertedPurchase = await db.insert(purchases).values({
    stripeSessionId,
    productKey: args.product.productKey,
    amount: 0,
    currency: (args.product.currency ?? "usd").toLowerCase(),
    customerEmail: typeof args.email === "string" ? args.email : null,
  });

  const purchaseId = Number((insertedPurchase as any)?.[0]?.insertId || (insertedPurchase as any)?.insertId || 0);

  const existingGift = await db
    .select()
    .from(giftCertificates)
    .where(eq(giftCertificates.generatedCode, args.giftCode))
    .limit(1)
    .then((r) => r[0] || null);

  if (!existingGift) {
    throw new Error("Gift certificate not found during redemption");
  }

  const currentRemaining = Number(existingGift.remainingAmount ?? 0);
  const nextRemaining = Math.max(0, currentRemaining - args.amountApplied);

  await db
    .update(giftCertificates)
    .set({
      remainingAmount: nextRemaining,
      redeemed: nextRemaining <= 0,
      status: nextRemaining <= 0 ? "redeemed" : "active",
      updatedAt: new Date(),
    })
    .where(eq(giftCertificates.id, existingGift.id));

  if (args.sessionId) {
    const bookedSessionId = Number(args.sessionId);
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
        throw new Error("Session not found while finalizing gift redemption");
      }

      const nextSeats = Math.max(0, Number(sessionRow.seatsAvailable) - args.quantity);
      await db
        .update(classSessions)
        .set({ seatsAvailable: nextSeats })
        .where(eq(classSessions.id, bookedSessionId));
    }
  }

  return stripeSessionId;
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

    const frontendBaseUrl = process.env.FRONTEND_BASE_URL || "http://localhost:5173";

    if (normalizedGiftCode && payableAmount === 0) {
      const zeroAmountSessionId = await createZeroAmountPurchase({
        product: p,
        email,
        quantity: qty,
        sessionId,
        giftCode: normalizedGiftCode,
        amountApplied,
      });

      return res.json({
        url: `${frontendBaseUrl}/success?session_id=${encodeURIComponent(zeroAmountSessionId)}`,
        fullyCoveredByGiftCode: true,
      });
    }

    if (payableAmount < 50) {
      return res.status(400).json({ error: "Adjusted checkout total is too low to send through Stripe." });
    }

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
