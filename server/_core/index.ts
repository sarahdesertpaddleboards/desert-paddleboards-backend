import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import { nodeHTTPRequestHandler } from "@trpc/server/adapters/node-http";
import { adminOrdersRouter } from "../routers/admin-orders";
import { adminAuthRouter } from "../routers/admin-auth";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { adminProductsRouter } from "../routers/admin-products";
import { productsRouter } from "../routers/products";
import { checkoutRouter } from "../routers/checkout";
import { downloadRouter } from "../routers/downloads";

console.log("🔥 INDEX.TS LOADED FROM server/_core/index.ts 🔥");

async function startServer() {
  const app = express();
  const server = createServer(app);

  // ✅ MUST be first
  app.use(cookieParser());

  // Stripe webhook (must come before express.json)
  const { handleStripeWebhook } = await import("../stripe-webhook");

  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook
  );

 // Standard middleware
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

console.log("🔥 REGISTERING ADMIN ROUTES 🔥");
app.use("/admin", adminAuthRouter);

// ✅ ADD THIS
console.log("🔥 REGISTERING CHECKOUT ROUTES 🔥");
app.use("/checkout", checkoutRouter);

  app.use("/admin/products", adminProductsRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/products", productsRouter);
  app.use("/downloads", downloadRouter);

  
  // tRPC handler
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

  const port = parseInt(process.env.PORT || "3000", 10);
// Temporary Stripe redirect test routes
app.get("/success", (_req, res) => {
  res.send("✅ Payment successful – Stripe redirect works");
});

 // 🔍 TEMPORARY HEALTH CHECK (DEBUG ONLY)
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
  server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
}

startServer().catch(console.error);
