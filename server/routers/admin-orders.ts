import { Router } from "express";
import { db } from "../db";
import { orders, downloads } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import crypto from "crypto";
import { PRODUCTS } from "../products";

export const adminOrdersRouter = Router();

/**
 * GET /admin/orders
 * List recent orders
 */
adminOrdersRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const rows = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt))
      .limit(100);

    return res.json(rows);
  } catch (err) {
    console.error("ADMIN ORDERS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/orders/:id/fulfill
 * Mark an order as fulfilled
 * If digital → create download token
 */
adminOrdersRouter.post("/:id/fulfill", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const orderId = req.params.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (order.status !== "paid") {
      return res.status(400).json({
        error: `Cannot fulfill order with status '${order.status}'`,
      });
    }

    await db
      .update(orders)
      .set({ status: "fulfilled" })
      .where(eq(orders.id, orderId));

    const product = PRODUCTS[order.productKey as keyof typeof PRODUCTS];

    let downloadToken: string | null = null;

    if (product?.type === "digital") {
      downloadToken = crypto.randomBytes(32).toString("hex");

      await db.insert(downloads).values({
        orderId: order.id,
        productKey: order.productKey,
        token: downloadToken,
        expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
      });
    }

    return res.json({
      success: true,
      orderId,
      newStatus: "fulfilled",
      downloadCreated: Boolean(downloadToken),
      downloadToken,
    });
  } catch (err) {
    console.error("ORDER FULFILL ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/orders/:id/resend-download
 * Generates a NEW download token for a digital order
 */
adminOrdersRouter.post("/:id/resend-download", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const orderId = req.params.id;

    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.id, orderId))
      .limit(1);

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    const product = PRODUCTS[order.productKey as keyof typeof PRODUCTS];

    if (!product || product.type !== "digital") {
      return res.status(400).json({
        error: "Order is not a digital product",
      });
    }

    // Create a fresh token
    const newToken = crypto.randomBytes(32).toString("hex");

    await db.insert(downloads).values({
      orderId: order.id,
      productKey: order.productKey,
      token: newToken,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 7),
    });

    const downloadUrl = `${process.env.DOWNLOAD_WORKER_URL}/download/${newToken}`;

    return res.json({
      success: true,
      orderId,
      productKey: order.productKey,
      downloadUrl,
      expiresInDays: 7,
    });
  } catch (err) {
    console.error("RESEND DOWNLOAD ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
