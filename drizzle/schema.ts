import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull()
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Locations where classes/events are held
 */
export const locations = mysqlTable("locations", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  address: text("address").notNull(),
  city: varchar("city", { length: 100 }).notNull(),
  state: varchar("state", { length: 2 }).notNull(), // AZ, CA
  zipCode: varchar("zipCode", { length: 10 }),
  type: mysqlEnum("type", ["public_pool", "resort", "outdoor"]).notNull(),
  description: text("description"),
  amenities: text("amenities"), // JSON string of amenities
  imageUrl: text("imageUrl"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Location = typeof locations.$inferSelect;
export type InsertLocation = typeof locations.$inferInsert;

/**
 * Event types/classes offered
 */
export const eventTypes = mysqlTable("eventTypes", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(), // "Floating Soundbath", "Floating Yoga", etc.
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  duration: int("duration").notNull(), // minutes
  publicPrice: int("publicPrice").notNull(), // cents
  resortPrice: int("resortPrice").notNull(), // cents
  maxCapacity: int("maxCapacity").notNull(),
  imageUrl: text("imageUrl"),
  whatToBring: text("whatToBring"), // JSON array of items
  whatToExpect: text("whatToExpect"),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type EventType = typeof eventTypes.$inferSelect;
export type InsertEventType = typeof eventTypes.$inferInsert;

/**
 * Scheduled events/classes
 */
export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  eventTypeId: int("eventTypeId").notNull(),
  locationId: int("locationId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  startTime: timestamp("startTime").notNull(),
  endTime: timestamp("endTime").notNull(),
  price: int("price").notNull(), // cents
  maxCapacity: int("maxCapacity").notNull(),
  currentBookings: int("currentBookings").default(0).notNull(),
  status: mysqlEnum("status", ["scheduled", "cancelled", "completed"]).default("scheduled").notNull(),
  notes: text("notes"),
  externalBookingUrl: text("externalBookingUrl"), // For city-run bookings
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

/**
 * Customer bookings for events
 */
export const bookings = mysqlTable("bookings", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  userId: int("userId"), // nullable for guest bookings
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  numberOfSpots: int("numberOfSpots").default(1).notNull(),
  totalAmount: int("totalAmount").notNull(), // cents
  status: mysqlEnum("status", ["pending", "confirmed", "cancelled", "completed"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  paymentIntentId: varchar("paymentIntentId", { length: 255 }), // Stripe payment intent
  specialRequests: text("specialRequests"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Booking = typeof bookings.$inferSelect;
export type InsertBooking = typeof bookings.$inferInsert;

/**
 * Product categories
 */
export const productCategories = mysqlTable("productCategories", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  displayOrder: int("displayOrder").default(0).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type ProductCategory = typeof productCategories.$inferSelect;
export type InsertProductCategory = typeof productCategories.$inferInsert;

/**
 * Products for sale
 */
export const products = mysqlTable("products", {
  id: int("id").autoincrement().primaryKey(),
  categoryId: int("categoryId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 255 }).notNull().unique(),
  description: text("description"),
  price: int("price").notNull(), // cents
  compareAtPrice: int("compareAtPrice"), // original price for sales
  imageUrl: text("imageUrl"),
  images: text("images"), // JSON array of additional images
  inventory: int("inventory").default(0).notNull(),
  isDigital: boolean("isDigital").default(false).notNull(),
  downloadUrl: text("downloadUrl"), // for digital products
  isFeatured: boolean("isFeatured").default(false).notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  tags: text("tags"), // JSON array of tags
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = typeof products.$inferInsert;

/**
 * Customer orders
 */
export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // nullable for guest orders
  orderNumber: varchar("orderNumber", { length: 50 }).notNull().unique(),
  customerName: varchar("customerName", { length: 255 }).notNull(),
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerPhone: varchar("customerPhone", { length: 20 }),
  shippingAddress: text("shippingAddress"), // JSON object
  subtotal: int("subtotal").notNull(), // cents
  tax: int("tax").default(0).notNull(), // cents
  shipping: int("shipping").default(0).notNull(), // cents
  total: int("total").notNull(), // cents
  status: mysqlEnum("status", ["pending", "processing", "shipped", "delivered", "cancelled"]).default("pending").notNull(),
  paymentStatus: mysqlEnum("paymentStatus", ["pending", "paid", "refunded"]).default("pending").notNull(),
  paymentIntentId: varchar("paymentIntentId", { length: 255 }), // Stripe payment intent
  notes: text("notes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;

/**
 * Order line items
 */
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(),
  orderId: int("orderId").notNull(),
  productId: int("productId").notNull(),
  productName: varchar("productName", { length: 255 }).notNull(), // snapshot at time of order
  quantity: int("quantity").notNull(),
  price: int("price").notNull(), // cents, snapshot at time of order
  total: int("total").notNull(), // cents
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OrderItem = typeof orderItems.$inferSelect;
export type InsertOrderItem = typeof orderItems.$inferInsert;

/**
 * Private event inquiries
 */
export const privateEventInquiries = mysqlTable("privateEventInquiries", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }),
  eventType: varchar("eventType", { length: 255 }).notNull(), // "Bachelorette", "Corporate", "Retreat", etc.
  preferredDate: timestamp("preferredDate"),
  numberOfGuests: int("numberOfGuests"),
  location: varchar("location", { length: 255 }),
  message: text("message"),
  status: mysqlEnum("status", ["new", "contacted", "quoted", "booked", "declined"]).default("new").notNull(),
  adminNotes: text("adminNotes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrivateEventInquiry = typeof privateEventInquiries.$inferSelect;
export type InsertPrivateEventInquiry = typeof privateEventInquiries.$inferInsert;

/**
 * Newsletter subscribers
 */
export const newsletterSubscribers = mysqlTable("newsletterSubscribers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 255 }),
  isActive: boolean("isActive").default(true).notNull(),
  subscribedAt: timestamp("subscribedAt").defaultNow().notNull(),
  unsubscribedAt: timestamp("unsubscribedAt"),
});

export type NewsletterSubscriber = typeof newsletterSubscribers.$inferSelect;
export type InsertNewsletterSubscriber = typeof newsletterSubscribers.$inferInsert;

/**
 * Gift certificates
 */
export const giftCertificates = mysqlTable("giftCertificates", {
  id: int("id").autoincrement().primaryKey(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  amount: int("amount").notNull(), // cents
  purchaserName: varchar("purchaserName", { length: 255 }).notNull(),
  purchaserEmail: varchar("purchaserEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  recipientEmail: varchar("recipientEmail", { length: 320 }),
  message: text("message"),
  status: mysqlEnum("status", ["active", "redeemed", "expired"]).default("active").notNull(),
  redeemedBy: int("redeemedBy"), // userId
  redeemedAt: timestamp("redeemedAt"),
  expiresAt: timestamp("expiresAt"),
  paymentIntentId: varchar("paymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type GiftCertificate = typeof giftCertificates.$inferSelect;
export type InsertGiftCertificate = typeof giftCertificates.$inferInsert;

/**
 * Track preview plays for analytics
 */
export const trackPreviewPlays = mysqlTable("trackPreviewPlays", {
  id: int("id").autoincrement().primaryKey(),
  trackId: int("trackId").notNull(), // 1-18 for Sonoran Echoes tracks
  trackTitle: varchar("trackTitle", { length: 255 }).notNull(),
  source: mysqlEnum("source", ["homepage", "album_page"]).notNull(), // Where the play occurred
  sessionId: varchar("sessionId", { length: 255 }), // Browser session ID for attribution
  userId: int("userId"), // If user is logged in
  playedAt: timestamp("playedAt").defaultNow().notNull(),
});

export type TrackPreviewPlay = typeof trackPreviewPlays.$inferSelect;
export type InsertTrackPreviewPlay = typeof trackPreviewPlays.$inferInsert;

/**
 * Track album/track purchases with attribution
 */
export const musicPurchases = mysqlTable("musicPurchases", {
  id: int("id").autoincrement().primaryKey(),
  purchaseType: mysqlEnum("purchaseType", ["album", "track"]).notNull(),
  trackId: int("trackId"), // For individual track purchases
  trackTitle: varchar("trackTitle", { length: 255 }), // For individual track purchases
  customerEmail: varchar("customerEmail", { length: 320 }).notNull(),
  customerName: varchar("customerName", { length: 255 }),
  amount: int("amount").notNull(), // Amount in cents
  stripeSessionId: varchar("stripeSessionId", { length: 255 }).notNull().unique(),
  lastPlayedTrackId: int("lastPlayedTrackId"), // Last preview track played before purchase
  lastPlayedTrackTitle: varchar("lastPlayedTrackTitle", { length: 255 }),
  sessionId: varchar("sessionId", { length: 255 }), // Browser session ID for attribution
  purchasedAt: timestamp("purchasedAt").defaultNow().notNull(),
});

export type MusicPurchase = typeof musicPurchases.$inferSelect;
export type InsertMusicPurchase = typeof musicPurchases.$inferInsert;
