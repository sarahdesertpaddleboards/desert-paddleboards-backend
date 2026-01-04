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
import { downloadsWorkerRouter } from "../routers/downloads.worker.router";
import { downloadsRouter } from "../downloads/downloads.router";
import { eq } from "drizzle-orm";
import { db } from "../db";
import { purchases } from "../db/schema";

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
import { adminAuthRouter } from "../routers/admin.auth";

app.use("/admin", adminAuthRouter);


// ✅ ADD THIS
console.log("🔥 REGISTERING CHECKOUT ROUTES 🔥");

  app.use("/admin/products", adminProductsRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/products", productsRouter);
  app.use("/routers", downloadsWorkerRouter);
  app.use("/downloads", downloadsRouter);
  app.use("/checkout", checkoutRouter);

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

  app.get("/success", async (req, res) => {
    try {
      const sessionId = req.query.session_id as string | undefined;
  
      if (!sessionId) {
        return res.status(400).send("Missing session information");
      }
  
      // 1️⃣ Find purchase created by webhook
      const purchase = await db
        .select()
        .from(purchases)
        .where(eq(purchases.stripeSessionId, sessionId))
        .limit(1)
        .then(r => r[0]);
  
      if (!purchase) {
        return res
          .status(404)
          .send("Purchase not found. Please contact support.");
      }
  
      // 2️⃣ Render simple success + download page
      res.setHeader("Content-Type", "text/html");
  
      return res.send(`
        <!DOCTYPE html>
        <html lang="en">
          <head>
            <meta charset="UTF-8" />
            <title>Purchase successful</title>
            <meta name="viewport" content="width=device-width, initial-scale=1" />
            <style>
              body {
                font-family: system-ui, -apple-system, BlinkMacSystemFont, sans-serif;
                background: #f9fafb;
                color: #111;
                padding: 40px;
              }
              .card {
                max-width: 520px;
                margin: 0 auto;
                background: white;
                padding: 32px;
                border-radius: 12px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.08);
              }
              h1 {
                margin-top: 0;
              }
              a.button {
                display: inline-block;
                margin-top: 24px;
                padding: 14px 20px;
                background: #0074d4;
                color: white;
                text-decoration: none;
                border-radius: 8px;
                font-weight: 600;
              }
              a.button:hover {
                background: #005fa3;
              }
              .note {
                margin-top: 24px;
                font-size: 14px;
                color: #555;
              }
            </style>
          </head>
          <body>
            <div class="card">
              <h1>🎉 Purchase successful</h1>
              <p>Thank you for your purchase.</p>
  
              <a class="button" href="/downloads/${purchase.id}">
                Download your file
              </a>
  
              <p class="note">
                If your download doesn’t start, you can refresh this page or contact support.
              </p>
            </div>
          </body>
        </html>
      `);
    } catch (err) {
      console.error("SUCCESS PAGE ERROR", err);
      return res.status(500).send("Something went wrong");
    }
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
