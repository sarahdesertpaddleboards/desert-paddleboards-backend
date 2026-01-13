import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";

import { adminAuthRouter } from "../routers/admin-auth";
import { adminOrdersRouter } from "../routers/admin-orders";
import { adminProductsRouter } from "../routers/admin-products";


import { productsRouter } from "../routers/products";
import { checkoutRouter } from "../routers/checkout";

import { downloadsRouter } from "../downloads/downloads.router";
import { downloadsWorkerRouter } from "../routers/downloads.worker.router";

import { db } from "../db";
import { purchases } from "../db/schema";
import { eq } from "drizzle-orm";

import { giftCertificatesRouter } from "../routers/gift-certificates";
import { shippingRouter } from "../routers/shipping";
import { classProductsRouter } from "../routers/class-products";
import { classSessionsRouter } from "../routers/class-sessions";



console.log("🔥 CLEAN EXPRESS API INITIALIZING…");

// -----------------------------------------------------
// START SERVER
// -----------------------------------------------------
async function startServer() {
  const app = express();
  const server = createServer(app);

  // Required for cookies behind proxy hosting
  app.set("trust proxy", 1);

  // Body + cookie parsing
  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // -----------------------------------------------------
  // CORS
  // -----------------------------------------------------
  const allowedOrigins = [
    "https://desertpaddleboards.vercel.app",
    "http://localhost:5173"
  ];

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);

        return cb(new Error(`CORS blocked: ${origin}`));
      },
      credentials: true
    })
  );

  // -----------------------------------------------------
  // STRIPE WEBHOOK
  // -----------------------------------------------------
  const { handleStripeWebhook } = await import("../stripe-webhook");
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // -----------------------------------------------------
  // ADMIN ROUTES
  // -----------------------------------------------------
  app.use("/admin", adminAuthRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/products", adminProductsRouter);
  app.use("/admin/class-products", classProductsRouter);
  app.use("/admin/class-sessions", classSessionsRouter);
  

  // -----------------------------------------------------
  // PUBLIC ROUTES
  // -----------------------------------------------------
  app.use("/products", productsRouter);
  app.use("/class-products", classProductsRouter);
  app.use("/class-sessions", classSessionsRouter);
  

app.use("/gift-certificates", giftCertificatesRouter);
app.use("/shipping", shippingRouter);

  app.use("/checkout", checkoutRouter);
  app.use("/downloads", downloadsRouter);
  app.use("/worker", downloadsWorkerRouter);

  // -----------------------------------------------------
  // COMPLETELY REMOVE: tRPC
  // -----------------------------------------------------
  // 🚫 NO trpc imports
  // 🚫 NO app.use("/api/trpc")
  // 🚫 Backend is now *pure REST API*

  // -----------------------------------------------------
  // SUCCESS PAGE (legacy download flow)
  // -----------------------------------------------------
  app.get("/success", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string | undefined;
      if (!sessionId) return res.status(400).send("Missing session");

      const purchase = await db
        .select()
        .from(purchases)
        .where(eq(purchases.stripeSessionId, sessionId))
        .limit(1)
        .then((r) => r[0]);

      if (!purchase)
        return res.status(404).send("Purchase not found. Contact support.");

      res.setHeader("Content-Type", "text/html");

      return res.send(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>🎉 Purchase successful</h1>
          <a href="/downloads/${purchase.id}">Download your file</a>
        </body>
        </html>
      `);
    } catch (err) {
      console.error("SUCCESS PAGE ERROR", err);
      return res.status(500).send("Something went wrong");
    }
  });

  // -----------------------------------------------------
  // HEALTH CHECK
  // -----------------------------------------------------
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        DOWNLOAD_WORKER_SECRET: !!process.env.DOWNLOAD_WORKER_SECRET
      }
    });
  });

  // -----------------------------------------------------
  // CANCEL PAGE
  // -----------------------------------------------------
  app.get("/cancel", (_req, res) => {
    res.send("❌ Payment cancelled");
  });

  // -----------------------------------------------------
  // START SERVER
  // -----------------------------------------------------
  const port = parseInt(process.env.PORT || "3000", 10);

  server.listen(port, () => {
    console.log(`🚀 Server running on port ${port}`);
  });
}

startServer().catch(console.error);
