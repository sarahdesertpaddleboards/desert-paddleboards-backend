// ---------------------------------------------------------
// CLASS PRODUCTS TABLE
// ---------------------------------------------------------

export const classProducts = mysqlTable("class_products", {
  id: int("id").primaryKey().autoincrement(),             // Unique class product ID
  productKey: varchar("product_key", { length: 128 }),     // For frontend linking
  name: varchar("name", { length: 255 }).notNull(),        // Class name (ex. "Sunset SUP")
  description: text("description"),                        // Class description
  price: int("price").notNull(),                           // Price in cents
  currency: varchar("currency", { length: 10 }).notNull(), // Example: "usd"
  capacity: int("capacity").notNull(),                     // Default capacity for new sessions
  imageUrl: varchar("image_url", { length: 500 }),          // Optional header image
  active: boolean("active").default(true),                 // Visible to users?
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ---------------------------------------------------------
// CLASS SESSIONS TABLE
// ---------------------------------------------------------

export const classSessions = mysqlTable("class_sessions", {
  id: int("id").primaryKey().autoincrement(),             // Unique session ID
  classProductId: int("class_product_id")                  // FK → class_products.id
    .notNull()
    .references(() => classProducts.id),
  
  startTime: datetime("start_time").notNull(),            // Full datetime
  endTime: datetime("end_time").notNull(),                // Full datetime

  seatsTotal: int("seats_total").notNull(),               // How many can join
  seatsAvailable: int("seats_available").notNull(),       // Live remaining seats

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
