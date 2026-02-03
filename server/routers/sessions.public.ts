import { Router } from "express";
import { db } from "../db";
import { classSessions, venues } from "../db/schema";
import { eq, desc } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  try {
    const rows = await db
      .select({
        id: classSessions.id,
        classProductId: classSessions.classProductId,
        startTime: classSessions.startTime,
        endTime: classSessions.endTime,
        seatsTotal: classSessions.seatsTotal,
        seatsAvailable: classSessions.seatsAvailable,

        venueId: classSessions.venueId,
        venueName: venues.name,
        venueCity: venues.city,
        venueState: venues.state,
        venueSlug: venues.slug,
      })
      .from(classSessions)
      .leftJoin(venues, eq(classSessions.venueId, venues.id))
      .orderBy(desc(classSessions.startTime));

    res.json(rows);
  } catch (err) {
    console.error("SESSIONS PUBLIC LIST ERROR", err);
    res.status(500).json({ error: "Failed to load sessions" });
  }
});

export default router;
