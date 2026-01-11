import { Router } from "express";
import { db } from "../db";
import { classProducts } from "../db/schema";

export const publicClassProductsRouter = Router();

publicClassProductsRouter.get("/", async (_req, res) => {
  try {
    const products = await db.select().from(classProducts);
    return res.json(products.filter(p => p.active));
  } catch (err) {
    console.error("PUBLIC CLASS PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load class products" });
  }
});
