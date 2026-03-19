import { db } from "./db";
import { and, eq } from "drizzle-orm";
import {
  classProducts,
  classSessions,
  productOverrides,
  products,
  venues,
} from "./db/schema";

type SeedVenue = {
  slug: string;
  name: string;
  addressLine: string;
  city: string;
  state: string;
  postalCode?: string;
  callout?: string;
  notes?: string;
  timezone: string;
  active: boolean;
};

type SeedClassProduct = {
  productKey: string;
  productType: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  capacity: number;
  imageUrl: string;
  active: boolean;
};

type SeedSession = {
  classProductKey: string;
  venueSlug: string;
  startTime: Date;
  endTime: Date;
  seatsTotal: number;
  seatsAvailable: number;
};

type SeedStoreProduct = {
  productKey: string;
  type: string;
  name: string;
  description: string;
  price: number;
  currency: string;
  imageUrl: string;
  active: boolean;
};

const seedVenues: SeedVenue[] = [
  {
    slug: "civana-resort-spa-scottsdale",
    name: "CIVANA Wellness Resort & Spa",
    addressLine: "37220 Mule Train Rd",
    city: "Carefree",
    state: "AZ",
    postalCode: "85377",
    callout: "Resort pool floating soundbath experience",
    notes:
      "Please arrive 15 minutes early. One towel is provided at resort classes. Bring 2-3 towels for extra comfort if desired.",
    timezone: "America/Phoenix",
    active: true,
  },
  {
    slug: "eldorado-aquatic-fitness-center-scottsdale",
    name: "Eldorado Aquatic & Fitness Center",
    addressLine: "2301 N Miller Rd",
    city: "Scottsdale",
    state: "AZ",
    postalCode: "85257",
    callout: "Public pool floating soundbath experience",
    notes:
      "Wear quick drying workout clothes. Eye masks and blankets may be provided depending on season.",
    timezone: "America/Phoenix",
    active: true,
  },
  {
    slug: "private-events-phoenix-metro",
    name: "Private Events — Phoenix Metro",
    addressLine: "Mobile / custom venue",
    city: "Phoenix",
    state: "AZ",
    postalCode: "85001",
    callout: "Private group bookings and bespoke events",
    notes:
      "Use this venue for private soundbath and wellness sessions that happen at custom partner locations.",
    timezone: "America/Phoenix",
    active: true,
  },
];

const seedClassProducts: SeedClassProduct[] = [
  {
    productKey: "floating-soundbath-resort",
    productType: "class",
    name: "Floating Soundbath — Resort Pool",
    description:
      "A deeply relaxing floating soundbath experience with meditation, breathwork, live gongs, flutes, and singing bowls in a beautiful resort pool setting.",
    price: 7500,
    currency: "USD",
    capacity: 12,
    imageUrl: "https://desertpaddleboards.com/images/hero-pool-soundbath.jpeg",
    active: true,
  },
  {
    productKey: "floating-soundbath-public",
    productType: "class",
    name: "Floating Soundbath — Public Pool",
    description:
      "An accessible floating soundbath session that brings calm, presence, and soothing sound healing to a welcoming public pool environment.",
    price: 4000,
    currency: "USD",
    capacity: 14,
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true,
  },
  {
    productKey: "private-soundbath-event",
    productType: "private-event",
    name: "Private Floating Soundbath Event",
    description:
      "A bespoke floating soundbath and wellness experience for private groups, retreats, and special events.",
    price: 15000,
    currency: "USD",
    capacity: 16,
    imageUrl: "https://desertpaddleboards.com/images/about-sarah-class.jpeg",
    active: true,
  },
];

