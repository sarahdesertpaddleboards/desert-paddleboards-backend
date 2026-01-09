import { Router } from "express";
import { loadPublicProducts } from "../products/mergeProducts";

export const productsRouter = Router();

productsRouter.get("/", async (_req, res) => {
  try {
    const products = await loadPublicProducts();
    return res.json(products);
  } catch (err) {
    console.error("PUBLIC PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load products" });
  }
});
