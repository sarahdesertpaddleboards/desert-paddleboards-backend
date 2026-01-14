var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/_core/index.ts
import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { createServer } from "http";

// server/routers/admin-auth.ts
import { Router } from "express";
import bcrypt from "bcryptjs";

// server/db.ts
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

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
var adminUsers = mysqlTable("admin_users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull()
});
var products = mysqlTable("products", {
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
var productOverrides = mysqlTable("product_overrides", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  overrideName: varchar("override_name", { length: 255 }),
  overridePrice: int("override_price")
});
var orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  fulfilled: boolean("fulfilled").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow()
});
var downloads = mysqlTable("downloads", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id").notNull(),
  fileKey: varchar("file_key", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
var giftCertificates = mysqlTable("gift_certificates", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  productId: int("product_id").notNull(),
  amount: int("amount").notNull(),
  redeemed: boolean("redeemed").default(false),
  createdAt: timestamp("created_at").defaultNow()
});
var shippingAddresses = mysqlTable("shipping_addresses", {
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
var classProducts = mysqlTable("class_products", {
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
var classSessions = mysqlTable("class_sessions", {
  id: int("id").primaryKey().autoincrement(),
  classProductId: int("class_product_id").notNull().references(() => classProducts.id),
  startTime: datetime("start_time").notNull(),
  endTime: datetime("end_time").notNull(),
  seatsTotal: int("seats_total").notNull(),
  seatsAvailable: int("seats_available").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});

// server/db.ts
import { eq } from "drizzle-orm";
var pool = mysql.createPool({
  uri: process.env.DATABASE_URL,
  connectionLimit: 5
});
var db = drizzle(pool, {
  schema: schema_exports,
  mode: "default"
});

// server/routers/admin-auth.ts
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

// server/routers/store.public.ts
import { Router as Router3 } from "express";
import { eq as eq4 } from "drizzle-orm";
var router = Router3();
router.get("/", async (_req, res) => {
  try {
    const items = await db.select().from(productOverrides);
    res.json(items);
  } catch (err) {
    console.error("STORE PUBLIC LIST ERROR", err);
    res.status(500).json({ error: "Failed to load store products" });
  }
});
router.get("/:key", async (req, res) => {
  try {
    const key = req.params.key;
    const item = await db.select().from(productOverrides).where(eq4(productOverrides.productKey, key)).then((r) => r[0]);
    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("STORE PUBLIC GET ERROR", err);
    res.status(500).json({ error: "Failed to load item" });
  }
});
var store_public_default = router;

// server/routers/store.admin.ts
import { Router as Router4 } from "express";
import { eq as eq5 } from "drizzle-orm";

// server/_core/requireAdmin.ts
import jwt from "jsonwebtoken";
function requireAdmin(req, res, next) {
  try {
    const token = req.cookies.adminToken;
    if (!token) return res.status(401).json({ error: "Admin authentication required" });
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!payload) return res.status(401).json({ error: "Invalid token" });
    next();
  } catch (err) {
    return res.status(401).json({ error: "Admin authentication required" });
  }
}

// server/routers/store.admin.ts
var router2 = Router4();
router2.get("/", requireAdmin, async (_req, res) => {
  const items = await db.select().from(productOverrides);
  res.json(items);
});
router2.post("/", requireAdmin, async (req, res) => {
  try {
    const data = req.body;
    const [item] = await db.insert(productOverrides).values(data).returning();
    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN CREATE ERROR", err);
    res.status(500).json({ error: "Failed to create store product" });
  }
});
router2.patch("/:id", requireAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);
    const [item] = await db.update(productOverrides).set(req.body).where(eq5(productOverrides.id, id)).returning();
    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN UPDATE ERROR", err);
    res.status(500).json({ error: "Failed to update store product" });
  }
});
router2.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(productOverrides).where(eq5(productOverrides.id, id));
  res.json({ ok: true });
});
var store_admin_default = router2;

