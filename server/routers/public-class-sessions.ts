import { Router } from "express";
import { db } from "../db";
import { classSessions } from "../db/schema";

export const publicClassSessionsRouter = Router();

publicClassSessionsRouter.get("/", async (_req, res) => {
  try {
    const sessions = await db.select().from(classSessions);
    return res.json(sessions);
  } catch (err) {
    console.error("PUBLIC CLASS SESSIONS ERROR", err);
    return res.status(500).json({ error: "Failed to load class sessions" });
  }
});
