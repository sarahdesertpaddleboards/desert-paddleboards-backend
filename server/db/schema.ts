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
// PRODUCT OVERRIDES (legacy dynamic pricing)
// ---------------------------------------------------------
export const productOverrides = mysqlTable("product_overrides", {
  id: int("id").primaryKey().autoincrement(),
  productId: int("product_id").notNull(),
  overrideName: varchar("override_name", { length: 255 }),
  overrideDescription: text("override_description"),
  overridePrice: int("override_price"),
});

// ---------------------------------------------------------
// ORDERS (webhook-driven canonical record)
// Matches MySQL: orders (id varchar PK, product_key, amount, currency, status, customer_email, stripe_event_id, raw, fulfilled_at, created_at)
// ---------------------------------------------------------
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 255 }).primaryKey(), // Stripe session id (cs_...)
  productKey: varchar("product_key", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  status: varchar("status", { length: 32 }).notNull(), // "paid" | "fulfilled" etc
  customerEmail: varchar("customer_email", { length: 255 }),
  stripeEventId: varchar("stripe_event_id", { length: 255 }).notNull(), // idempotency key
  raw: text("raw").notNull(), // store JSON as string to avoid mysql json typing issues in app layer
  fulfilledAt: timestamp("fulfilled_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// ---------------------------------------------------------
// PURCHASES (legacy table you already have)
// Matches MySQL: purchases (id int PK, stripe_session_id UNIQUE, product_key, amount, currency, customer_email, created_at)
// ---------------------------------------------------------
export const purchases = mysqlTable("purchases", {
  id: int("id").primaryKey().autoincrement(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull(),
  productKey: varchar("product_key", { length: 64 }).notNull(),
  amount: int("amount").notNull(),
  currency: varchar("currency", { length: 10 }).notNull(),
  customerEmail: varchar("customer_email", { length: 255 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// ---------------------------------------------------------
// DOWNLOADS (token-based secure download links)
// Matches MySQL: downloads (id int PK, order_id, product_key, token UNIQUE, used_at, expires_at, created_at)
// ---------------------------------------------------------
export const downloads = mysqlTable("downloads", {
  id: int("id").primaryKey().autoincrement(),
  orderId: varchar("order_id", { length: 255 }).notNull(),
  productKey: varchar("product_key", { length: 64 }).notNull(),
  token: varchar("token", { length: 64 }).notNull(),
  usedAt: timestamp("used_at"),
  expiresAt: timestamp("expires_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});
// ---------------------------------------------------------
// GIFT CERTIFICATES
// ---------------------------------------------------------
export const giftCertificates = mysqlTable("gift_certificates", {
  id: int("id").primaryKey().autoincrement(),
  code: varchar("code", { length: 100 }).notNull().unique(),
  productId: int("product_id").notNull(),
  originalAmount: int("original_amount").notNull(),
  remainingAmount: int("remaining_amount").notNull(),
  currency: varchar("currency", { length: 10 }).default("usd"),
  purchaserEmail: varchar("purchaser_email", { length: 255 }),
  recipientName: varchar("recipient_name", { length: 255 }),
  recipientEmail: varchar("recipient_email", { length: 255 }),
  message: text("message"),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }),
  status: varchar("status", { length: 50 }).default("active"),
  redeemed: boolean("redeemed").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
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
// VENUES (where sessions happen)
// This is the new table we will seed from your real locations list.
// ---------------------------------------------------------
export const venues = mysqlTable("venues", {
  id: int("id").primaryKey().autoincrement(),

  // Stable key for URLs and matching during seeding
  slug: varchar("slug", { length: 255 }).notNull().unique(),

  // Display fields
  name: varchar("name", { length: 255 }).notNull(),
  addressLine: varchar("address_line", { length: 255 }).notNull(), // "5445 N. Hayden Road"
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 20 }).notNull(), // "AZ", "CA"
  postalCode: varchar("postal_code", { length: 20 }),

  // Optional callouts/notes like “NEW SCOTTSDALE LOCATION!” or “We provide blankets…”
  callout: text("callout"),
  notes: text("notes"),

  // We'll need this later for correct calendar display and checkout cutoff times
  timezone: varchar("timezone", { length: 64 })
    .notNull()
    .default("America/Phoenix"),

  active: boolean("active").default(true),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// CLASS PRODUCTS (your modern design)
// ---------------------------------------------------------
export const classProducts = mysqlTable("class_products", {
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

  // New: venueId is nullable for now, so old data does not break.
  // After we seed properly, we can backfill and make it notNull.
  venueId: int("venue_id").references(() => venues.id),

  startTime: datetime("start_time").notNull(),
  endTime: datetime("end_time").notNull(),
  seatsTotal: int("seats_total").notNull(),
  seatsAvailable: int("seats_available").notNull(),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// BOOKING DETAILS (post-checkout group info / special requests)
// ---------------------------------------------------------
export const bookingDetails = mysqlTable("booking_details", {
  id: int("id").primaryKey().autoincrement(),
  stripeSessionId: varchar("stripe_session_id", { length: 255 }).notNull().unique(),
  specialRequests: text("special_requests"),
  participantsJson: text("participants_json"),
  updatedAt: timestamp("updated_at").defaultNow(),
  createdAt: timestamp("created_at").defaultNow(),
});
