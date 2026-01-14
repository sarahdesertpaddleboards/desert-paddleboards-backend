import "dotenv/config";   // <--- MUST BE FIRST

import { db } from "./db";
import { classProducts, classSessions, productOverrides } from "./db/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // clear tables
  await db.delete(classSessions);
  await db.delete(classProducts);
  await db.delete(productOverrides);

  // insert sample data
  const paddleClass = await db.insert(classProducts).values({
    productKey: "beginner-paddle",
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
    price_cents: 7500,
    currency: "USD",
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    capacity: 10,
  }).returning();

  await db.insert(classSessions).values({
    classProductKey: "beginner-paddle",
    startTime: new Date(Date.now() + 86400000).toISOString(),
    availability: 10,
  });

  await db.insert(productOverrides).values({
    key: "gift-card-50",
    type: "gift-card",
    name: "Gift Card - 50 USD",
    description: "Perfect gift!",
    price_cents: 5000,
    currency: "USD",
  });

  console.log("🌱 Done.");
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
