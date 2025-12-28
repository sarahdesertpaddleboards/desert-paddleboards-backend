import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { adminUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";
import { COOKIE_NAME, ONE_YEAR_MS } from "@shared/const";
import { getAdminById } from "../db";

export const adminAuthRouter = Router();

/**
 * POST /admin/login
 */
adminAuthRouter.post("/login", async (req, res) => {
  const { email, password } = req.body ?? {};

  if (!email || !password) {
    return res.status(400).json({ error: "Missing email or password" });
  }

  const admin = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.email, email))
    .limit(1)
    .then((rows) => rows[0]);

  if (!admin) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const isValid = await bcrypt.compare(password, admin.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  const token = await sdk.createSessionToken(String(admin.id), {
    name: admin.email,
    expiresInMs: ONE_YEAR_MS,
  });

  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ONE_YEAR_MS,
  });

  return res.json({ success: true });
});

/**
 * GET /admin/me
 */
adminAuthRouter.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.[COOKIE_NAME];
    if (!token) {
      return res.status(401).json({ error: "Not authenticated" });
    }

    const session = await sdk.verifySession(token);
    if (!session) {
      return res.status(401).json({ error: "Invalid session" });
    }

    const adminId = Number(session.adminUserId);
    if (!adminId) {
      return res.status(401).json({ error: "Invalid admin id" });
    }

    const admin = await getAdminById(adminId);
    if (!admin) {
      return res.status(401).json({ error: "Admin not found" });
    }

    return res.json({
      id: admin.id,
      email: admin.email,
    });
  } catch (err) {
    console.error("ADMIN /me ERROR", err);
    return res.status(500).json({ error: "Internal error" });
  }
});
