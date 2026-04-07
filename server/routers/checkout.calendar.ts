import { Router } from "express";
import Stripe from "stripe";
import { db } from "../db";
import { classSessions, classProducts, venues } from "../db/schema";
import { eq } from "drizzle-orm";

const router = Router();
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-06-20",
});

function formatUtcStamp(value: Date) {
  return value.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z");
}

function formatZonedLocal(value: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}${get("month")}${get("day")}T${get("hour")}${get("minute")}${get("second")}`;
}

function escapeIcsText(value: string) {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

function timezoneBlock(timeZone: string) {
  if (timeZone === "America/Phoenix") {
    return [
      "BEGIN:VTIMEZONE",
      "TZID:America/Phoenix",
      "X-LIC-LOCATION:America/Phoenix",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:-0700",
      "TZOFFSETTO:-0700",
      "TZNAME:MST",
      "DTSTART:19700101T000000",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
  }

  if (timeZone === "America/Los_Angeles") {
    return [
      "BEGIN:VTIMEZONE",
      "TZID:America/Los_Angeles",
      "X-LIC-LOCATION:America/Los_Angeles",
      "BEGIN:DAYLIGHT",
      "TZOFFSETFROM:-0800",
      "TZOFFSETTO:-0700",
      "TZNAME:PDT",
      "DTSTART:19700308T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=3;BYDAY=2SU",
      "END:DAYLIGHT",
      "BEGIN:STANDARD",
      "TZOFFSETFROM:-0700",
      "TZOFFSETTO:-0800",
      "TZNAME:PST",
      "DTSTART:19701101T020000",
      "RRULE:FREQ=YEARLY;BYMONTH=11;BYDAY=1SU",
      "END:STANDARD",
      "END:VTIMEZONE",
    ].join("\r\n");
  }

  return [
    "BEGIN:VTIMEZONE",
    `TZID:${timeZone}`,
    `X-LIC-LOCATION:${timeZone}`,
    "BEGIN:STANDARD",
    "TZOFFSETFROM:+0000",
    "TZOFFSETTO:+0000",
    "TZNAME:UTC",
    "DTSTART:19700101T000000",
    "END:STANDARD",
    "END:VTIMEZONE",
  ].join("\r\n");
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
        venueTimezone: venues.timezone,
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
    const venueTimezone = bookedSession.venueTimezone || "America/Phoenix";

    const summary = bookedSession.className || "Blue Wave Experiences Booking";
    const location = [bookedSession.venueName, bookedSession.venueCity, bookedSession.venueState]
      .filter(Boolean)
      .join(", ");
    const description = `Your Blue Wave Experiences booking is confirmed for ${summary}.`;
    const uid = `${stripeSessionId}@desertpaddleboards.vercel.app`;
    const dtstamp = formatUtcStamp(new Date());

    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Blue Wave Experiences//Booking Calendar//EN",
      "CALSCALE:GREGORIAN",
      "METHOD:PUBLISH",
      timezoneBlock(venueTimezone),
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;TZID=${venueTimezone}:${formatZonedLocal(start, venueTimezone)}`,
      `DTEND;TZID=${venueTimezone}:${formatZonedLocal(end, venueTimezone)}`,
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
