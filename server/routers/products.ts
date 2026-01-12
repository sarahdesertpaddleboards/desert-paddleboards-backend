// server/routers/products.ts
import { Router } from "express";
import { loadPublicProducts } from "../products/mergeProducts";

const router = Router();

// GET /products — unified public product loader
router.get("/", async (_req, res) => {
  try {
    // Load products using the new merged system
    const products = await loadPublicProducts();

    // Return them directly
    return res.json(products);
  } catch (err) {
    console.error("PRODUCTS ROUTE ERROR", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
});

export { router as productsRouter };
