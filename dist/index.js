var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/db/schema.ts
var schema_exports = {};
__export(schema_exports, {
  adminUsers: () => adminUsers,
  classProducts: () => classProducts,
  classSessions: () => classSessions,
  downloads: () => downloads,
  giftCertificates: () => giftCertificates,
  orders: () => orders,
  productOverrides: () => productOverrides,
  products: () => products,
  purchases: () => purchases,
  shippingAddresses: () => shippingAddresses
});
import {
  mysqlTable,
  varchar,
  int,
  text,
  boolean,
  datetime,
  timestamp
} from "drizzle-orm/mysql-core";
var adminUsers, products, productOverrides, orders, purchases, downloads, giftCertificates, shippingAddresses, classProducts, classSessions;
var init_schema = __esm({
  "server/db/schema.ts"() {
    adminUsers = mysqlTable("admin_users", {
      id: int("id").primaryKey().autoincrement(),
      email: varchar("email", { length: 255 }).notNull(),
      passwordHash: varchar("password_hash", { length: 255 }).notNull()
    });
    products = mysqlTable("products", {
      id: int("id").primaryKey().autoincrement(),
      productKey: varchar("product_key", { length: 255 }).notNull().unique(),
      type: varchar("type", { length: 50 }).notNull(),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: int("price").notNull(),
      currency: varchar("currency", { length: 10 }).default("usd"),
      imageUrl: varchar("image_url", { length: 500 }),
      active: boolean("active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    productOverrides = mysqlTable("product_overrides", {
      id: int("id").primaryKey().autoincrement(),
      productId: int("product_id").notNull(),
      overrideName: varchar("override_name", { length: 255 }),
      overridePrice: int("override_price")
    });
    orders = mysqlTable("orders", {
      id: int("id").primaryKey().autoincrement(),
      email: varchar("email", { length: 255 }).notNull(),
      productId: int("product_id").notNull(),
      quantity: int("quantity").default(1),
      stripeSessionId: varchar("stripe_session_id", { length: 255 }),
      fulfilled: boolean("fulfilled").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    purchases = mysqlTable("purchases", {
      id: int("id").primaryKey().autoincrement(),
      productId: int("product_id").notNull(),
      stripeSessionId: varchar("stripe_session_id", { length: 255 }),
      email: varchar("email", { length: 255 }),
      createdAt: timestamp("created_at").defaultNow()
    });
    downloads = mysqlTable("downloads", {
      id: int("id").primaryKey().autoincrement(),
      purchaseId: int("purchase_id").notNull(),
      fileKey: varchar("file_key", { length: 255 }).notNull(),
      createdAt: timestamp("created_at").defaultNow()
    });
    giftCertificates = mysqlTable("gift_certificates", {
      id: int("id").primaryKey().autoincrement(),
      code: varchar("code", { length: 100 }).notNull().unique(),
      productId: int("product_id").notNull(),
      amount: int("amount").notNull(),
      redeemed: boolean("redeemed").default(false),
      createdAt: timestamp("created_at").defaultNow()
    });
    shippingAddresses = mysqlTable("shipping_addresses", {
      id: int("id").primaryKey().autoincrement(),
      orderId: int("order_id").notNull(),
      fullName: varchar("full_name", { length: 255 }).notNull(),
      address1: varchar("address1", { length: 255 }).notNull(),
      address2: varchar("address2", { length: 255 }),
      city: varchar("city", { length: 255 }).notNull(),
      region: varchar("region", { length: 255 }),
      postalCode: varchar("postal_code", { length: 50 }).notNull(),
      country: varchar("country", { length: 100 }).notNull()
    });
    classProducts = mysqlTable("class_products", {
      id: int("id").primaryKey().autoincrement(),
      productKey: varchar("product_key", { length: 128 }),
      name: varchar("name", { length: 255 }).notNull(),
      description: text("description"),
      price: int("price").notNull(),
      currency: varchar("currency", { length: 10 }).notNull(),
      capacity: int("capacity").notNull(),
      imageUrl: varchar("image_url", { length: 500 }),
      active: boolean("active").default(true),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
    classSessions = mysqlTable("class_sessions", {
      id: int("id").primaryKey().autoincrement(),
      classProductId: int("class_product_id").notNull().references(() => classProducts.id),
      startTime: datetime("start_time").notNull(),
      endTime: datetime("end_time").notNull(),
      seatsTotal: int("seats_total").notNull(),
      seatsAvailable: int("seats_available").notNull(),
      createdAt: timestamp("created_at").defaultNow(),
      updatedAt: timestamp("updated_at").defaultNow()
    });
  }
});

// server/db.ts
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { eq } from "drizzle-orm";
var pool, db;
var init_db = __esm({
  "server/db.ts"() {
    init_schema();
    init_schema();
    pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 5
    });
    db = drizzle(pool, {
      schema: schema_exports,
      mode: "default"
    });
  }
});

// server/_core/email.ts
import { Resend } from "resend";
async function sendOrderConfirmationEmail(args) {
  const { order, purchases: purchases2 } = args;
  if (!order.customerEmail) {
    console.warn(
      "EMAIL: Order has no customer email, skipping",
      order.id
    );
    return;
  }
  const deliveryLines = purchases2.map((purchase) => {
    return `
      <li>
        <strong>${purchase.productKey}</strong><br/>
        <a href="${process.env.PUBLIC_API_BASE_URL}/downloads/${purchase.id}">
          Download your purchase
        </a>
      </li>
    `;
  });
  const html = `
    <div style="font-family: system-ui, sans-serif; line-height: 1.6;">
      <h2>Thank you for your purchase \u{1F30A}</h2>

      <p>
        Your order has been successfully processed.
      </p>

      <p>
        <strong>Order ID:</strong><br/>
        ${order.id}
      </p>

      <h3>Your items</h3>
      <ul>
        ${deliveryLines.join("")}
      </ul>

      <p style="margin-top: 24px;">
        If you have any issues, just reply to this email.
      </p>

      <p>
        \u2014 Desert Paddleboards
      </p>
    </div>
  `;
  await resend.emails.send({
    from: "Desert Paddleboards <info@desertpaddleboards.com>",
    to: order.customerEmail,
    subject: "Your Desert Paddleboards purchase is ready",
    html
  });
  console.log("EMAIL: Order confirmation sent", order.id);
}
var resend;
var init_email = __esm({
  "server/_core/email.ts"() {
    resend = new Resend(process.env.RESEND_API_KEY);
  }
});

// server/stripe-webhook.ts
var stripe_webhook_exports = {};
__export(stripe_webhook_exports, {
  handleStripeWebhook: () => handleStripeWebhook
});
import Stripe2 from "stripe";
import { eq as eq8 } from "drizzle-orm";
import crypto from "crypto";
async function handleStripeWebhook(req, res) {
  const sig = req.headers["stripe-signature"];
  if (!sig) return res.status(400).send("Missing Stripe signature");
  let event;
  try {
    event = stripe2.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error("\u274C Invalid Stripe signature", err);
    return res.status(400).send("Invalid signature");
  }
  const existingEvent = await db.select().from(orders).where(eq8(orders.stripeEventId, event.id)).limit(1).then((r) => r[0]);
  if (existingEvent) {
    console.log("\u{1F501} Duplicate webhook ignored:", event.id);
    return res.json({ received: true });
  }
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const metadata = session.metadata || {};
    const productKey = metadata.productKey;
    const productType = metadata.type;
    if (!productKey) {
      console.error("\u274C Missing productKey on session");
      return res.status(400).end();
    }
    await db.insert(orders).values({
      id: session.id,
      productKey,
      amount: session.amount_total,
      currency: session.currency,
      status: "fulfilled",
      customerEmail: session.customer_details?.email ?? null,
      stripeEventId: event.id,
      raw: session,
      fulfilledAt: /* @__PURE__ */ new Date()
    });
    const existingPurchase = await db.select().from(purchases).where(eq8(purchases.stripeSessionId, session.id)).limit(1).then((r) => r[0]);
    let purchaseRecord;
    if (!existingPurchase) {
      const inserted = await db.insert(purchases).values({
        stripeSessionId: session.id,
        productKey,
        amount: session.amount_total,
        currency: session.currency,
        customerEmail: session.customer_details?.email ?? null
      });
      purchaseRecord = inserted[0];
    } else {
      purchaseRecord = existingPurchase;
    }
    if (productType === "digital") {
      const token = crypto.randomBytes(24).toString("hex");
      await db.insert(downloads).values({
        orderId: session.id,
        productKey,
        token,
        expiresAt: new Date(Date.now() + 1e3 * 60 * 60 * 24 * 7)
        // 7 days
      });
      console.log("\u{1F4BE} Digital download token created:", token);
    }
    if (productType === "gift") {
      const code = crypto.randomBytes(6).toString("hex").toUpperCase();
      await db.insert(giftCertificates).values({
        purchaseId: purchaseRecord.id,
        productId: productKey,
        // productKey is string; adjust schema if needed
        recipientName: metadata.recipientName || null,
        recipientEmail: metadata.recipientEmail || null,
        message: metadata.message || null,
        generatedCode: code
      });
      console.log("\u{1F381} Gift certificate created with code:", code);
    }
    if (productType === "merch") {
      await db.insert(shippingAddresses).values({
        purchaseId: purchaseRecord.id,
        productId: productKey,
        fullName: metadata.shipping_fullName ?? "",
        addressLine1: metadata.shipping_address1 ?? "",
        addressLine2: metadata.shipping_address2 ?? "",
        city: metadata.shipping_city ?? "",
        state: metadata.shipping_state ?? "",
        postalCode: metadata.shipping_postal ?? "",
        country: metadata.shipping_country ?? ""
      });
      console.log("\u{1F4E6} Shipping address stored for merch order");
    }
    try {
      const relatedPurchases = await db.select().from(purchases).where(eq8(purchases.stripeSessionId, session.id));
      await sendOrderConfirmationEmail({
        order: {
          id: session.id,
          customerEmail: session.customer_details?.email ?? null
        },
        purchases: relatedPurchases
      });
    } catch (err) {
      console.error("\u{1F4E7} Email send error (ignored):", err);
    }
    console.log("\u2705 Order fulfilled:", session.id);
  }
  return res.json({ received: true });
}
var stripe2;
var init_stripe_webhook = __esm({
  "server/stripe-webhook.ts"() {
    init_db();
    init_schema();
    init_email();
    stripe2 = new Stripe2(process.env.STRIPE_SECRET_KEY, {
      apiVersion: "2023-10-16"
    });
  }
});

// server/_core/index.ts
import "dotenv/config";
import express from "express";
import cookieParser from "cookie-parser";
import { createServer } from "http";
import cors from "cors";

// server/routers/admin-auth.ts
init_db();
init_schema();
import { Router } from "express";
import bcrypt from "bcryptjs";
import { eq as eq2 } from "drizzle-orm";

// shared/const.ts
var COOKIE_NAME = "app_session_id";
var ONE_YEAR_MS = 1e3 * 60 * 60 * 24 * 365;

// shared/_core/errors.ts
var HttpError = class extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.name = "HttpError";
  }
};
var ForbiddenError = (msg) => new HttpError(403, msg);

