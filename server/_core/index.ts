import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";

import { adminAuthRouter } from "../routers/admin-auth";
import { adminOrdersRouter } from "../routers/admin-orders";
import { adminGiftCertificatesRouter } from "../routers/admin-gift-certificates";

import storePublic from "../routers/store.public";
import storeAdmin from "../routers/store.admin";

import classesPublic from "../routers/classes.public";
import classesAdmin from "../routers/classes.admin";

import sessionsPublic from "../routers/sessions.public";
import sessionsAdmin from "../routers/sessions.admin";

import stripeWebhookRouter from "../routers/stripe.webhook.route";
import checkoutSuccess from "../routers/checkout.success";
import checkoutCalendar from "../routers/checkout.calendar";
import checkoutBookingDetails from "../routers/checkout.booking-details";
import checkout from "../routers/checkout";

console.log("🔥 CLEAN EXPRESS API INITIALIZING…");

async function startServer() {
  const app = express();
  const server = createServer(app);

  app.set("trust proxy", 1);

  app.use(cookieParser());

  // Stripe webhook must be BEFORE express.json()
  app.use("/api", stripeWebhookRouter);

  // Normal parsers for everything else
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  const allowedOrigins = [
    "http://localhost:5173",
    "https://desertpaddleboards.vercel.app",
    ...(process.env.FRONTEND_BASE_URL ? [process.env.FRONTEND_BASE_URL] : []),
    ...(process.env.CORS_ALLOWED_ORIGINS
      ? process.env.CORS_ALLOWED_ORIGINS.split(",").map((s) => s.trim()).filter(Boolean)
      : []),
  ];

  app.use(
    cors({
      origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
          return callback(null, true);
        }
        return callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      credentials: true,
    })
  );

  // ADMIN
  app.use("/admin", adminAuthRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/gift-certificates", adminGiftCertificatesRouter);
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
  app.use("/checkout", checkoutBookingDetails);

  // HEALTH CHECK
  app.get("/health", (_req, res) => res.json({ ok: true }));

  const port = parseInt(process.env.PORT || "8080", 10);
  server.listen(port, () => console.log(`🚀 Running on port ${port}`));
}

startServer().catch(console.error);
