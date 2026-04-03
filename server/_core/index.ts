import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";

import { adminAuthRouter } from "../routers/admin-auth";
import { adminOrdersRouter } from "../routers/admin-orders";

import storePublic from "../routers/store.public";
import storeAdmin from "../routers/store.admin";

import classesPublic from "../routers/classes.public";
import classesAdmin from "../routers/classes.admin";

import sessionsPublic from "../routers/sessions.public";
import sessionsAdmin from "../routers/sessions.admin";

// ✅ FIXED PATH (match the other router imports)
import stripeWebhookRouter from "../routers/stripe.webhook.route";

// ✅ New: checkout success route (we'll create this file next)
import checkoutSuccess from "../routers/checkout.success";

import checkout from "../routers/checkout";

console.log("🔥 CLEAN EXPRESS API INITIALIZING…");

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);

  app.use(cookieParser());

  // ✅ Stripe webhook must be BEFORE express.json()
  app.use("/api", stripeWebhookRouter);

  // Normal parsers for everything else
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  app.use(
    cors({
      origin: ["http://localhost:5173", "https://desertpaddleboards.vercel.app"],
      credentials: true,
    })
  );

  // ADMIN
  app.use("/admin", adminAuthRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/store/products", storeAdmin);
  app.use("/admin/classes/products", classesAdmin);
  app.use("/admin/classes/sessions", sessionsAdmin);

  // PUBLIC
  app.use("/store/products", storePublic);
  app.use("/classes/products", classesPublic);
  app.use("/classes/sessions", sessionsPublic);

  // Checkout routes
  app.use("/checkout", checkout);
  app.use("/checkout", checkoutSuccess);
  app.use("/checkout", checkoutCalendar);

  // HEALTH CHECK
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const port = parseInt(process.env.PORT || "8080", 10);
  server.listen(port, () => console.log(`🚀 Running on port ${port}`));
}

startServer().catch(console.error);
ch(console.error);
