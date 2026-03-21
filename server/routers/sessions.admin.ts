import { Router } from "express";
import { db } from "../db";
import { classSessions, venues } from "../db/schema";
import { desc, eq } from "drizzle-orm";

const router = Router();

router.get("/", async (_req, res) => {
  const rows = await db
    .select({
      id: classSessions.id,
      classProductId: classSessions.classProductId,
      venueId: classSessions.venueId,
      startTime: classSessions.startTime,
      endTime: classSessions.endTime,
      seatsTotal: classSessions.seatsTotal,
      seatsAvailable: classSessions.seatsAvailable,
      venueName: venues.name,
      venueCity: venues.city,
      venueState: venues.state,
    })
    .from(classSessions)
    .leftJoin(venues, eq(classSessions.venueId, venues.id))
    .orderBy(desc(classSessions.startTime));

  res.json(rows);
});

router.post("/", async (req, res) => {
  const body = req.body;

  const [created] = await db
    .insert(classSessions)
    .values({
      classProductId: body.classProductId,
      venueId: body.venueId ?? null,
      startTime: body.startTime,
      endTime: body.endTime,
      seatsTotal: body.seatsTotal,
      seatsAvailable: body.seatsAvailable,
    })
    .returning();

  res.json(created);
});

router.patch("/:id", async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body;

  const [updated] = await db
    .update(classSessions)
    .set({
      venueId: body.venueId,
      startTime: body.startTime,
      endTime: body.endTime,
      seatsTotal: body.seatsTotal,
      seatsAvailable: body.seatsAvailable,
    })
    .where(eq(classSessions.id, id))
    .returning();

  res.json(updated);
});

router.delete("/:id", async (req, res) => {
  const id = Number(req.params.id);

  await db.delete(classSessions).where(eq(classSessions.id, id));

  res.json({ ok: true });
});

export default router;