// server/_core/sdk.ts
import { parse as parseCookieHeader } from "cookie";
import { SignJWT, jwtVerify } from "jose";

// server/_core/env.ts
if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET is not set");
}
var ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret: process.env.JWT_SECRET ?? "",
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  stripePublishableKey: process.env.VITE_STRIPE_PUBLISHABLE_KEY ?? "",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  ownerEmail: process.env.OWNER_EMAIL ?? "",
  flodeskApiKey: process.env.FLODESK_API_KEY ?? "",
  flodeskSegmentId: process.env.FLODESK_SEGMENT_ID ?? ""
};

// server/_core/sdk.ts
var isNonEmptyString = (value) => typeof value === "string" && value.length > 0;
var SDKServer = class {
  getSessionSecret() {
    if (!ENV.cookieSecret) {
      throw new Error("COOKIE_SECRET is not set");
    }
    return new TextEncoder().encode(ENV.cookieSecret);
  }
  parseCookies(cookieHeader) {
    if (!cookieHeader) return /* @__PURE__ */ new Map();
    const parsed = parseCookieHeader(cookieHeader);
    return new Map(Object.entries(parsed));
  }
  /**
   * Create a signed session token for an admin user
   */
  async createSessionToken(adminId, options = {}) {
    const issuedAt = Date.now();
    const expiresInMs = options.expiresInMs ?? ONE_YEAR_MS;
    const expirationSeconds = Math.floor((issuedAt + expiresInMs) / 1e3);
    const secretKey = this.getSessionSecret();
    return new SignJWT({
      openId: adminId,
      appId: "admin",
      name: options.name ?? ""
    }).setProtectedHeader({ alg: "HS256", typ: "JWT" }).setExpirationTime(expirationSeconds).sign(secretKey);
  }
  /**
   * Verify session cookie and return admin identity
   */
  async verifySession(cookieValue) {
    if (!cookieValue) return null;
    try {
      const { payload } = await jwtVerify(
        cookieValue,
        this.getSessionSecret(),
        { algorithms: ["HS256"] }
      );
      const { openId, name } = payload;
      if (!isNonEmptyString(openId) || !isNonEmptyString(name)) {
        return null;
      }
      return {
        adminUserId: openId,
        email: name
      };
    } catch {
      return null;
    }
  }
  /**
   * Require an authenticated admin session
   */
  async requireAdmin(req) {
    const cookies = this.parseCookies(req.headers.cookie);
    const sessionCookie = cookies.get(COOKIE_NAME);
    const session = await this.verifySession(sessionCookie);
    if (!session) {
      throw ForbiddenError("Admin authentication required");
    }
    return session;
  }
};
var sdk = new SDKServer();
async function createAdminSession(res, payload) {
  const token = await sdk.createSessionToken(String(payload.adminId), {
    name: payload.email
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: ONE_YEAR_MS
  });
}
function clearAdminSession(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

// server/routers/admin-auth.ts
var adminAuthRouter = Router();
adminAuthRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }
    const admin = await db.select().from(adminUsers).where(eq2(adminUsers.email, email)).limit(1).then((r) => r[0]);
    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    const valid = await bcrypt.compare(password, admin.passwordHash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    console.log("ADMIN LOGIN", {
      email,
      hasHash: Boolean(admin.passwordHash),
      hashPreview: admin.passwordHash?.slice(0, 7)
    });
    console.log("ADMIN SESSION ENV CHECK", {
      hasAdminSecret: Boolean(process.env.ADMIN_SESSION_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasCookieSecret: Boolean(process.env.COOKIE_SECRET)
    });
    await createAdminSession(res, {
      adminId: admin.id,
      email: admin.email
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN LOGIN ERROR", err);
    return res.status(500).json({ error: "Login failed" });
  }
});
adminAuthRouter.post("/logout", async (_req, res) => {
  clearAdminSession(res);
  return res.json({ success: true });
});

// server/routers/admin-orders.ts
import { Router as Router2 } from "express";
init_db();
init_schema();
import { eq as eq3 } from "drizzle-orm";
var adminOrdersRouter = Router2();
adminOrdersRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);
    const result = await db.select({
      id: purchases.id,
      email: purchases.customerEmail,
      productKey: purchases.productKey,
      amount: purchases.amount,
      currency: purchases.currency,
      stripeSessionId: purchases.stripeSessionId,
      createdAt: purchases.createdAt
    }).from(purchases);
    res.json(result);
  } catch (err) {
    console.error("ADMIN ORDERS ERROR:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});
adminOrdersRouter.post("/:id/resend", async (req, res) => {
  try {
    await sdk.requireAdmin(req);
    const id = Number(req.params.id);
    const purchase = await db.select().from(purchases).where(eq3(purchases.id, id)).limit(1).then((r) => r[0]);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    const secret = process.env.DOWNLOAD_WORKER_SECRET;
    if (!secret) {
      throw new Error("Missing DOWNLOAD_WORKER_SECRET");
    }
    await fetch(`${process.env.WORKER_URL}/resend`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-worker-secret": secret
      },
      body: JSON.stringify({ purchaseId: purchase.id })
    });
    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN RESEND ERROR", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});

// server/routers/admin-products.ts
import { Router as Router3 } from "express";

// server/products.ts
var PRODUCTS = {
  // Floating Soundbath Classes
  SOUNDBATH_RESORT: {
    name: "Floating Soundbath - Resort Class",
    description: "Premium floating soundbath experience at luxury resort pools. Includes towel service and blankets.",
    price: 7500,
    // $75.00 in cents
    currency: "usd",
    type: "class"
  },
  SOUNDBATH_PUBLIC: {
    name: "Floating Soundbath - Public Pool Class",
    description: "Floating soundbath experience at public aquatic centers across Arizona and California.",
    price: 4e3,
    // $40.00 in cents
    currency: "usd",
    type: "class"
  },
  // Floating Yoga
  YOGA_CLASS: {
    name: "Floating Yoga Class",
    description: "Paddleboard yoga on the water - a unique blend of fitness and mindfulness.",
    price: 4e3,
    // $40.00 in cents
    currency: "usd",
    type: "class"
  },
  // Digital Products
  SONORAN_ECHOES_CD: {
    name: "Sonoran Echoes CD",
    description: "Physical CD featuring Native American flute and soundbath instruments by Cody Blackbird. Includes shipping.",
    price: 2500,
    // $25.00 in cents
    currency: "usd",
    type: "physical"
  },
  SONORAN_ECHOES_USB: {
    name: "Sonoran Echoes USB + Bonus Tracks",
    description: "USB drive with full album plus exclusive bonus tracks. Includes shipping.",
    price: 3500,
    // $35.00 in cents
    currency: "usd",
    type: "physical"
  },
  SONORAN_ECHOES_DIGITAL: {
    name: "Sonoran Echoes - Digital Download",
    description: "Instant digital download of the complete Sonoran Echoes album in high-quality MP3 format.",
    price: 1500,
    // $15.00 in cents
    currency: "usd",
    type: "digital"
  },
  // Travel Guides
  BLACK_CANYON_GUIDE: {
    name: "Black Canyon Paddleboarding Guide",
    description: "Comprehensive digital guide for paddleboarding Black Canyon with maps, tips, and safety information.",
    price: 500,
    // $5.00 in cents
    currency: "usd",
    type: "digital"
  },
  LEES_FERRY_GUIDE: {
    name: "Lees Ferry Adventure Guide",
    description: "Complete guide for paddleboarding and kayaking at Lees Ferry with route details and local insights.",
    price: 500,
    // $5.00 in cents
    currency: "usd",
    type: "digital"
  },
  // Gift Certificates
  GIFT_CERT_40: {
    name: "Gift Certificate - $40",
    description: "Gift certificate valid for one public pool floating soundbath class.",
    price: 4e3,
    // $40.00 in cents
    currency: "usd",
    type: "gift"
  },
  GIFT_CERT_75: {
    name: "Gift Certificate - $75",
    description: "Gift certificate valid for one resort floating soundbath class.",
    price: 7500,
    // $75.00 in cents
    currency: "usd",
    type: "gift"
  }
};

// server/routers/admin-products.ts
init_db();
init_schema();
var adminProductsRouter = Router3();
adminProductsRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);
    const overrides = await db.select().from(productOverrides);
    const overridesByKey = new Map(overrides.map((o) => [o.productKey, o]));
    const products3 = Object.entries(PRODUCTS).map(([key, base]) => {
      const override = overridesByKey.get(key);
      return {
        productKey: key,
        name: base.name,
        description: base.description,
        currency: base.currency,
        active: override?.active ?? true,
        price: override?.price ?? base.price,
        type: override?.type ?? base.type ?? null,
        hasOverride: Boolean(override)
      };
    });
    return res.json(products3);
  } catch (err) {
    console.error("ADMIN PRODUCTS GET ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});
adminProductsRouter.post("/:productKey", async (req, res) => {
  try {
    await sdk.requireAdmin(req);
    const productKey = req.params.productKey;
    const { active, price, type } = req.body ?? {};
    if (!(productKey in PRODUCTS)) {
      return res.status(404).json({ error: "Invalid product key" });
    }
    await db.insert(productOverrides).values({ productKey, active, price, type }).onDuplicateKeyUpdate({ set: { active, price, type } });
    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN PRODUCT UPDATE ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

// server/routers/checkout.ts
init_db();
init_schema();
import { Router as Router4 } from "express";
import { eq as eq4 } from "drizzle-orm";
import Stripe from "stripe";
var checkoutRouter = Router4();
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2023-10-16"
});
checkoutRouter.post("/", async (req, res) => {
  try {
    const { productKey, sessionId } = req.body;
    if (!productKey) {
      return res.status(400).json({ error: "Missing productKey" });
    }
    const product = await db.select().from(products).where(eq4(products.productKey, productKey)).limit(1).then((r) => r[0]);
    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }
    let session = null;
    if (sessionId) {
      session = await db.select().from(classSessions).where(eq4(classSessions.id, sessionId)).limit(1).then((r) => r[0]);
      if (!session) {
        return res.status(400).json({ error: "Session not found" });
      }
      if (session.seatsAvailable < 1) {
        return res.status(400).json({ error: "This session is sold out" });
      }
    }
    const stripeSession = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.FRONTEND_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: product.price,
            product_data: {
              name: product.name
            }
          },
          quantity: 1
        }
      ],
      metadata: {
        productId: product.id,
        sessionId: session?.id || "",
        productKey
      }
    });
    return res.json({ url: stripeSession.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    res.status(500).json({ error: "Something went wrong" });
  }
});

