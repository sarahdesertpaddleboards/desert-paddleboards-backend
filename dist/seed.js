var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

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
  shippingAddresses: () => shippingAddresses,
  venues: () => venues
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
  id: varchar("id", { length: 255 }).primaryKey(),
  // Stripe session id (cs_...)
  productKey: varchar("product_key", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(),
  // "paid" | "fulfilled" etc
  customerEmail: varchar("customer_email", { length: 255 }),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull(),
  // idempotency key
  raw: text("raw").notNull(),
  // store JSON as string to avoid mysql json typing issues in app layer
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
});
var purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  productKey: varchar("product_key", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow()
});
var downloads = mysqlTable("downloads", {
  id: int("id").primaryKey().autoincrement(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  productKey: varchar("product_key", { length: 64 }).notNull(),
  token: varchar("token", { length: 64 }).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull()
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
var venues = mysqlTable("venues", {
  id: int("id").primaryKey().autoincrement(),
  // Stable key for URLs and matching during seeding
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  // Display fields
  name: varchar("name", { length: 255 }).notNull(),
  addressLine: varchar("address_line", { length: 255 }).notNull(),
  // "5445 N. Hayden Road"
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 20 }).notNull(),
  // "AZ", "CA"
  postalCode: varchar("postal_code", { length: 20 }),
  // Optional callouts/notes like “NEW SCOTTSDALE LOCATION!” or “We provide blankets…”
  callout: text("callout"),
  notes: text("notes"),
  // We'll need this later for correct calendar display and checkout cutoff times
  timezone: varchar("timezone", { length: 64 }).notNull().default("America/Phoenix"),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow()
});
var classProducts = mysqlTable("class_products", {
  id: int("id").primaryKey().autoincrement(),
  // Make this notNull so productKey is reliable and seedable
  productKey: varchar("product_key", { length: 128 }).notNull(),
  productType: varchar("product_type", { length: 50 }).notNull(),
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
  // New: venueId is nullable for now, so old data does not break.
  // After we seed properly, we can backfill and make it notNull.
  venueId: int("venue_id").references(() => venues.id),
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

// server/seed.ts
import { eq as eq2 } from "drizzle-orm";
async function seed() {
  console.log("\u{1F331} Seeding database...");
  await db.delete(classSessions);
  await db.delete(classProducts);
  const productKey = "beginner-paddle";
  await db.insert(classProducts).values({
    productKey,
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
    price: 7500,
    currency: "USD",
    capacity: 10,
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    active: true,
    productType: "class"
  });
  const [product] = await db.select().from(classProducts).where(eq2(classProducts.productKey, productKey)).limit(1);
  if (!product) {
    throw new Error("Seed failed: could not re-fetch class product after insert");
  }
  const now = /* @__PURE__ */ new Date();
  const start = new Date(now.getTime());
  const end = new Date(now.getTime() + 90 * 60 * 1e3);
  await db.insert(classSessions).values({
    classProductId: product.id,
    startTime: start,
    endTime: end,
    seatsTotal: product.capacity ?? 10,
    seatsAvailable: product.capacity ?? 10
  });
  console.log("\u2705 Seed complete: class_products + class_sessions");
}
seed().then(() => process.exit(0)).catch((err) => {
  console.error("\u274C Seed failed:", err);
  process.exit(1);
});
