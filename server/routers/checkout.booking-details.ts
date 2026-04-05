import { Router } from "express";
import { db } from "../db";
import { bookingDetails } from "../db/schema";
import { eq, sql } from "drizzle-orm";

const router = Router();

type Participant = {
  firstName?: string;
  lastName?: string;
  age?: string;
  email?: string;
};

async function ensureBookingDetailsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS booking_details (
      id INT AUTO_INCREMENT PRIMARY KEY,
      stripe_session_id VARCHAR(255) NOT NULL UNIQUE,
      special_requests TEXT NULL,
      participants_json TEXT NULL,
      updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

router.get("/booking-details/:sessionId", async (req, res) => {
  const bookingSessionId = req.params.sessionId;
  if (!bookingSessionId) return res.status(400).json({ error: "Missing booking session id" });

  await ensureBookingDetailsTable();

  const row = await db
    .select()
    .from(bookingDetails)
    .where(eq(bookingDetails.stripeSessionId, bookingSessionId))
    .limit(1)
    .then((r) => r[0]);

  if (!row) {
    return res.json({ specialRequests: "", participants: [] });
  }

  let participants: Participant[] = [];
  try {
    participants = row.participantsJson ? JSON.parse(row.participantsJson) : [];
  } catch {
    participants = [];
  }

  return res.json({
    specialRequests: row.specialRequests || "",
    participants,
  });
});

router.post("/booking-details/:sessionId", async (req, res) => {
  const bookingSessionId = req.params.sessionId;
  if (!bookingSessionId) return res.status(400).json({ error: "Missing booking session id" });

  const { specialRequests, participants } = req.body ?? {};

  const sanitizedParticipants = Array.isArray(participants)
    ? participants.map((p) => ({
        firstName: typeof p?.firstName === "string" ? p.firstName.trim() : "",
        lastName: typeof p?.lastName === "string" ? p.lastName.trim() : "",
        age: typeof p?.age === "string" ? p.age.trim() : "",
        email: typeof p?.email === "string" ? p.email.trim() : "",
      }))
    : [];

  await ensureBookingDetailsTable();

  const existing = await db
    .select()
    .from(bookingDetails)
    .where(eq(bookingDetails.stripeSessionId, bookingSessionId))
    .limit(1)
    .then((r) => r[0]);

  const payload = {
    specialRequests: typeof specialRequests === "string" ? specialRequests.trim() : "",
    participantsJson: JSON.stringify(sanitizedParticipants),
  };

  if (existing) {
    await db
      .update(bookingDetails)
      .set({ ...payload, updatedAt: new Date() })
      .where(eq(bookingDetails.stripeSessionId, bookingSessionId));
  } else {
    await db.insert(bookingDetails).values({
      stripeSessionId: bookingSessionId,
      ...payload,
      updatedAt: new Date(),
    });
  }

  return res.json({ ok: true, saved: { specialRequests: payload.specialRequests, participants: sanitizedParticipants } });
});

export default router;