// server/downloads/downloads.router.ts
init_db();
init_schema();
import { Router as Router5 } from "express";
import { eq as eq5 } from "drizzle-orm";
var downloadsRouter = Router5();
downloadsRouter.get("/:purchaseId", async (req, res) => {
  try {
    const purchaseId = Number(req.params.purchaseId);
    if (Number.isNaN(purchaseId)) {
      return res.status(400).send("Invalid purchase id");
    }
    const purchase = await db.select().from(purchases).where(eq5(purchases.id, purchaseId)).limit(1).then((r) => r[0]);
    if (!purchase) {
      return res.status(404).send("Download not found");
    }
    const order = await db.select().from(orders).where(eq5(orders.id, purchase.stripeSessionId)).limit(1).then((r) => r[0]);
    if (!order || order.status !== "fulfilled") {
      return res.status(403).send("Not authorized");
    }
    const workerBaseUrl = process.env.DOWNLOAD_WORKER_URL;
    if (!workerBaseUrl) {
      console.error("DOWNLOAD_WORKER_URL not set");
      return res.status(500).send("Download unavailable");
    }
    const workerUrl = `${workerBaseUrl}/download/${purchase.id}`;
    return res.redirect(workerUrl);
  } catch (err) {
    console.error("DOWNLOAD ENTRY ERROR", err);
    return res.status(500).send("Download unavailable");
  }
});
downloadsRouter.get("/verify/:purchaseId", async (req, res) => {
  try {
    const workerSecret = req.header("x-worker-secret");
    if (!workerSecret || workerSecret !== process.env.DOWNLOAD_WORKER_SECRET) {
      return res.status(401).json({ error: "Unauthorized worker" });
    }
    const purchaseId = Number(req.params.purchaseId);
    if (Number.isNaN(purchaseId)) {
      return res.status(400).json({ error: "Invalid purchase id" });
    }
    const purchase = await db.select().from(purchases).where(eq5(purchases.id, purchaseId)).limit(1).then((r) => r[0]);
    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }
    const order = await db.select().from(orders).where(eq5(orders.id, purchase.stripeSessionId)).limit(1).then((r) => r[0]);
    if (!order || order.status !== "fulfilled") {
      return res.status(403).json({ error: "Not fulfilled" });
    }
    const objectKeyByProduct = {
      SONORAN_ECHOES_DIGITAL: "sonoran-echoes.zip",
      BLACK_CANYON_GUIDE: "black-canyon-guide.pdf",
      LEES_FERRY_GUIDE: "lees-ferry-guide.pdf"
    };
    const objectKey = objectKeyByProduct[purchase.productKey];
    if (!objectKey) {
      return res.status(500).json({
        error: `No file mapped for product ${purchase.productKey}`
      });
    }
    return res.json({
      ok: true,
      purchaseId,
      productKey: purchase.productKey,
      objectKey
    });
  } catch (err) {
    console.error("DOWNLOAD VERIFY ERROR", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});

// server/routers/downloads.worker.router.ts
init_db();
init_schema();
import { Router as Router6 } from "express";
import { eq as eq6 } from "drizzle-orm";
var downloadsWorkerRouter = Router6();
var PRODUCT_TO_OBJECT_KEY = {
  SONORAN_ECHOES_DIGITAL: "digital/sonoran-echoes.zip",
  BLACK_CANYON_GUIDE: "guides/black-canyon.pdf",
  LEES_FERRY_GUIDE: "guides/lees-ferry.pdf"
  // add the rest here as you upload them
};
function requireWorker(req) {
  const secret = req.headers["x-worker-secret"];
  if (!secret || secret !== process.env.DOWNLOAD_WORKER_SECRET) {
    return false;
  }
  return true;
}
downloadsWorkerRouter.get("/verify/:purchaseId", async (req, res) => {
  try {
    if (!requireWorker(req)) {
      return res.status(401).send("Unauthorized");
    }
    const { purchaseId } = req.params;
    const purchase = await db.select().from(purchases).where(eq6(purchases.id, purchaseId)).limit(1).then((r) => r[0]);
    if (!purchase) {
      return res.status(404).send("Purchase not found");
    }
    const order = await db.select().from(orders).where(eq6(orders.id, purchase.orderId)).limit(1).then((r) => r[0]);
    if (!order || order.status !== "fulfilled") {
      return res.status(403).send("Not authorized");
    }
    const objectKey = PRODUCT_TO_OBJECT_KEY[purchase.productKey];
    if (!objectKey) {
      return res.status(500).send("No file mapped for this product");
    }
    return res.json({
      ok: true,
      purchaseId: purchase.id,
      productKey: purchase.productKey,
      objectKey
    });
  } catch (err) {
    console.error("DOWNLOAD VERIFY ERROR", err);
    return res.status(500).send("Download unavailable");
  }
});

// server/_core/index.ts
init_db();
init_schema();
import { eq as eq9 } from "drizzle-orm";

// server/routers/gift-certificates.ts
init_db();
init_schema();
import { Router as Router7 } from "express";
import { randomBytes } from "crypto";
var giftCertificatesRouter = Router7();
function generateCode() {
  return randomBytes(6).toString("hex").toUpperCase();
}
giftCertificatesRouter.post("/create", async (req, res) => {
  try {
    const { purchaseId, productId, recipientName, recipientEmail, message } = req.body;
    const code = generateCode();
    await db.insert(giftCertificates).values({
      purchaseId,
      productId,
      recipientName,
      recipientEmail,
      message,
      generatedCode: code
    });
    res.json({ success: true, code });
  } catch (err) {
    console.error("GIFT CERT ERROR", err);
    res.status(500).json({ error: "Failed to create gift certificate" });
  }
});

// server/routers/shipping.ts
init_db();
init_schema();
import { Router as Router8 } from "express";
var shippingRouter = Router8();
shippingRouter.post("/create", async (req, res) => {
  try {
    const { purchaseId, productId, fullName, addressLine1, addressLine2, city, state, postalCode, country } = req.body;
    await db.insert(shippingAddresses).values({
      purchaseId,
      productId,
      fullName,
      addressLine1,
      addressLine2,
      city,
      state,
      postalCode,
      country
    });
    res.json({ success: true });
  } catch (err) {
    console.error("SHIPPING ERROR", err);
    res.status(500).json({ error: "Failed to save shipping address" });
  }
});

// server/routers/public-store.ts
init_db();
init_schema();
import { Router as Router9 } from "express";
var publicStoreRouter = Router9();
publicStoreRouter.get("/products", async (_req, res) => {
  try {
    const giftRows = await db.select().from(giftCertificates);
    const downloadRows = await db.select().from(downloads);
    const merchRows = [];
    const giftMapped = giftRows.map((g) => ({
      type: "gift_certificate",
      id: g.id,
      productKey: g.productKey,
      name: g.name,
      description: g.description,
      price: g.price,
      imageUrl: g.imageUrl
    }));
    const downloadMapped = downloadRows.map((d) => ({
      type: "download",
      id: d.id,
      productKey: d.productKey,
      name: d.name,
      description: d.description,
      price: d.price,
      imageUrl: d.imageUrl
    }));
    const merchMapped = merchRows;
    return res.json([...giftMapped, ...downloadMapped, ...merchMapped]);
  } catch (err) {
    console.error("STORE PRODUCTS PUBLIC ERROR", err);
    return res.status(500).json({ error: "Failed to load store products" });
  }
});

// server/routers/public-classes.ts
init_db();
init_schema();
import { Router as Router10 } from "express";
import { eq as eq7 } from "drizzle-orm";
var publicClassesRouter = Router10();
publicClassesRouter.get("/products", async (_req, res) => {
  try {
    const items = await db.select().from(classProducts);
    return res.json(items);
  } catch (err) {
    console.error("PUBLIC CLASS PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load class products" });
  }
});
publicClassesRouter.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await db.select().from(classProducts).where(eq7(classProducts.id, id)).then((r) => r[0]);
    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error("PUBLIC CLASS PRODUCT ERROR", err);
    return res.status(500).json({ error: "Failed to load class product" });
  }
});
publicClassesRouter.get("/products/:id/sessions", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const sessions = await db.select().from(classSessions).where(eq7(classSessions.classProductId, id));
    return res.json(sessions);
  } catch (err) {
    console.error("PUBLIC CLASS SESSIONS ERROR", err);
    return res.status(500).json({ error: "Failed to load class sessions" });
  }
});
publicClassesRouter.get("/sessions/:sessionId", async (req, res) => {
  try {
    const id = Number(req.params.sessionId);
    const session = await db.select().from(classSessions).where(eq7(classSessions.id, id)).then((r) => r[0]);
    if (!session) return res.status(404).json({ error: "Not found" });
    return res.json(session);
  } catch (err) {
    console.error("PUBLIC CLASS SESSION ERROR", err);
    return res.status(500).json({ error: "Failed to load class session" });
  }
});

