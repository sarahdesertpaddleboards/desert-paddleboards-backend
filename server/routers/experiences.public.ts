import { Router } from "express";

/**
 * Public feed of upcoming FareHarbor sessions across all Desert Paddleboards
 * experiences.
 *
 * Why this exists: FareHarbor's public JSON API does NOT send CORS headers,
 * so the browser cannot call it directly. This endpoint proxies + caches the
 * per-item month calendars server-side and returns a single flat list of
 * upcoming, bookable sessions. The frontend joins these to its own venue
 * metadata (coords, images, slugs) by itemId.
 *
 * Booking itself still happens entirely in FareHarbor via the Lightframe
 * embed — this is read-only discovery data.
 */

const router = Router();

const SHORTNAME = "desertpaddleboards";

// Fixed-location venues whose FareHarbor primary_location has no lat/lng, so
// the coords heuristic below would miss them. Keep in sync with
// FORCE_LOCATION_IDS in the frontend (locations.ts / generate-seo-data.mjs).
const FORCE_LOCATION_IDS = new Set<number>([626146]); // Aji Spa

const MONTHS_AHEAD = 2; // current month + this many following months
const CACHE_TTL_MS = 30 * 60 * 1000; // 30 minutes

export interface UpcomingSession {
  itemId: number;
  availabilityPk: number;
  /** Local start time as returned by FareHarbor, e.g. 2026-06-14T19:00:00-0700 */
  startAt: string;
  endAt: string;
  /** Approximate spots remaining, or null if unknown */
  spotsLeft: number | null;
  isSoldOut: boolean;
}

let cache: { at: number; data: UpcomingSession[] } | null = null;

function monthsToFetch(now: Date): Array<{ year: number; month: number }> {
  const out: Array<{ year: number; month: number }> = [];
  for (let i = 0; i <= MONTHS_AHEAD; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    out.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }
  return out;
}

async function fetchItemMonth(
  itemId: number,
  year: number,
  month: number,
): Promise<UpcomingSession[]> {
  const mm = String(month).padStart(2, "0");
  const url = `https://fareharbor.com/api/v1/companies/${SHORTNAME}/items/${itemId}/calendar/${year}/${mm}/`;

  const res = await fetch(url, {
    headers: { "User-Agent": "DesertPaddleboards-Site/1.0" },
  });
  if (!res.ok) return [];

  const json: any = await res.json();
  const weeks: any[] = json?.calendar?.weeks ?? [];
  const out: UpcomingSession[] = [];

  for (const week of weeks) {
    for (const day of week?.days ?? []) {
      if (day?.month !== "current") continue; // skip spillover days from adjacent months
      for (const av of day?.availabilities ?? []) {
        if (!av?.is_bookable) continue;
        out.push({
          itemId,
          availabilityPk: av.pk,
          startAt: av.start_at,
          endAt: av.end_at,
          spotsLeft:
            typeof av.approximate_available_capacity === "number"
              ? av.approximate_available_capacity
              : null,
          isSoldOut: Boolean(av.is_sold_out),
        });
      }
    }
  }
  return out;
}

/**
 * Fetch the live FareHarbor item list and return the ids of fixed-location
 * experiences shown on the site: listed, non-retail, and having coordinates
 * in their primary_location (or in FORCE_LOCATION_IDS). This means new venues
 * added in FareHarbor flow into the homepage feed automatically — no hardcoded
 * id list to drift. Falls back to the force list on any failure.
 */
async function fetchLocationItemIds(): Promise<number[]> {
  try {
    const url = `https://fareharbor.com/api/v1/companies/${SHORTNAME}/items/`;
    const res = await fetch(url, {
      headers: { "User-Agent": "DesertPaddleboards-Site/1.0" },
    });
    if (!res.ok) throw new Error(`items list HTTP ${res.status}`);
    const json: any = await res.json();
    const items: any[] = json?.items ?? [];
    const ids = items
      .filter((it) => {
        if (it?.is_archived || it?.is_private || it?.is_unlisted || it?.is_retail)
          return false;
        const pl = it?.primary_location ?? {};
        const hasCoords =
          typeof pl.latitude === "number" && typeof pl.longitude === "number";
        return hasCoords || FORCE_LOCATION_IDS.has(it.pk);
      })
      .map((it) => it.pk as number);
    return ids.length > 0 ? ids : [...FORCE_LOCATION_IDS];
  } catch {
    return [...FORCE_LOCATION_IDS];
  }
}

async function buildFeed(): Promise<UpcomingSession[]> {
  const now = new Date();
  const months = monthsToFetch(now);
  const itemIds = await fetchLocationItemIds();

  const tasks: Promise<UpcomingSession[]>[] = [];
  for (const itemId of itemIds) {
    for (const { year, month } of months) {
      tasks.push(
        fetchItemMonth(itemId, year, month).catch(() => [] as UpcomingSession[]),
      );
    }
  }

  const results = await Promise.all(tasks);
  const nowMs = now.getTime();

  return results
    .flat()
    .filter((s) => {
      const t = Date.parse(s.startAt);
      return Number.isFinite(t) && t > nowMs;
    })
    .sort((a, b) => a.startAt.localeCompare(b.startAt));
}

// GET /experiences/upcoming
router.get("/upcoming", async (_req, res) => {
  try {
    if (!cache || Date.now() - cache.at > CACHE_TTL_MS) {
      cache = { at: Date.now(), data: await buildFeed() };
    }
    res.json({
      generatedAt: new Date(cache.at).toISOString(),
      shortname: SHORTNAME,
      sessions: cache.data,
    });
  } catch {
    // Never break the homepage — degrade to an empty feed.
    res.status(200).json({
      generatedAt: new Date().toISOString(),
      shortname: SHORTNAME,
      sessions: [],
      error: "feed_unavailable",
    });
  }
});

export default router;
