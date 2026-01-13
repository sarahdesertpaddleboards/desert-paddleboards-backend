import {
  mysqlTable,
  varchar,
  int,
  text,
  boolean,
  datetime,
  timestamp,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------
// ADMIN USERS
// ---------------------------------------------------------
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
});

// ---------------------------------------------------------
// CORE PRODUCTS (digital, physical, gift, class)
// ---------------------------------------------------------
export const products = mysqlTable("products", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// PRODUCT OVERRIDES (legacy dynamic pricing) um
// ---------------------------------------------------------
export const productOverrides = mysqlTable("product_overrides", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  overrideName: varchar("override_name", { length: 255 }),
  overridePrice: int("override_price"),
});

// ---------------------------------------------------------
// ORDERS (physical shipping + general purchases)
// ---------------------------------------------------------
export const orders = mysqlTable("orders", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  productId: int("product_id").notNull(),
  quantity: int("quantity").default(1),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  fulfilled: boolean("fulfilled").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// PURCHASES (digital downloads)
// ---------------------------------------------------------
export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// DIGITAL DOWNLOADS
// ---------------------------------------------------------
export const downloads = mysqlTable("downloads", {
  id: int("id").primaryKey().autoincrement(),
  purchaseId: int("purchase_id").notNull(),
  fileKey: varchar("file_key", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// GIFT CERTIFICATES
// ---------------------------------------------------------
export const giftCertificates = mysqlTable("gift_certificates", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  productId: int("product_id").notNull(),
  amount: int("amount").notNull(),
  redeemed: boolean("redeemed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// SHIPPING ADDRESSES (for merch)
// ---------------------------------------------------------
export const shippingAddresses = mysqlTable("shipping_addresses", {
  id: int("id").primaryKey().autoincrement(),
  orderId: int("order_id").notNull(),
  fullName: varchar("full_name", { length: 255 }).notNull(),
  address1: varchar("address1", { length: 255 }).notNull(),
  address2: varchar("address2", { length: 255 }),
  city: varchar("city", { length: 255 }).notNull(),
  region: varchar("region", { length: 255 }),
  postalCode: varchar("postal_code", { length: 50 }).notNull(),
  country: varchar("country", { length: 100 }).notNull(),
});

// ---------------------------------------------------------
// CLASS PRODUCTS (your modern design)
// ---------------------------------------------------------
export const classProducts = mysqlTable("class_products", {
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
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// CLASS SESSIONS (calendar based)
// ---------------------------------------------------------
export const classSessions = mysqlTable("class_sessions", {
  id: int("id").primaryKey().autoincrement(),
  classProductId: int("class_product_id")
    .notNull()
    .references(() => classProducts.id),
  startTime: datetime("start_time").notNull(),
  endTime: datetime("end_time").notNull(),
  seatsTotal: int("seats_total").notNull(),
  seatsAvailable: int("seats_available").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
