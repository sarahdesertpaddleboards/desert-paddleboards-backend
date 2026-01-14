// server/routers/public-store.ts
import { Router } from "express";
import { db } from "../db";
import { giftCertificates, downloads } from "../db/schema";

export const publicStoreRouter = Router();

// -----------------------------------------------------
// GET /store/products
// Unified public product list for Shop page
// -----------------------------------------------------
publicStoreRouter.get("/products", async (_req, res) => {
  try {
    // Gift Certificates
    const giftRows = await db.select().from(giftCertificates);

    // Downloads (simple digital products)
    const downloadRows = await db.select().from(downloads);

    // Merch (not created yet – return empty list)
    const merchRows: any[] = [];

    // Unify shape
    const giftMapped = giftRows.map((g) => ({
      type: "gift_certificate",
      id: g.id,
      productKey: g.productKey,
      name: g.name,
      description: g.description,
      price: g.price,
      imageUrl: g.imageUrl
    }));

    const downloadMapped = downloadRows.map((d) => ({
      type: "download",
      id: d.id,
      productKey: d.productKey,
      name: d.name,
      description: d.description,
      price: d.price,
      imageUrl: d.imageUrl
    }));

    const merchMapped = merchRows; // empty for now

    return res.json([...giftMapped, ...downloadMapped, ...merchMapped]);
  } catch (err) {
    console.error("STORE PRODUCTS PUBLIC ERROR", err);
    return res.status(500).json({ error: "Failed to load store products" });
  }
});
