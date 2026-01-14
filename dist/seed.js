var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/seed.ts
import "dotenv/config";

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

// server/seed.ts
async function seed() {
  console.log("\u{1F331} Seeding database...");
  await db.delete(classSessions);
  await db.delete(classProducts);
  await db.delete(productOverrides);
  const paddleClass = await db.insert(classProducts).values({
    productKey: "beginner-paddle",
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
    price_cents: 7500,
    currency: "USD",
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    capacity: 10
  }).returning();
  await db.insert(classSessions).values({
    classProductKey: "beginner-paddle",
    startTime: new Date(Date.now() + 864e5).toISOString(),
    availability: 10
  });
  await db.insert(productOverrides).values({
    key: "gift-card-50",
    type: "gift-card",
    name: "Gift Card - 50 USD",
    description: "Perfect gift!",
    price_cents: 5e3,
    currency: "USD"
  });
  console.log("\u{1F331} Done.");
}
seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
