import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import cors from "cors";

import { adminAuthRouter } from "../routers/admin-auth";
import { adminOrdersRouter } from "../routers/admin-orders";
import { adminProductsRouter } from "../routers/admin-products";
import { appRouter } from "../routers";
import { createContext } from "./context";

import { productsRouter } from "../routers/products";
import { checkoutRouter } from "../routers/checkout";
import { downloadsWorkerRouter } from "../routers/downloads.worker.router";
import { downloadsRouter } from "../downloads/downloads.router";

import { db } from "../db";
import { purchases } from "../db/schema";
import { eq } from "drizzle-orm";
import { classProductsRouter } from "../routers/class-products";
import { classSessionsRouter } from "../routers/class-sessions";


console.log("🔥 INDEX.TS LOADED FROM server/_core/index.ts 🔥");

async function startServer() {
  const app = express();
  const server = createServer(app);

  // REQUIRED for secure cookies behind Railway/Vercel proxies
  app.set("trust proxy", 1);

  // Cookie + JSON parsing
  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  // CORS
  const allowedOrigins = [
    "https://desertpaddleboards.vercel.app",
    "http://localhost:5173",
  ];

  app.use(
    cors({
      origin(origin, cb) {
        if (!origin) return cb(null, true);
        if (allowedOrigins.includes(origin)) return cb(null, true);
        return cb(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })
  );

  // Stripe webhook
  const { handleStripeWebhook } = await import("../stripe-webhook");
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

  // Admin routes
  console.log("🔥 REGISTERING ADMIN ROUTES 🔥");
  app.use("/admin", adminAuthRouter);
  app.use("/admin/products", adminProductsRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/class-products", classProductsRouter);
  app.use("/admin/class-sessions", classSessionsRouter);
  
  // Shop routes
  app.use("/products", productsRouter);
  app.use("/downloads", downloadsRouter);
  app.use("/routers", downloadsWorkerRouter);
  app.use("/checkout", checkoutRouter);

  // tRPC
  app.use("/api/trpc/:path", (req, res) => {
    const procedure = req.params.path;
    let input = undefined;

    if (req.method === "GET" && typeof req.query.input === "string") {
      try {
        input = JSON.parse(req.query.input);
      } catch (err) {
        console.error("Failed to parse GET input:", err);
      }
    }

    if (req.method !== "GET" && req.body?.input !== undefined) {
      input = req.body.input;
    }

    return nodeHTTPRequestHandler({
      req,
      res,
      router: appRouter,
      createContext,
      path: procedure,
      getInput: () => input,
    });
  });

  // SUCCESS PAGE
  app.get("/success", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string | undefined;
      if (!sessionId) return res.status(400).send("Missing session");

      const purchase = await db
        .select()
        .from(purchases)
        .where(eq(purchases.stripeSessionId, sessionId))
        .limit(1)
        .then(r => r[0]);

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

  // Health check
  app.get("/health", (_req, res) => {
    res.json({
      ok: true,
      env: {
        DATABASE_URL: !!process.env.DATABASE_URL,
        STRIPE_SECRET_KEY: !!process.env.STRIPE_SECRET_KEY,
        DOWNLOAD_WORKER_SECRET: !!process.env.DOWNLOAD_WORKER_SECRET,
      },
    });
  });

  app.get("/cancel", (_req, res) => {
    res.send("❌ Payment cancelled");
  });

  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
