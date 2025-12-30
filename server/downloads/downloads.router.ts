import { Router } from "express";
import { db } from "../db";
import { purchases, orders } from "../db/schema";
import { eq } from "drizzle-orm";

export const downloadsRouter = Router();

/**
 * ============================================================
 * USER-FACING DOWNLOAD ENTRYPOINT
 * ============================================================
 *
 * GET /downloads/:purchaseId
 *
 * This endpoint is hit by the USER'S BROWSER.
 *
 * Responsibilities:
 *  - Verify the purchase exists
 *  - Verify the related order was fulfilled
 *  - Redirect the browser to the Cloudflare Worker
 *
 * IMPORTANT:
 *  - This endpoint NEVER serves files
 *  - It only performs entitlement checks + redirect
 */
downloadsRouter.get("/:purchaseId", async (req, res) => {
  try {
    const purchaseId = Number(req.params.purchaseId);

    if (Number.isNaN(purchaseId)) {
      return res.status(400).send("Invalid purchase id");
    }

    /**
     * 1️⃣ Load purchase record
     *
     * purchases.id = INTERNAL entitlement ID
     * This represents "someone is allowed to download something"
     */
    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1)
      .then(r => r[0]);

    if (!purchase) {
      return res.status(404).send("Download not found");
    }

    /**
     * 2️⃣ Load related order
     *
     * CRITICAL:
     * - orders.id === Stripe session ID
     * - purchases.stripe_session_id stores that value
     *
     * This represents "money was paid AND fulfilled"
     */
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, purchase.stripeSessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order || order.status !== "fulfilled") {
      return res.status(403).send("Not authorized");
    }

    /**
     * 3️⃣ Redirect browser to Cloudflare Worker
     *
     * The Worker:
     *  - Does NOT trust the browser
     *  - Will call back to /downloads/verify/:purchaseId
     *  - Will stream the file from R2
     */
    const workerBaseUrl = process.env.DOWNLOAD_WORKER_URL;

    if (!workerBaseUrl) {
      console.error("DOWNLOAD_WORKER_URL not set");
      return res.status(500).send("Download unavailable");
    }

    const workerUrl = `${workerBaseUrl}/download/${purchase.id}`;

    return res.redirect(workerUrl);
  } catch (err) {
    console.error("DOWNLOAD ENTRY ERROR", err);
    return res.status(500).send("Download unavailable");
  }
});

/**
 * ============================================================
 * WORKER VERIFICATION ENDPOINT
 * ============================================================
 *
 * GET /downloads/verify/:purchaseId
 *
 * This endpoint is called ONLY by the Cloudflare Worker.
 * NEVER by a browser.
 *
 * Responsibilities:
 *  - Authenticate the Worker (shared secret)
 *  - Verify purchase exists
 *  - Verify related order is fulfilled
 *  - Map product → R2 object key
 *  - Return metadata so the Worker can stream the file
 */
downloadsRouter.get("/verify/:purchaseId", async (req, res) => {
  try {
    /**
     * 1️⃣ Authenticate Worker
     *
     * Shared secret prevents public abuse.
     * Only the Worker knows this value.
     */
    const workerSecret = req.header("x-worker-secret");

    if (
      !workerSecret ||
      workerSecret !== process.env.DOWNLOAD_WORKER_SECRET
    ) {
      return res.status(401).json({ error: "Unauthorized worker" });
    }

    const purchaseId = Number(req.params.purchaseId);

    if (Number.isNaN(purchaseId)) {
      return res.status(400).json({ error: "Invalid purchase id" });
    }

    /**
     * 2️⃣ Load purchase
     */
    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1)
      .then(r => r[0]);

    if (!purchase) {
      return res.status(404).json({ error: "Purchase not found" });
    }

    /**
     * 3️⃣ Load order USING Stripe session ID
     *
     * This was the bug earlier:
     * - You must join via purchases.stripe_session_id
     * - NOT via purchase.id
     */
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, purchase.stripeSessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order || order.status !== "fulfilled") {
      return res.status(403).json({ error: "Not fulfilled" });
    }

    /**
     * 4️⃣ Map product → R2 object key
     *
     * This mapping is explicit on purpose:
     * - No guessing
     * - No dynamic filenames
     * - No accidental cross-delivery
     */
    const objectKeyByProduct: Record<string, string> = {
      SONORAN_ECHOES_DIGITAL: "sonoran-echoes.zip",
      BLACK_CANYON_GUIDE: "black-canyon-guide.pdf",
      LEES_FERRY_GUIDE: "lees-ferry-guide.pdf",
    };

    const objectKey = objectKeyByProduct[purchase.productKey];

    if (!objectKey) {
      return res.status(500).json({
        error: `No file mapped for product ${purchase.productKey}`,
      });
    }

    /**
     * 5️⃣ Respond to Worker
     *
     * The Worker will now:
     *  - Fetch this objectKey from R2
     *  - Stream it to the user
     */
    return res.json({
      ok: true,
      purchaseId,
      productKey: purchase.productKey,
      objectKey,
    });
  } catch (err) {
    console.error("DOWNLOAD VERIFY ERROR", err);
    return res.status(500).json({ error: "Verification failed" });
  }
});
