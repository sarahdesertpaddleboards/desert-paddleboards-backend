import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { classSessions, classProducts, venues } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

function formatIcsDate(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

router.get("/calendar/:sessionId.ics", async (req, res) => {
  try {
    const stripeSessionId = req.params.sessionId;
    if (!stripeSessionId) {
      return res.status(400).json({ error: "Missing session id" });
    }

    const stripeSession = await stripe.checkout.sessions.retrieve(stripeSessionId);
    const bookedSessionId = Number(stripeSession.metadata?.sessionId || "");

    if (!Number.isFinite(bookedSessionId)) {
      return res.status(404).json({ error: "No booked session found" });
    }

    const bookedSession = await db
      .select({
        id: classSessions.id,
        startTime: classSessions.startTime,
        endTime: classSessions.endTime,
        venueName: venues.name,
        venueCity: venues.city,
        venueState: venues.state,
        className: classProducts.name,
      })
      .from(classSessions)
      .leftJoin(venues, eq(classSessions.venueId, venues.id))
      .leftJoin(classProducts, eq(classSessions.classProductId, classProducts.id))
      .where(eq(classSessions.id, bookedSessionId))
      .limit(1)
      .then((r) => r[0]);

    if (!bookedSession) {
      return res.status(404).json({ error: "Booked session not found" });
    }

    const start = new Date(bookedSession.startTime);
    const end = new Date(bookedSession.endTime);

    const summary = bookedSession.className || "Desert Paddleboards Booking";
    const location = [bookedSession.venueName, bookedSession.venueCity, bookedSession.venueState]
      .filter(Boolean)
      .join(", ");
    const description = `Your Desert Paddleboards booking is confirmed for ${summary}.`;
    const uid = `${stripeSessionId}@desertpaddleboards.vercel.app`;
    const dtstamp = formatIcsDate(new Date());

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Desert Paddleboards//Booking Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART:${formatIcsDate(start)}`,
      `DTEND:${formatIcsDate(end)}`,
      `SUMMARY:${escapeIcsText(summary)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      `LOCATION:${escapeIcsText(location)}`,
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");

    res.setHeader("Content-Type", "text/calendar; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename="booking-${bookedSession.id}.ics"`);
    return res.send(ics);
  } catch (err) {
    console.error("Checkout calendar error:", err);
    return res.status(500).json({ error: "Failed to generate calendar file" });
  }
});

export default router;
