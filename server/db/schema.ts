import {
  mysqlTable,
  varchar,
  int,
  timestamp,
  boolean,
  json,
} from "drizzle-orm/mysql-core";



export const adminUsers = mysqlTable("admin_users", {
  id: int("id").primaryKey().autoincrement(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  createdAt: timestamp("created_at").defaultNow()
});
export const productOverrides = mysqlTable("product_overrides", {
  productKey: varchar("product_key", { length: 64 })
    .primaryKey(),

  active: boolean("active")
    .notNull()
    .default(true),

  price: int("price"),

  /**
   * Controls delivery behavior
   * - digital → download
   * - booking → calendar / scheduling
   * - gift → email voucher
   */
  type: varchar("type", { length: 32 }),

  updatedAt: timestamp("updated_at")
    .notNull()
    .defaultNow()
    .onUpdateNow(),
});


export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),

  stripeSessionId: varchar("stripe_session_id", { length: 255 })
    .notNull()
    .unique(),

  productKey: varchar("product_key", { length: 64 }).notNull(),

  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),

  customerEmail: varchar("customer_email", { length: 255 }),

  createdAt: timestamp("created_at").defaultNow(),
});
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 255 }).primaryKey(),

  productKey: varchar("product_key", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),

  status: varchar("status", { length: 32 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),

  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull(),
  raw: json("raw").notNull(),

  fulfilledAt: timestamp("fulfilled_at"), // 👈 NEW

  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const downloads = mysqlTable("downloads", {
  id: int("id").primaryKey().autoincrement(),

  orderId: varchar("order_id", { length: 255 }).notNull(),
  productKey: varchar("product_key", { length: 64 }).notNull(),

  token: varchar("token", { length: 64 }).notNull().unique(),

  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),

  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// -----------------------------------------
// CLASS PRODUCTS (OPTION B)
// -----------------------------------------
export const classProducts = mysqlTable("class_products", {
  id: int("id").primaryKey().autoincrement(),

  productKey: varchar("product_key", { length: 64 }).notNull().unique(),

  name: varchar("name", { length: 255 }).notNull(),
  description: varchar("description", { length: 2000 }),

  price: int("price").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),

  imageUrl: varchar("image_url", { length: 500 }),

  capacity: int("capacity").notNull().default(1),

  active: boolean("active").notNull().default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow().onUpdateNow(),
});

// -----------------------------------------
// CLASS SESSIONS
// -----------------------------------------
export const classSessions = mysqlTable("class_sessions", {
  id: int("id").primaryKey().autoincrement(),

  classProductId: int("class_product_id").notNull(),
  
  startTime: timestamp("start_time").notNull(),
  endTime: timestamp("end_time"),

  seatsTotal: int("seats_total").notNull(),
  seatsAvailable: int("seats_available").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
});
