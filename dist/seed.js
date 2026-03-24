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
var seedVenues = [
  {
    slug: "civana-resort-spa-scottsdale",
    name: "CIVANA Wellness Resort & Spa",
    addressLine: "37220 Mule Train Rd",
    city: "Carefree",
    state: "AZ",
    postalCode: "85377",
    callout: "Resort pool floating soundbath experience",
    notes: "Please arrive 15 minutes early. One towel is provided at resort classes. Bring 2-3 towels for extra comfort if desired.",
    timezone: "America/Phoenix",
    active: true
  },
  {
    slug: "eldorado-aquatic-fitness-center-scottsdale",
    name: "Eldorado Aquatic & Fitness Center",
    addressLine: "2301 N Miller Rd",
    city: "Scottsdale",
    state: "AZ",
    postalCode: "85257",
    callout: "Public pool floating soundbath experience",
    notes: "Wear quick drying workout clothes. Eye masks and blankets may be provided depending on season.",
    timezone: "America/Phoenix",
    active: true
  },
  {
    slug: "private-events-phoenix-metro",
    name: "Private Events \u2014 Phoenix Metro",
    addressLine: "Mobile / custom venue",
    city: "Phoenix",
    state: "AZ",
    postalCode: "85001",
    callout: "Private group bookings and bespoke events",
    notes: "Use this venue for private soundbath and wellness sessions that happen at custom partner locations.",
    timezone: "America/Phoenix",
    active: true
  }
];
var seedClassProducts = [
  {
    productKey: "floating-soundbath-resort",
    productType: "class",
    name: "Floating Soundbath \u2014 Resort Pool",
    description: "A deeply relaxing floating soundbath experience with meditation, breathwork, live gongs, flutes, and singing bowls in a beautiful resort pool setting.",
    price: 7500,
    currency: "USD",
    capacity: 12,
    imageUrl: "https://desertpaddleboards.com/images/hero-pool-soundbath.jpeg",
    active: true
  },
  {
    productKey: "floating-soundbath-public",
    productType: "class",
    name: "Floating Soundbath \u2014 Public Pool",
    description: "An accessible floating soundbath session that brings calm, presence, and soothing sound healing to a welcoming public pool environment.",
    price: 4e3,
    currency: "USD",
    capacity: 14,
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true
  },
  {
    productKey: "private-soundbath-event",
    productType: "private-event",
    name: "Private Floating Soundbath Event",
    description: "A bespoke floating soundbath and wellness experience for private groups, retreats, and special events.",
    price: 15e3,
    currency: "USD",
    capacity: 16,
    imageUrl: "https://desertpaddleboards.com/images/about-sarah-class.jpeg",
    active: true
  }
];
var seedStoreProducts = [
  {
    productKey: "sonoran-echoes-digital-album",
    type: "digital",
    name: "Sonoran Echoes Digital Album",
    description: "A relaxing digital sound journey inspired by desert sunsets, water, stillness, and immersive sound healing.",
    price: 1800,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/sonoran-echoes-album.jpeg",
    active: true
  },
  {
    productKey: "desert-paddleboards-gift-certificate",
    type: "gift",
    name: "Desert Paddleboards Gift Certificate",
    description: "Give someone a floating soundbath or wellness experience with a flexible Desert Paddleboards gift certificate.",
    price: 7500,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true
  },
  {
    productKey: "desert-paddleboards-branded-paddleboard",
    type: "physical",
    name: "Desert Paddleboards Branded Paddleboard",
    description: "A branded Desert Paddleboards paddleboard for customers who want the full on-water lifestyle experience.",
    price: 16e3,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true
  }
];
function daysFromNow(days, hour, minute = 0) {
  const date = /* @__PURE__ */ new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}
function plusMinutes(date, minutes) {
  return new Date(date.getTime() + minutes * 60 * 1e3);
}
var seedSessions = [
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(2, 18, 30),
    endTime: plusMinutes(daysFromNow(2, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 9
  },
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(5, 18, 30),
    endTime: plusMinutes(daysFromNow(5, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 6
  },
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(9, 18, 30),
    endTime: plusMinutes(daysFromNow(9, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 11
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(3, 19, 0),
    endTime: plusMinutes(daysFromNow(3, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 12
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(7, 19, 0),
    endTime: plusMinutes(daysFromNow(7, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 8
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(12, 19, 0),
    endTime: plusMinutes(daysFromNow(12, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 13
  },
  {
    classProductKey: "private-soundbath-event",
    venueSlug: "private-events-phoenix-metro",
    startTime: daysFromNow(6, 17, 30),
    endTime: plusMinutes(daysFromNow(6, 17, 30), 120),
    seatsTotal: 16,
    seatsAvailable: 16
  },
  {
    classProductKey: "private-soundbath-event",
    venueSlug: "private-events-phoenix-metro",
    startTime: daysFromNow(13, 17, 30),
    endTime: plusMinutes(daysFromNow(13, 17, 30), 120),
    seatsTotal: 16,
    seatsAvailable: 10
  }
];
async function seed() {
  console.log("\u{1F331} Seeding database with Seed v2...");
  await db.delete(classSessions);
  await db.delete(productOverrides);
  await db.delete(classProducts);
  await db.delete(venues);
  await db.delete(products);
  for (const venue of seedVenues) {
    await db.insert(venues).values(venue);
  }
  for (const product of seedClassProducts) {
    await db.insert(classProducts).values(product);
  }
  for (const product of seedStoreProducts) {
    await db.insert(products).values(product);
  }
  const venueRows = await db.select().from(venues);
  const classProductRows = await db.select().from(classProducts);
  const venueBySlug = new Map(venueRows.map((v) => [v.slug, v]));
  const classProductByKey = new Map(classProductRows.map((p) => [p.productKey, p]));
  for (const session of seedSessions) {
    const venue = venueBySlug.get(session.venueSlug);
    const classProduct = classProductByKey.get(session.classProductKey);
    if (!venue) {
      throw new Error(`Seed failed: venue not found for slug ${session.venueSlug}`);
    }
    if (!classProduct) {
      throw new Error(`Seed failed: class product not found for key ${session.classProductKey}`);
    }
    await db.insert(classSessions).values({
      classProductId: classProduct.id,
      venueId: venue.id,
      startTime: session.startTime,
      endTime: session.endTime,
      seatsTotal: session.seatsTotal,
      seatsAvailable: session.seatsAvailable
    });
  }
  const seededCounts = {
    venues: seedVenues.length,
    classProducts: seedClassProducts.length,
    sessions: seedSessions.length,
    storeProducts: seedStoreProducts.length
  };
  console.log("\u2705 Seed v2 complete", seededCounts);
}
seed().then(() => process.exit(0)).catch((err) => {
  console.error("\u274C Seed failed:", err);
  process.exit(1);
});
