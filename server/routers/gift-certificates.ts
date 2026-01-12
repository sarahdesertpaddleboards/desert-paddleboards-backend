import { Router } from "express";
import { db } from "../db";
import { giftCertificates } from "../db/schema";
import { randomBytes } from "crypto";

export const giftCertificatesRouter = Router();

// Generates internal code
function generateCode() {
  return randomBytes(6).toString("hex").toUpperCase();
}

giftCertificatesRouter.post("/create", async (req, res) => {
  try {
    const { purchaseId, productId, recipientName, recipientEmail, message } = req.body;

    const code = generateCode();

    await db.insert(giftCertificates).values({
      purchaseId,
      productId,
      recipientName,
      recipientEmail,
      message,
      generatedCode: code,
    });

    res.json({ success: true, code });
  } catch (err) {
    console.error("GIFT CERT ERROR", err);
    res.status(500).json({ error: "Failed to create gift certificate" });
  }
});
