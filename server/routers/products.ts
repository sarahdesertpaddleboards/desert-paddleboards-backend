import { Router } from "express";
import { mergeProducts } from "../utils/mergeProducts";

export const productsRouter = Router();

productsRouter.get("/", async (req, res) => {
  try {
    const items = await mergeProducts();
    res.json(items);
  } catch (err) {
    console.error("PRODUCTS ROUTE ERROR", err);
    res.status(500).json({ error: "Failed to load products" });
  }
});
