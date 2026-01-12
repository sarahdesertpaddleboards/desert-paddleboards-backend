import { Router } from "express";
import { db } from "../db";
import { shippingAddresses } from "../db/schema";

export const shippingRouter = Router();

shippingRouter.post("/create", async (req, res) => {
  try {
    const { purchaseId, productId, fullName, addressLine1, addressLine2, city, state, postalCode, country } = req.body;

    await db.insert(shippingAddresses).values({
      purchaseId,
      productId,
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("SHIPPING ERROR", err);
    res.status(500).json({ error: "Failed to save shipping address" });
  }
});
