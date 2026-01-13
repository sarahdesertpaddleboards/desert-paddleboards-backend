import { Router } from "express";
import { db } from "../db";
import { classSessions, classProducts } from "../db/schema";
import { eq, gte, and, lte } from "drizzle-orm";

export const classSessionsRouter = Router();

// ---------------------------------------------------------
// GET all sessions (optionally filter by date)
// ---------------------------------------------------------
classSessionsRouter.get("/", async (req, res) => {
  try {
    const { date } = req.query;

    let query = db.select().from(classSessions);

    if (date) {
      const start = new Date(String(date));
      const end = new Date(start);
      end.setDate(end.getDate() + 1);

      query = db
        .select()
        .from(classSessions)
        .where(
          and(
            gte(classSessions.startTime, start),
            lte(classSessions.startTime, end)
          )
        );
    }

    const results = await query;
    return res.json(results);
  } catch (err) {
    console.error("CLASS SESSION LIST ERROR", err);
    return res.status(500).json({ error: "Failed to load sessions" });
  }
});

// ---------------------------------------------------------
// CREATE session
// ---------------------------------------------------------
classSessionsRouter.post("/", async (req, res) => {
  try {
    const { classProductId, startTime, endTime, seatsTotal } = req.body;

    // Verify class product exists
    const productExists = await db
      .select()
      .from(classProducts)
      .where(eq(classProducts.id, classProductId))
      .then((r) => r[0]);

    if (!productExists)
      return res.status(400).json({ error: "Invalid classProductId" });

    const session = await db
      .insert(classSessions)
      .values({
        classProductId,
        startTime,
        endTime,
        seatsTotal,
        seatsAvailable: seatsTotal,
      })
      .returning();

    return res.json(session[0]);
  } catch (err) {
    console.error("CLASS SESSION CREATE ERROR", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

// ---------------------------------------------------------
// UPDATE session
// ---------------------------------------------------------
classSessionsRouter.put("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const { startTime, endTime, seatsTotal, seatsAvailable } = req.body;

    const updated = await db
      .update(classSessions)
      .set({
        startTime,
        endTime,
        seatsTotal,
        seatsAvailable,
      })
      .where(eq(classSessions.id, id))
      .returning();

    return res.json(updated[0]);
  } catch (err) {
    console.error("CLASS SESSION UPDATE ERROR", err);
    return res.status(500).json({ error: "Failed to update session" });
  }
});
