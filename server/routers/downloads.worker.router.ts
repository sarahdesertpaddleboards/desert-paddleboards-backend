import { Router } from "express";
import { db } from "../db";
import { purchases, orders } from "../db/schema";
import { eq } from "drizzle-orm";

export const downloadsWorkerRouter = Router();

/**
 * Map productKey -> R2 objectKey
 * These object keys must match what you uploaded to the R2 bucket.
 */
const PRODUCT_TO_OBJECT_KEY: Record<string, string> = {
  SONORAN_ECHOES_DIGITAL: "digital/sonoran-echoes.zip",
  BLACK_CANYON_GUIDE: "guides/black-canyon.pdf",
  LEES_FERRY_GUIDE: "guides/lees-ferry.pdf",
  // add the rest here as you upload them
};

/**
 * Security: only the Worker may call this.
 */
function requireWorker(req: any) {
  const secret = req.headers["x-worker-secret"];
  if (!secret || secret !== process.env.DOWNLOAD_WORKER_SECRET) {
    return false;
  }
  return true;
}

/**
 * GET /downloads/verify/:purchaseId
 *
 * Called by Cloudflare Worker.
 * Returns { objectKey } if the purchase is valid and fulfilled.
 */
downloadsWorkerRouter.get("/verify/:purchaseId", async (req, res) => {
  try {
    if (!requireWorker(req)) {
      return res.status(401).send("Unauthorized");
    }

    const { purchaseId } = req.params;

    // 1) Load purchase
    const purchase = await db
      .select()
      .from(purchases)
      .where(eq(purchases.id, purchaseId))
      .limit(1)
      .then(r => r[0]);

    if (!purchase) {
      return res.status(404).send("Purchase not found");
    }

    // 2) Load order, must be fulfilled
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, purchase.orderId))
      .limit(1)
      .then(r => r[0]);

    if (!order || order.status !== "fulfilled") {
      return res.status(403).send("Not authorized");
    }

    // 3) Convert productKey -> objectKey
    const objectKey = PRODUCT_TO_OBJECT_KEY[purchase.productKey];
    if (!objectKey) {
      return res.status(500).send("No file mapped for this product");
    }

    return res.json({
      ok: true,
      purchaseId: purchase.id,
      productKey: purchase.productKey,
      objectKey,
    });
  } catch (err) {
    console.error("DOWNLOAD VERIFY ERROR", err);
    return res.status(500).send("Download unavailable");
  }
});