const seedStoreProducts: SeedStoreProduct[] = [
  {
    productKey: "sonoran-echoes-digital-album",
    type: "digital",
    name: "Sonoran Echoes Digital Album",
    description:
      "A relaxing digital sound journey inspired by desert sunsets, water, stillness, and immersive sound healing.",
    price: 1800,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/sonoran-echoes-album.jpeg",
    active: true,
  },
  {
    productKey: "desert-paddleboards-gift-certificate",
    type: "gift",
    name: "Desert Paddleboards Gift Certificate",
    description:
      "Give someone a floating soundbath or wellness experience with a flexible Desert Paddleboards gift certificate.",
    price: 7500,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true,
  },
  {
    productKey: "desert-paddleboards-branded-paddleboard",
    type: "physical",
    name: "Desert Paddleboards Branded Paddleboard",
    description:
      "A branded Desert Paddleboards paddleboard for customers who want the full on-water lifestyle experience.",
    price: 16000,
    currency: "USD",
    imageUrl: "https://desertpaddleboards.com/images/hero-main.jpeg",
    active: true,
  },
];

function daysFromNow(days: number, hour: number, minute = 0) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, minute, 0, 0);
  return date;
}

function plusMinutes(date: Date, minutes: number) {
  return new Date(date.getTime() + minutes * 60 * 1000);
}

const seedSessions: SeedSession[] = [
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(2, 18, 30),
    endTime: plusMinutes(daysFromNow(2, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 9,
  },
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(5, 18, 30),
    endTime: plusMinutes(daysFromNow(5, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 6,
  },
  {
    classProductKey: "floating-soundbath-resort",
    venueSlug: "civana-resort-spa-scottsdale",
    startTime: daysFromNow(9, 18, 30),
    endTime: plusMinutes(daysFromNow(9, 18, 30), 90),
    seatsTotal: 12,
    seatsAvailable: 11,
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(3, 19, 0),
    endTime: plusMinutes(daysFromNow(3, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 12,
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(7, 19, 0),
    endTime: plusMinutes(daysFromNow(7, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 8,
  },
  {
    classProductKey: "floating-soundbath-public",
    venueSlug: "eldorado-aquatic-fitness-center-scottsdale",
    startTime: daysFromNow(12, 19, 0),
    endTime: plusMinutes(daysFromNow(12, 19, 0), 75),
    seatsTotal: 14,
    seatsAvailable: 13,
  },
  {
    classProductKey: "private-soundbath-event",
    venueSlug: "private-events-phoenix-metro",
    startTime: daysFromNow(6, 17, 30),
    endTime: plusMinutes(daysFromNow(6, 17, 30), 120),
    seatsTotal: 16,
    seatsAvailable: 16,
  },
  {
    classProductKey: "private-soundbath-event",
    venueSlug: "private-events-phoenix-metro",
    startTime: daysFromNow(13, 17, 30),
    endTime: plusMinutes(daysFromNow(13, 17, 30), 120),
    seatsTotal: 16,
    seatsAvailable: 10,
  },
];

async function seed() {
  console.log("🌱 Seeding database with Seed v2...");

  // Clear child tables first
  await db.delete(classSessions);
  await db.delete(productOverrides);

  // Clear parent tables next
  await db.delete(classProducts);
  await db.delete(venues);
  await db.delete(products);

  // Seed venues
  for (const venue of seedVenues) {
    await db.insert(venues).values(venue);
  }

  // Seed class products
  for (const product of seedClassProducts) {
    await db.insert(classProducts).values(product);
  }

  // Seed store products
  for (const product of seedStoreProducts) {
    await db.insert(products).values(product);
  }

  // Re-fetch entities so we can map keys/slugs to ids
  const venueRows = await db.select().from(venues);
  const classProductRows = await db.select().from(classProducts);

  const venueBySlug = new Map(venueRows.map((v) => [v.slug, v]));
  const classProductByKey = new Map(classProductRows.map((p) => [p.productKey, p]));

  // Seed sessions
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
      seatsAvailable: session.seatsAvailable,
    });
  }

  const seededCounts = {
    venues: seedVenues.length,
    classProducts: seedClassProducts.length,
    sessions: seedSessions.length,
    storeProducts: seedStoreProducts.length,
  };

  console.log("✅ Seed v2 complete", seededCounts);
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("❌ Seed failed:", err);
    process.exit(1);
  });
