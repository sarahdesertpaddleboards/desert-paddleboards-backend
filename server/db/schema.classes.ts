// server/db/schema.classes.ts
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
  // VENUES
  // ---------------------------------------------------------
  export const venues = mysqlTable("venues", {
    id: int("id").primaryKey().autoincrement(),
    slug: varchar("slug", { length: 255 }).notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    addressLine: varchar("address_line", { length: 255 }).notNull(),
    city: varchar("city", { length: 100 }).notNull(),
    state: varchar("state", { length: 20 }).notNull(),
    postalCode: varchar("postal_code", { length: 20 }),
    callout: text("callout"),
    notes: text("notes"),
    timezone: varchar("timezone", { length: 64 }).notNull().default("America/Phoenix"),
    active: boolean("active").default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  });
  
  // ---------------------------------------------------------
  // CLASS PRODUCTS
  // IMPORTANT: match your LIVE DB (you showed product_key is varchar(64) unique)
  // ---------------------------------------------------------
  export const classProducts = mysqlTable("class_products", {
    id: int("id").primaryKey().autoincrement(),
    productKey: varchar("product_key", { length: 64 }).notNull(), // matches DB
    name: varchar("name", { length: 255 }).notNull(),
    description: varchar("description", { length: 2000 }), // matches DB
    price: int("price").notNull(),
    currency: varchar("currency", { length: 10 }).notNull(),
    imageUrl: varchar("image_url", { length: 500 }),
    capacity: int("capacity").notNull().default(1),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
    productType: varchar("product_type", { length: 32 }).notNull(), // matches DB
  });
  
  // ---------------------------------------------------------
  // CLASS SESSIONS
  // IMPORTANT: match your LIVE DB (start_time/end_time are datetime)
  // ---------------------------------------------------------
  export const classSessions = mysqlTable("class_sessions", {
    id: int("id").primaryKey().autoincrement(),
    classProductId: int("class_product_id").notNull(),
    startTime: datetime("start_time").notNull(),
    endTime: datetime("end_time").notNull(),
    seatsTotal: int("seats_total").notNull(),
    seatsAvailable: int("seats_available").notNull(),
    createdAt: timestamp("created_at").defaultNow(),
    updatedAt: timestamp("updated_at").defaultNow(),
  
    // This will exist AFTER migration 0011 is pushed
    venueId: int("venue_id"),
  });
  