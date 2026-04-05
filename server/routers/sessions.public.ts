import { Router } from "express";
import { db } from "../db";
import { classSessions, classProducts, venues } from "../db/schema";
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
        venueTimezone: venues.timezone,
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

router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid session id" });
    }

    const row = await db
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
        venueTimezone: venues.timezone,
        className: classProducts.name,
        productKey: classProducts.productKey,
      })
      .from(classSessions)
      .leftJoin(venues, eq(classSessions.venueId, venues.id))
      .leftJoin(classProducts, eq(classSessions.classProductId, classProducts.id))
      .where(eq(classSessions.id, id))
      .limit(1)
      .then((r) => r[0]);

    if (!row) {
      return res.status(404).json({ error: "Session not found" });
    }

    res.json(row);
  } catch (err) {
    console.error("SESSIONS PUBLIC GET ERROR", err);
    res.status(500).json({ error: "Failed to load session" });
  }
});

export default router;