// server/routers/classes.public.ts
import { Router as Router5 } from "express";
import { eq as eq6 } from "drizzle-orm";
var router3 = Router5();
router3.get("/", async (_req, res) => {
  const list = await db.select().from(classProducts);
  res.json(list);
});
router3.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const item = await db.select().from(classProducts).where(eq6(classProducts.id, id)).then((r) => r[0]);
  if (!item) return res.status(404).json({ error: "Not found" });
  res.json(item);
});
var classes_public_default = router3;

// server/routers/classes.admin.ts
import { Router as Router6 } from "express";
import { eq as eq7 } from "drizzle-orm";
var router4 = Router6();
router4.get("/", requireAdmin, async (_req, res) => {
  const rows = await db.select().from(classProducts);
  res.json(rows);
});
router4.post("/", requireAdmin, async (req, res) => {
  const [row] = await db.insert(classProducts).values(req.body).returning();
  res.json(row);
});
router4.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(classProducts).set(req.body).where(eq7(classProducts.id, id)).returning();
  res.json(row);
});
router4.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(classProducts).where(eq7(classProducts.id, id));
  res.json({ ok: true });
});
var classes_admin_default = router4;

// server/routers/sessions.public.ts
import { Router as Router7 } from "express";
import { eq as eq8 } from "drizzle-orm";
var router5 = Router7();
router5.get("/", async (_req, res) => {
  const list = await db.select().from(classSessions);
  res.json(list);
});
router5.get("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const row = await db.select().from(classSessions).where(eq8(classSessions.id, id)).then((r) => r[0]);
  if (!row) return res.status(404).json({ error: "Not found" });
  res.json(row);
});
var sessions_public_default = router5;

// server/routers/sessions.admin.ts
import { Router as Router8 } from "express";
import { eq as eq9 } from "drizzle-orm";
var router6 = Router8();
router6.get("/", requireAdmin, async (_req, res) => {
  const list = await db.select().from(classSessions);
  res.json(list);
});
router6.post("/", requireAdmin, async (req, res) => {
  const [row] = await db.insert(classSessions).values(req.body).returning();
  res.json(row);
});
router6.patch("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const [row] = await db.update(classSessions).set(req.body).where(eq9(classSessions.id, id)).returning();
  res.json(row);
});
router6.delete("/:id", requireAdmin, async (req, res) => {
  const id = Number(req.params.id);
  await db.delete(classSessions).where(eq9(classSessions.id, id));
  res.json({ ok: true });
});
var sessions_admin_default = router6;

// server/routers/checkout.ts
import { Router as Router9 } from "express";
import Stripe from "stripe";
var router7 = Router9();
var stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20"
});
router7.post("/create", async (req, res) => {
  try {
    const { productId, productType, quantity, email, name } = req.body;
    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: productId.price,
            product_data: {
              name
            }
          },
          quantity
        }
      ],
      mode: "payment",
      success_url: `${process.env.FRONTEND_BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_BASE_URL}/cancel`
    });
    res.json({ url: session.url });
  } catch (err) {
    console.error("CHECKOUT ERROR", err);
    res.status(500).json({ error: "Failed to create checkout session" });
  }
});
var checkout_default = router7;

// server/_core/index.ts
console.log("\u{1F525} CLEAN EXPRESS API INITIALIZING\u2026");
async function startServer() {
  const app = express();
  const server = createServer(app);
  app.set("trust proxy", 1);
  app.use(cookieParser());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(
    cors({
      origin: [
        "http://localhost:5173",
        "https://desertpaddleboards.vercel.app"
      ],
      credentials: true
    })
  );
  app.use("/admin", adminAuthRouter);
  app.use("/admin/orders", adminOrdersRouter);
  app.use("/admin/store/products", store_admin_default);
  app.use("/admin/classes/products", classes_admin_default);
  app.use("/admin/classes/sessions", sessions_admin_default);
  app.use("/store/products", store_public_default);
  app.use("/classes/products", classes_public_default);
  app.use("/classes/sessions", sessions_public_default);
  app.use("/checkout", checkout_default);
  app.get("/health", (_req, res) => res.json({ ok: true }));
  const port = parseInt(process.env.PORT || "8080", 10);
  server.listen(port, () => console.log(`\u{1F680} Running on port ${port}`));
}
startServer().catch(console.error);
