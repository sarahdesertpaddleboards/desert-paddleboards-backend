import { Router } from "express";
import fs from "fs";
import path from "path";

const router = Router();
const dataDir = path.resolve(process.cwd(), "server", "data");
const dataFile = path.join(dataDir, "booking-details.json");

type Participant = {
  firstName?: string;
  lastName?: string;
  age?: string;
  email?: string;
};

type StoredBookingDetails = {
  specialRequests?: string;
  participants?: Participant[];
  updatedAt: string;
};

function readStore(): Record<string, StoredBookingDetails> {
  try {
    if (!fs.existsSync(dataFile)) return {};
    const raw = fs.readFileSync(dataFile, "utf8");
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function writeStore(store: Record<string, StoredBookingDetails>) {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(dataFile, JSON.stringify(store, null, 2), "utf8");
}

router.get("/booking-details/:sessionId", async (req, res) => {
  const bookingSessionId = req.params.sessionId;
  if (!bookingSessionId) return res.status(400).json({ error: "Missing booking session id" });

  const store = readStore();
  return res.json(store[bookingSessionId] || { specialRequests: "", participants: [] });
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

  const store = readStore();
  store[bookingSessionId] = {
    specialRequests: typeof specialRequests === "string" ? specialRequests.trim() : "",
    participants: sanitizedParticipants,
    updatedAt: new Date().toISOString(),
  };
  writeStore(store);

  return res.json({ ok: true, saved: store[bookingSessionId] });
});

export default router;
