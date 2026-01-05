import { Router } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db";
import { adminUsers } from "../db/schema";
import { eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

export const adminAuthRouter = Router();

/**
 * POST /admin/login
 *
 * Body:
 * {
 *   "email": string,
 *   "password": string
 * }
 *
 * Sets admin session cookie if valid
 */
adminAuthRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body ?? {};

    if (!email || !password) {
      return res.status(400).json({ error: "Missing email or password" });
    }

    /**
     * 1️⃣ Find admin user
     */
    const admin = await db
      .select()
      .from(adminUsers)
      .where(eq(adminUsers.email, email))
      .limit(1)
      .then(r => r[0]);

    if (!admin) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    /**
     * 2️⃣ Verify password
     */
    const valid = await bcrypt.compare(password, admin.passwordHash);

    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }
    console.log("ADMIN LOGIN", {
      email,
      hasHash: Boolean(admin.passwordHash),
      hashPreview: admin.passwordHash?.slice(0, 7),
    });
    
    /**
     * 3️⃣ Create admin session
     * sdk handles cookie creation
     */

    console.log("ADMIN SESSION ENV CHECK", {
      hasAdminSecret: Boolean(process.env.ADMIN_SESSION_SECRET),
      hasJwtSecret: Boolean(process.env.JWT_SECRET),
      hasCookieSecret: Boolean(process.env.COOKIE_SECRET),
    });
    await sdk.createAdminSession(res, {
      adminId: admin.id,
      email: admin.email,
    });

    return res.json({ success: true });
  } catch (err) {
    console.error("ADMIN LOGIN ERROR", err);
    return res.status(500).json({ error: "Login failed" });
  }
});

/**
 * POST /admin/logout
 */
adminAuthRouter.post("/logout", async (_req, res) => {
  sdk.clearAdminSession(res);
  return res.json({ success: true });
});
