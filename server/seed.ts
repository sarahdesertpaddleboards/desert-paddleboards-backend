<<<<<<< Updated upstream
import "dotenv/config";               
=======
// server/seed.ts
import "dotenv/config";

>>>>>>> Stashed changes
import { db } from "./db";
import { classProducts, classSessions, productOverrides } from "./db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

<<<<<<< Updated upstream
  // Clear tables
=======
  // Safety: refuse to run if DATABASE_URL is missing
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is missing. Check your .env file.");
  }

  // Clear in dependency order
>>>>>>> Stashed changes
  await db.delete(classSessions);
  await db.delete(classProducts);
  await db.delete(productOverrides);

<<<<<<< Updated upstream
  // Insert a class product
=======
  // Insert 1 class product
>>>>>>> Stashed changes
  await db.insert(classProducts).values({
    productKey: "beginner-paddle",
    productType: "class", // ✅ add (or whatever your system expects)
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
<<<<<<< Updated upstream
    price: 7500,                   // use 'price' (your schema) not price_cents
=======
    price: 7500,
>>>>>>> Stashed changes
    currency: "USD",
    capacity: 10,
<<<<<<< Updated upstream
  });

  // Insert a session
  await db.insert(classSessions).values({
    classProductId: 1,             // simple assumption for seed
    startTime: new Date(Date.now() + 24 * 60 * 60 * 1000),
    endTime: new Date(Date.now() + (25 * 60 * 60 * 1000)),
    seatsTotal: 10,
    seatsAvailable: 10,
  });

  // Insert a gift card override
  await db.insert(productOverrides).values({
    productId: 1,
    overrideName: "Gift Card - 50 USD",
    overridePrice: 5000,
  });

  console.log("🌱 Done.");
=======
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    active: true,
  });

  // Fetch its ID (MySQL: no returning)
  const createdClass = await db
    .select()
    .from(classProducts)
    .where(eq(classProducts.productKey, "beginner-paddle"))
    .then((rows) => rows[0]);

  if (!createdClass?.id) {
    throw new Error("Failed to read back inserted class product");
  }

  // Insert 1 session for that class
  const start = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const end = new Date(start.getTime() + 90 * 60 * 1000);

  await db.insert(classSessions).values({
    classProductId: createdClass.id,
    startTime: start,
    endTime: end,
    seatsTotal: 10,
    seatsAvailable: 10,
  });

  // Insert 1 store product override (adapt these columns to your actual table!)
  // Your current compiled schema shows product_overrides as:
  // { id, productId, overrideName, overridePrice }
  // So we need a productId from the products table, BUT your DB currently does not even have products.
  // For now we seed ONLY classes until store/products is finalized.
  console.log("✅ Seed complete: class_products + class_sessions");
>>>>>>> Stashed changes
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  process.exit(1);
});
console.log("✅ Seed complete: class_products + class_sessions");
process.exit(0); // ✅ force exit so you don't need Ctrl+C
