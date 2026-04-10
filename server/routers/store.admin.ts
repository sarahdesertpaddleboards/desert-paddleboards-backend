// server/routers/store.admin.ts
import { Router } from "express";
import { db } from "../db";
import { productOverrides, products } from "../db/schema";
import { and, eq } from "drizzle-orm";
import { sdk } from "../_core/sdk";

async function requireModernAdmin(req: any, res: any, next: any) {
  try {
    await sdk.requireAdmin(req);
    next();
  } catch {
    res.status(401).json({ error: "Unauthorized" });
  }
}

const router = Router();

async function loadCatalogItems() {
  const rows = await db
    .select({
      id: products.id,
      productKey: products.productKey,
      type: products.type,
      name: products.name,
      description: products.description,
      price: products.price,
      currency: products.currency,
      imageUrl: products.imageUrl,
      active: products.active,
      overrideId: productOverrides.id,
      overrideName: productOverrides.overrideName,
      overrideDescription: productOverrides.overrideDescription,
      overridePrice: productOverrides.overridePrice,
      digitalObjectKey: productOverrides.digitalObjectKey,
    })
    .from(products)
    .leftJoin(productOverrides, eq(productOverrides.productId, products.id));

  return rows;
}

// GET ALL
router.get("/", requireModernAdmin, async (_req, res) => {
  try {
    const items = await loadCatalogItems();
    res.json(items);
  } catch (err) {
    console.error("STORE ADMIN LIST ERROR", err);
    res.status(500).json({ error: "Failed to load catalog items" });
  }
});

// CREATE PRODUCT
router.post("/", requireModernAdmin, async (req, res) => {
  try {
    const data = req.body as any;
    const productKey = String(data?.productKey || "").trim();
    const name = String(data?.name || "").trim();
    const type = String(data?.type || "").trim();
    const currency = String(data?.currency || "usd").trim() || "usd";
    const price = Number(data?.price);
    const description = typeof data?.description === "string" ? data.description.trim() : null;
    const imageUrl = typeof data?.imageUrl === "string" ? data.imageUrl.trim() : null;
    const active = data?.active !== false;

    if (!productKey || !name || !type || !Number.isFinite(price)) {
      return res.status(400).json({ error: "productKey, name, type, and price are required" });
    }

    await db.insert(products).values({
      productKey,
      name,
      type,
      description: description || null,
      price,
      currency,
      imageUrl: imageUrl || null,
      active,
    });

    const [created] = await db
      .select()
      .from(products)
      .where(eq(products.productKey, productKey))
      .limit(1);

    res.json(created ?? null);
  } catch (err) {
    console.error("STORE ADMIN CREATE ERROR", err);
    res.status(500).json({ error: "Failed to create catalog item" });
  }
});

// UPDATE PRODUCT / OVERRIDES
router.patch("/:id", requireModernAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    const body = req.body ?? {};
    const productUpdates: Record<string, any> = {};
    const overrideUpdates: Record<string, any> = {};

    if ("name" in body) productUpdates.name = body.name;
    if ("description" in body) productUpdates.description = body.description;
    if ("price" in body) productUpdates.price = body.price;
    if ("currency" in body) productUpdates.currency = body.currency;
    if ("imageUrl" in body) productUpdates.imageUrl = body.imageUrl;
    if ("active" in body) productUpdates.active = body.active;
    if ("type" in body) productUpdates.type = body.type;
    if ("productKey" in body) productUpdates.productKey = body.productKey;

    if ("overrideName" in body) overrideUpdates.overrideName = body.overrideName;
    if ("overrideDescription" in body) overrideUpdates.overrideDescription = body.overrideDescription;
    if ("overridePrice" in body) overrideUpdates.overridePrice = body.overridePrice;
    if ("digitalObjectKey" in body) overrideUpdates.digitalObjectKey = body.digitalObjectKey;

    if (Object.keys(productUpdates).length > 0) {
      await db.update(products).set(productUpdates).where(eq(products.id, id));
    }

    if (Object.keys(overrideUpdates).length > 0) {
      const [existingOverride] = await db
        .select()
        .from(productOverrides)
        .where(eq(productOverrides.productId, id))
        .limit(1);

      if (existingOverride) {
        await db
          .update(productOverrides)
          .set(overrideUpdates)
          .where(eq(productOverrides.id, existingOverride.id));
      } else {
        await db.insert(productOverrides).values({
          productId: id,
          overrideName: overrideUpdates.overrideName ?? null,
          overrideDescription: overrideUpdates.overrideDescription ?? null,
          overridePrice: overrideUpdates.overridePrice ?? null,
          digitalObjectKey: overrideUpdates.digitalObjectKey ?? null,
        });
      }
    }

    const [item] = await db
      .select({
        id: products.id,
        productKey: products.productKey,
        type: products.type,
        name: products.name,
        description: products.description,
        price: products.price,
        currency: products.currency,
        imageUrl: products.imageUrl,
        active: products.active,
        overrideId: productOverrides.id,
        overrideName: productOverrides.overrideName,
        overrideDescription: productOverrides.overrideDescription,
        overridePrice: productOverrides.overridePrice,
        digitalObjectKey: productOverrides.digitalObjectKey,
      })
      .from(products)
      .leftJoin(productOverrides, eq(productOverrides.productId, products.id))
      .where(eq(products.id, id))
      .limit(1);

    if (!item) return res.status(404).json({ error: "Not found" });
    res.json(item);
  } catch (err) {
    console.error("STORE ADMIN UPDATE ERROR", err);
    res.status(500).json({ error: "Failed to update catalog item" });
  }
});

// DELETE
router.delete("/:id", requireModernAdmin, async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (!Number.isFinite(id)) {
      return res.status(400).json({ error: "Invalid id" });
    }

    await db.delete(productOverrides).where(eq(productOverrides.productId, id));
    await db.delete(products).where(eq(products.id, id));
    res.json({ ok: true });
  } catch (err) {
    console.error("STORE ADMIN DELETE ERROR", err);
    res.status(500).json({ error: "Failed to delete catalog item" });
  }
});

export default router;