// server/_core/index.ts
console.log("\u{1F525} CLEAN EXPRESS API INITIALIZING\u2026");
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));
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
  const { handleStripeWebhook: handleStripeWebhook2 } = await Promise.resolve().then(() => (init_stripe_webhook(), stripe_webhook_exports));
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    handleStripeWebhook2
  );
  app.use("/admin", adminAuthRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/products", adminProductsRouter);
  app.use("/admin/class-products", classProductsRouter);
  app.use("/admin/class-sessions", classSessionsRouter);
  app.use("/store", publicStoreRouter);
  app.use("/classes", publicClassesRouter);
  app.use("/gift-certificates", giftCertificatesRouter);
  app.use("/shipping", shippingRouter);
  app.use("/checkout", checkoutRouter);
  app.use("/downloads", downloadsRouter);
  app.use("/worker", downloadsWorkerRouter);
  app.get("/success", async (req, res) => {
    try {
      const sessionId = req.query.session_id;
      if (!sessionId) return res.status(400).send("Missing session");
      const purchase = await db.select().from(purchases).where(eq9(purchases.stripeSessionId, sessionId)).limit(1).then((r) => r[0]);
      if (!purchase)
        return res.status(404).send("Purchase not found. Contact support.");
      res.setHeader("Content-Type", "text/html");
      return res.send(`
        <!DOCTYPE html>
        <html>
        <body>
          <h1>\u{1F389} Purchase successful</h1>
          <a href="/downloads/${purchase.id}">Download your file</a>
        </body>
        </html>
      `);
    } catch (err) {
      console.error("SUCCESS PAGE ERROR", err);
      return res.status(500).send("Something went wrong");
    }
  });
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
  app.get("/cancel", (_req, res) => {
    res.send("\u274C Payment cancelled");
  });
  const port = parseInt(process.env.PORT || "3000", 10);
  server.listen(port, () => {
    console.log(`\u{1F680} Server running on port ${port}`);
  });
}
startServer().catch(console.error);
