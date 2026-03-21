import { Router } from "express";
import { db } from "../db";
import { venues } from "../db/schema";
import { asc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: venues.id,
      slug: venues.slug,
      name: venues.name,
      city: venues.city,
      state: venues.state,
      active: venues.active,
    })
    .from(venues)
    .orderBy(asc(venues.name));

  res.json(rows);
});

export default router;
