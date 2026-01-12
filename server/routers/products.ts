import { Router } from "express";
import { loadPublicProducts } from "../products/mergeProducts";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  try {
    const products = await loadPublicProducts();

    res.json(items);
  } catch (err) {
    console.error("PRODUCTS ROUTE ERROR", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});
