// server/seed.ts
import { db } from "./db";
import { classProducts, classSessions } from "./db/schema";
import { eq } from "drizzle-orm";

async function seed() {
  console.log("🌱 Seeding database...");

  // 1) Clear tables (sessions first because FK)
  await db.delete(classSessions);
  await db.delete(classProducts);

  // 2) Insert class product (NO .returning() on MySQL)
  const productKey = "beginner-paddle";

  await db.insert(classProducts).values({
    productKey,
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
    price: 7500,
    currency: "USD",
    capacity: 10,
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    active: true,
    productType: "class",
  });

  // 3) Fetch inserted product by unique key
  const [product] = await db
    .select()
    .from(classProducts)
    .where(eq(classProducts.productKey, productKey))
    .limit(1);

  if (!product) {
    throw new Error("Seed failed: could not re-fetch class product after insert");
  }

  // 4) Insert a session for that product
  const now = new Date();
  const start = new Date(now.getTime());
  const end = new Date(now.getTime() + 90 * 60 * 1000); // +90 mins

  await db.insert(classSessions).values({
    classProductId: product.id,
    startTime: start,
    endTime: end,
    seatsTotal: product.capacity ?? 10,
    seatsAvailable: product.capacity ?? 10,
  });

  console.log("✅ Seed complete: class_products + class_sessions");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
