import "dotenv/config";               
import { db } from "./db";
import { classProducts, classSessions, productOverrides } from "./db/schema";

async function seed() {
  console.log("🌱 Seeding database...");

  // Clear tables
  await db.delete(classSessions);
  await db.delete(classProducts);
  await db.delete(productOverrides);

  // Insert a class product
  await db.insert(classProducts).values({
    productKey: "beginner-paddle",
    name: "Beginner Paddle Boarding",
    description: "Perfect for newcomers",
    price: 7500,                   // use 'price' (your schema) not price_cents
    currency: "USD",
    imageUrl: "https://images.desert-paddleboards.com/beginner.jpg",
    capacity: 10,
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
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
