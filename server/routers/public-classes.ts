// server/routers/public-classes.ts
import { Router } from "express";
import { db } from "../db";
import { classProducts, classSessions } from "../db/schema";
import { eq } from "drizzle-orm";

export const publicClassesRouter = Router();

// -----------------------------------------------------
// GET /classes/products  → all class products
// -----------------------------------------------------
publicClassesRouter.get("/products", async (_req, res) => {
  try {
    const items = await db.select().from(classProducts);
    return res.json(items);
  } catch (err) {
    console.error("PUBLIC CLASS PRODUCTS ERROR", err);
    return res.status(500).json({ error: "Failed to load class products" });
  }
});

// -----------------------------------------------------
// GET /classes/products/:id → one class product
// -----------------------------------------------------
publicClassesRouter.get("/products/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    const item = await db
      .select()
      .from(classProducts)
      .where(eq(classProducts.id, id))
      .then((r) => r[0]);

    if (!item) return res.status(404).json({ error: "Not found" });
    return res.json(item);
  } catch (err) {
    console.error("PUBLIC CLASS PRODUCT ERROR", err);
    return res.status(500).json({ error: "Failed to load class product" });
  }
});

// -----------------------------------------------------
// GET /classes/products/:id/sessions
// -----------------------------------------------------
publicClassesRouter.get("/products/:id/sessions", async (req, res) => {
  try {
    const id = Number(req.params.id);

    const sessions = await db
      .select()
      .from(classSessions)
      .where(eq(classSessions.classProductId, id));

    return res.json(sessions);
  } catch (err) {
    console.error("PUBLIC CLASS SESSIONS ERROR", err);
    return res.status(500).json({ error: "Failed to load class sessions" });
  }
});

// -----------------------------------------------------
// GET /classes/sessions/:sessionId
// -----------------------------------------------------
publicClassesRouter.get("/sessions/:sessionId", async (req, res) => {
  try {
    const id = Number(req.params.sessionId);

    const session = await db
      .select()
      .from(classSessions)
      .where(eq(classSessions.id, id))
      .then((r) => r[0]);

    if (!session) return res.status(404).json({ error: "Not found" });
    return res.json(session);
  } catch (err) {
    console.error("PUBLIC CLASS SESSION ERROR", err);
    return res.status(500).json({ error: "Failed to load class session" });
  }
});
