import { Router } from "express";
import { db } from "../db";
import { purchases, orders } from "../db/schema";
import { eq } from "drizzle-orm";

export const checkoutSuccessRouter = Router();

/**
 * GET /checkout/success/:sessionId
 *
 * Returns everything the frontend needs to render the success page
 */
checkoutSuccessRouter.get("/success/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;

    /**
     * 1️⃣ Load the order
     */
    const order = await db
      .select()
      .from(orders)
      .where(eq(orders.id, sessionId))
      .limit(1)
      .then(r => r[0]);

    if (!order || order.status !== "fulfilled") {
      return res.status(404).json({ error: "Order not found or not fulfilled" });
    }

    /**
     * 2️⃣ Load purchases created from this checkout
     */
    const purchaseRows = await db
      .select()
      .from(purchases)
      .where(eq(purchases.stripeSessionId, sessionId));

    /**
     * 3️⃣ Map product metadata
     * (centralised here, not in frontend)
     */
    const productMeta: Record<string, { title: string; type: string }> = {
      SONORAN_ECHOES_DIGITAL: {
        title: "Sonoran Echoes – Digital Album",
        type: "digital",
      },
      BLACK_CANYON_GUIDE: {
        title: "Black Canyon Paddleboarding Guide",
        type: "digital",
      },
      LEES_FERRY_GUIDE: {
        title: "Lees Ferry Adventure Guide",
        type: "digital",
      },
      GIFT_CERT_40: {
        title: "Gift Certificate – $40",
        type: "gift",
      },
      GIFT_CERT_75: {
        title: "Gift Certificate – $75",
        type: "gift",
      },
      SOUNDBATH_PUBLIC: {
        title: "Floating Soundbath – Public Pool",
        type: "class",
      },
      SOUNDBATH_RESORT: {
        title: "Floating Soundbath – Resort Class",
        type: "class",
      },
    };

    /**
     * 4️⃣ Shape response
     */
    const purchasesResponse = purchaseRows.map(p => ({
      id: p.id,
      productKey: p.productKey,
      title: productMeta[p.productKey]?.title ?? p.productKey,
      type: productMeta[p.productKey]?.type ?? "unknown",
    }));

    return res.json({
      sessionId,
      customerEmail: order.customerEmail,
      purchases: purchasesResponse,
    });
  } catch (err) {
    console.error("CHECKOUT SUCCESS ERROR", err);
    return res.status(500).json({ error: "Unable to load success details" });
  }
});
