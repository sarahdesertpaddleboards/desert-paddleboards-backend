import { Router } from "express";
import { db } from "../db";
import { classProducts, classSessions } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const classSessionsRouter = Router();

/**
 * GET /admin/class-sessions/:classProductId
 * List all sessions for a class product
 */
classSessionsRouter.get("/:classProductId", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const classProductId = Number(req.params.classProductId);

    const sessions = await db
      .select()
      .from(classSessions)
      .where(eq(classSessions.classProductId, classProductId));

    return res.json(sessions);
  } catch (err) {
    console.error("SESSION LIST ERROR", err);
    return res.status(401).json({ error: "Unauthorized" });
  }
});

/**
 * POST /admin/class-sessions
 * Create a session
 */
classSessionsRouter.post("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const {
      classProductId,
      startTime,
      endTime,
      seatsTotal,
    } = req.body ?? {};

    if (!classProductId || !startTime || !seatsTotal) {
      return res.status(400).json({
        error: "Missing required fields",
      });
    }

    await db.insert(classSessions).values({
      classProductId,
      startTime,
      endTime,
      seatsTotal,
      seatsAvailable: seatsTotal, // start with all seats free
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("SESSION CREATE ERROR", err);
    return res.status(500).json({ error: "Failed to create session" });
  }
});

/**
 * PUT /admin/class-sessions/:id
 * Update a session (time or seat count)
 */
classSessionsRouter.put("/:id", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const id = Number(req.params.id);
    const { startTime, endTime, seatsTotal, seatsAvailable } = req.body ?? {};

    await db
      .update(classSessions)
      .set({
        startTime,
        endTime,
        seatsTotal,
        seatsAvailable,
      })
      .where(eq(classSessions.id, id));

    return res.json({ success: true });
  } catch (err) {
    console.error("SESSION UPDATE ERROR", err);
    return res.status(500).json({ error: "Failed to update session" });
  }
});
