import {
  mysqlTable,
  varchar,
  int,
  text,
  datetime,
  boolean,
  timestamp,
} from "drizzle-orm/mysql-core";

// ---------------------------------------------------------
// ADMIN USERS (still needed for admin login)
// ---------------------------------------------------------
export const adminUsers = mysqlTable("admin_users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
});

// ---------------------------------------------------------
// CORE PRODUCTS (gift cards, merch, downloads)
// ---------------------------------------------------------
export const products = mysqlTable("products", {
  id: int("id").primaryKey().autoincrement(),
  productKey: varchar("product_key", { length: 255 }).notNull().unique(),
  type: varchar("type", { length: 50 }).notNull(), // “digital”, “physical”, “gift”, “class”
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  price: int("price").notNull(), // cents
  currency: varchar("currency", { length: 10 }).default("usd"),
  imageUrl: varchar("image_url", { length: 500 }),
  active: boolean("active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// PRODUCT OVERRIDES (legacy, still referenced)
// ---------------------------------------------------------
export const productOverrides = mysqlTable("product_overrides", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  overrideName: varchar("override_name", { length: 255 }),
  overridePrice: int("override_price"),
});

// ---------------------------------------------------------
// PURCHASES
// ---------------------------------------------------------
export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  email: varchar("email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// CLASS PRODUCTS (YOUR MODERN VERSION)
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
// CLASS SESSIONS (YOUR MODERN VERSION)
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
