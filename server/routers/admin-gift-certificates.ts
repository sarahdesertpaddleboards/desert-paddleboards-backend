import { Router } from "express";
import { sdk } from "../_core/sdk";
import { db } from "../db";
import { giftCertificates } from "../db/schema";
import { desc } from "drizzle-orm";

export const adminGiftCertificatesRouter = Router();

adminGiftCertificatesRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const result = await db
      .select({
        id: giftCertificates.id,
        purchaseId: giftCertificates.purchaseId,
        productKey: giftCertificates.productKey,
        generatedCode: giftCertificates.generatedCode,
        originalAmount: giftCertificates.originalAmount,
        remainingAmount: giftCertificates.remainingAmount,
        currency: giftCertificates.currency,
        purchaserEmail: giftCertificates.purchaserEmail,
        recipientName: giftCertificates.recipientName,
        recipientEmail: giftCertificates.recipientEmail,
        status: giftCertificates.status,
        redeemed: giftCertificates.redeemed,
        createdAt: giftCertificates.createdAt,
      })
      .from(giftCertificates)
      .orderBy(desc(giftCertificates.createdAt));

    res.json(result);
  } catch (err) {
    console.error("ADMIN GIFT CERTIFICATES ERROR:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});
