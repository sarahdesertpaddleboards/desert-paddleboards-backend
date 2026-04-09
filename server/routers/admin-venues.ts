import { Router } from "express";
import { sdk } from "../_core/sdk";
import { db } from "../db";
import { venues } from "../db/schema";
import { asc } from "drizzle-orm";

export const adminVenuesRouter = Router();

adminVenuesRouter.get("/", async (req, res) => {
  try {
    await sdk.requireAdmin(req);

    const result = await db
      .select()
      .from(venues)
      .orderBy(asc(venues.name));

    res.json(result);
  } catch (err) {
    console.error("ADMIN VENUES ERROR:", err);
    res.status(401).json({ error: "Unauthorized" });
  }
});
