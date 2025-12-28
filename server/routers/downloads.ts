import { Router } from "express";
import { db } from "../db";
import { downloads } from "../db/schema";
import { eq } from "drizzle-orm";

export const downloadRouter = Router();

/**
 * ============================================
 * GET /downloads/verify/:token
 *
 * PURPOSE:
 * - Called ONLY by the Cloudflare Worker
 * - Validates a download token
 * - Tells the Worker WHICH file (R2 object) to serve
 *
 * IMPORTANT:
 * - This endpoint DOES NOT consume the token
 * - Consumption happens AFTER a successful download
 * ============================================
 */
downloadRouter.get("/verify/:token", async (req, res) => {
  try {
    // 1️⃣ Authenticate the Cloudflare Worker
    const workerSecret = req.header("x-worker-secret");

    if (
      !workerSecret ||
      workerSecret !== process.env.DOWNLOAD_WORKER_SECRET
    ) {
      return res.status(401).json({ error: "Unauthorized worker" });
    }

    // 2️⃣ Validate token exists
    const token = req.params.token;
    if (!token) {
      return res.status(400).json({ error: "Missing token" });
    }

    // 3️⃣ Load download record
    const [record] = await db
      .select()
      .from(downloads)
      .where(eq(downloads.token, token))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: "Invalid token" });
    }

    // 4️⃣ Token already used?
    if (record.usedAt) {
      return res.status(410).json({ error: "Token already used" });
    }

    // 5️⃣ Token expired?
    if (record.expiresAt && record.expiresAt < new Date()) {
      return res.status(410).json({ error: "Token expired" });
    }

    // 6️⃣ Map product → R2 object key
    // MVP: explicit mapping (boring but safe)
    const objectKeyByProduct: Record<string, string> = {
      SONORAN_ECHOES_DIGITAL: "sonoran-echoes.zip",
      // add more products here later
    };

    const objectKey = objectKeyByProduct[record.productKey];

    if (!objectKey) {
      return res.status(500).json({
        error: `No R2 object mapped for productKey ${record.productKey}`,
      });
    }

    // 7️⃣ Return info to Worker
    return res.json({
      ok: true,
      productKey: record.productKey,
      objectKey,
      expiresAt: record.expiresAt,
    });
  } catch (err) {
    console.error("DOWNLOAD VERIFY ERROR", err);
    return res.status(500).json({ error: "Download verification failed" });
  }
});

/**
 * ============================================
 * POST /downloads/consume/:token
 *
 * PURPOSE:
 * - Called by Cloudflare Worker AFTER successful download
 * - Marks the token as used (single-use)
 * ============================================
 */
downloadRouter.post("/consume/:token", async (req, res) => {
  try {
    // Authenticate Worker
    const workerSecret = req.header("x-worker-secret");
    if (
      !workerSecret ||
      workerSecret !== process.env.DOWNLOAD_WORKER_SECRET
    ) {
      return res.status(401).json({ error: "Unauthorized worker" });
    }

    const token = req.params.token;

    const [record] = await db
      .select()
      .from(downloads)
      .where(eq(downloads.token, token))
      .limit(1);

    if (!record) {
      return res.status(404).json({ error: "Invalid token" });
    }

    if (record.usedAt) {
      return res.status(409).json({ error: "Already consumed" });
    }

    await db
      .update(downloads)
      .set({ usedAt: new Date() })
      .where(eq(downloads.token, token));

    return res.json({ ok: true });
  } catch (err) {
    console.error("DOWNLOAD CONSUME ERROR", err);
    return res.status(500).json({ error: "Consume failed" });
  }
});
