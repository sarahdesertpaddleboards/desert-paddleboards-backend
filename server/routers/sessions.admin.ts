import { Router } from "express";
import { db } from "../db";
import { classSessions, venues } from "../db/schema";
import { desc, eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

const router = Router();

async function requireModernAdmin(req: any, res: any, next: any) {
  try {
    await sdk.requireAdmin(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

function normalizeAdminDateTime(value: unknown) {
  if (typeof value !== "string" || !value.trim()) return null;
  const normalized = value.trim().replace("T", " ");
  const withSeconds = normalized.length === 16 ? `${normalized}:00` : normalized;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return withSeconds;
}

function normalizePositiveInt(value: unknown) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) return null;
  return parsed;
}

router.get("/", requireModernAdmin, async (_req, res) => {
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

router.post("/", requireModernAdmin, async (req, res) => {
  const body = req.body ?? {};
  const classProductId = Number(body.classProductId);
  const venueId = body.venueId == null || body.venueId === "" ? null : Number(body.venueId);
  const startTime = normalizeAdminDateTime(body.startTime);
  const endTime = normalizeAdminDateTime(body.endTime);
  const seatsTotal = normalizePositiveInt(body.seatsTotal);
  const seatsAvailable = normalizePositiveInt(body.seatsAvailable);

  if (!Number.isFinite(classProductId)) {
    return res.status(400).json({ error: "classProductId is required" });
  }

  if (!startTime || !endTime) {
    return res.status(400).json({ error: "Valid start and end times are required" });
  }

  if (seatsTotal == null || seatsTotal <= 0) {
    return res.status(400).json({ error: "seatsTotal must be greater than 0" });
  }

  if (seatsAvailable == null || seatsAvailable < 0 || seatsAvailable > seatsTotal) {
    return res.status(400).json({ error: "seatsAvailable must be between 0 and seatsTotal" });
  }

  const [created] = await db
    .insert(classSessions)
    .values({
      classProductId,
      venueId,
      startTime,
      endTime,
      seatsTotal,
      seatsAvailable,
    })
    .returning();

  res.json(created);
});

router.patch("/:id", requireModernAdmin, async (req, res) => {
  const id = Number(req.params.id);
  const body = req.body ?? {};
  const venueId = body.venueId == null || body.venueId === "" ? null : Number(body.venueId);
  const startTime = normalizeAdminDateTime(body.startTime);
  const endTime = normalizeAdminDateTime(body.endTime);
  const seatsTotal = normalizePositiveInt(body.seatsTotal);
  const seatsAvailable = normalizePositiveInt(body.seatsAvailable);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  if (!startTime || !endTime) {
    return res.status(400).json({ error: "Valid start and end times are required" });
  }

  if (seatsTotal == null || seatsTotal <= 0) {
    return res.status(400).json({ error: "seatsTotal must be greater than 0" });
  }

  if (seatsAvailable == null || seatsAvailable < 0 || seatsAvailable > seatsTotal) {
    return res.status(400).json({ error: "seatsAvailable must be between 0 and seatsTotal" });
  }

  const [updated] = await db
    .update(classSessions)
    .set({
      venueId,
      startTime,
      endTime,
      seatsTotal,
      seatsAvailable,
    })
    .where(eq(classSessions.id, id))
    .returning();

  res.json(updated);
});

router.delete("/:id", requireModernAdmin, async (req, res) => {
  const id = Number(req.params.id);

  if (!Number.isFinite(id)) {
    return res.status(400).json({ error: "Invalid id" });
  }

  await db.delete(classSessions).where(eq(classSessions.id, id));

  res.json({ ok: true });
});

export default router;
