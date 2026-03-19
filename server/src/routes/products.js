import { Router } from "express";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { requireAdmin, requireAuth } from "../middleware/auth.js";
import { db, query } from "../db.js";
import { optimizeImageFile } from "../services/imageOptimizer.js";

const productsRouter = Router();
const MAX_MEDIA_ITEMS = 5;
const MAX_SEO_KEYWORDS = 20;
const uploadsDir = path.resolve(process.cwd(), "uploads", "products");
const allowedImageMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif"
]);

function slugifyForFilename(value) {
  const text = typeof value === "string" ? value.trim() : "";
  if (!text) return "";
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

const upload = multer({
  storage: multer.diskStorage({
    destination(_req, _file, callback) {
      fs.mkdirSync(uploadsDir, { recursive: true });
      callback(null, uploadsDir);
    },
    filename(req, file, callback) {
      const ext = path.extname(file.originalname || "").toLowerCase() || ".jpg";
      const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const productSlug = slugifyForFilename(req.body?.productName);
      const prefix = productSlug || uniqueSuffix;
      callback(null, `${prefix}-${uniqueSuffix}${ext}`);
    }
  }),
  limits: {
    files: MAX_MEDIA_ITEMS,
    fileSize: 5 * 1024 * 1024
  },
  fileFilter(_req, file, callback) {
    if (!allowedImageMimeTypes.has(file.mimetype)) {
      callback(new Error("Solo se permiten imágenes JPG, PNG, WEBP, GIF o AVIF"));
      return;
    }

    callback(null, true);
  }
});

function mapProduct(row) {
  return {
    id: row.id,
    name: row.name,
    brand: row.brand,
    shortDescription: row.short_description || "",
    longDescription: row.long_description || "",
    price: Number(row.price),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    isVisible: row.is_visible,
    categories: Array.isArray(row.categories) ? row.categories : [],
    media: Array.isArray(row.media) ? row.media : [],
    seo: parseSeo(row.seo)
  };
}

function mapVariant(row) {
  return {
    id: row.id,
    productId: row.product_id,
    name: row.name,
    presentation: row.presentation,
    sku: row.sku,
    priceDelta: Number(row.price_delta_ars),
    stock: row.stock,
    lowStockThreshold: row.low_stock_threshold,
    isActive: row.is_active
  };
}

function parsePrice(value) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseStock(value) {
  const parsed = Number(value);

  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function normalizeText(value) {
  if (typeof value !== "string") {
    return "";
  }

  return value.trim();
}

async function findDuplicateProductId({ name, brand, excludeId = null }) {
  const normalizedName = normalizeText(name);
  const normalizedBrand = normalizeText(brand) || null;

  const params = [normalizedName, normalizedBrand];
  let sql = `
    SELECT id
    FROM products
    WHERE lower(trim(name)) = lower(trim($1))
      AND lower(trim(COALESCE(brand, ''))) = lower(trim(COALESCE($2, '')))
  `;

  if (excludeId) {
    params.push(excludeId);
    sql += " AND id <> $3";
  }

  sql += " ORDER BY id ASC LIMIT 1";

  const result = await query(sql, params);
  return result.rows[0]?.id || null;
}

const MEDIA_ALT_SUFFIXES = [
  "",
  "vista detalle",
  "presentacion del producto",
  "vista alternativa",
  "primer plano"
];

function cleanTrailingPunctuation(text) {
  return text.replace(/[\s\-–—_.,;:]+$/, "").replace(/^[\s\-–—_.,;:]+/, "");
}

function buildMediaAlt({ name, brand, categories, index }) {
  const cleanedName = cleanTrailingPunctuation(normalizeText(name)) || "Producto";
  const normalizedBrand = normalizeText(brand);
  const categoryList = Array.isArray(categories) ? categories.map((c) => normalizeText(c)).filter(Boolean) : [];
  const mainCategory = categoryList[0] || "";

  const brandPart = normalizedBrand ? ` ${normalizedBrand}` : "";

  if (index === 0) {
    const categoryPart = mainCategory ? ` - ${mainCategory.toLowerCase()}` : "";
    return `${cleanedName}${brandPart}${categoryPart}`.trim();
  }

  const suffix = MEDIA_ALT_SUFFIXES[index] || `vista ${index + 1}`;
  return `${cleanedName}${brandPart} - ${suffix}`.trim();
}

function parseOptionalInteger(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    return null;
  }

  return parsed;
}

function parseOptionalNumber(value, fallback = 0) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }

  return parsed;
}

function parseBoolean(value, fallback = true) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") {
      return true;
    }

    if (normalized === "false") {
      return false;
    }
  }

  return fallback;
}

function parseCategories(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const unique = new Set();

  for (const item of value) {
    const normalized = normalizeText(item);
    if (normalized) {
      unique.add(normalized);
    }
  }

  return Array.from(unique);
}

function parseMedia(value, context = {}) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [];
  let imageIndex = 0;

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const url = normalizeText(item.url);
    if (!url) {
      continue;
    }

    const type = normalizeText(item.type).toLowerCase() === "video" ? "video" : "image";
    let alt = normalizeText(item.alt);

    if (type === "image" && !alt) {
      alt = buildMediaAlt({
        name: context.name,
        brand: context.brand,
        categories: context.categories,
        index: imageIndex
      });
      imageIndex += 1;
    } else if (type === "image") {
      imageIndex += 1;
    }

    normalized.push({ url, type, alt });
  }

  if (normalized.length > MAX_MEDIA_ITEMS) {
    return null;
  }

  return normalized;
}

function parseSeo(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const keywordsSource = Array.isArray(source.keywords) ? source.keywords : [];
  const keywords = Array.from(
    new Set(
      keywordsSource
        .map((keyword) => normalizeText(keyword))
        .filter(Boolean)
    )
  ).slice(0, MAX_SEO_KEYWORDS);

  return {
    metaTitle: normalizeText(source.metaTitle),
    metaDescription: normalizeText(source.metaDescription),
    imageAlt: normalizeText(source.imageAlt),
    slug: normalizeText(source.slug),
    canonicalUrl: normalizeText(source.canonicalUrl),
    focusKeyword: normalizeText(source.focusKeyword),
    keywords,
    ogTitle: normalizeText(source.ogTitle),
    ogDescription: normalizeText(source.ogDescription),
    twitterTitle: normalizeText(source.twitterTitle),
    twitterDescription: normalizeText(source.twitterDescription)
  };
}

function buildUploadedImageUrl(req, fileName) {
  return `${req.protocol}://${req.get("host")}/uploads/products/${fileName}`;
}

async function optimizeUploadedFiles(files) {
  if (!Array.isArray(files) || !files.length) {
    return;
  }

  await Promise.all(
    files.map(async (file) => {
      const inputPath = typeof file?.path === "string" ? file.path : "";
      if (!inputPath) {
        return;
      }

      try {
        const result = await optimizeImageFile(inputPath, { mimeType: file.mimetype });
        if (result.changed && result.newPath) {
          file.path = result.newPath;
          file.filename = path.basename(result.newPath);
        }
      } catch {
        // Keep original file if optimization fails for any reason.
      }
    })
  );
}

async function persistCategories(categories) {
  if (!Array.isArray(categories) || !categories.length) {
    return;
  }

  await query(
    `INSERT INTO categories (name)
     SELECT DISTINCT category_name
     FROM UNNEST($1::text[]) AS category_name
     WHERE category_name <> ''
     ON CONFLICT (name) DO NOTHING`,
    [categories]
  );
}

productsRouter.get("/alerts/low-stock", requireAuth, requireAdmin, async (_req, res) => {
  try {
    const productsResult = await query(
      `SELECT id, name, brand, stock, low_stock_threshold
       FROM products
       WHERE stock <= low_stock_threshold
       ORDER BY stock ASC, id ASC`
    );

    const variantsResult = await query(
      `SELECT v.id, v.product_id, p.name AS product_name, v.name, v.presentation, v.stock, v.low_stock_threshold
       FROM product_variants v
       JOIN products p ON p.id = v.product_id
       WHERE v.is_active = TRUE AND v.stock <= v.low_stock_threshold
       ORDER BY v.stock ASC, v.id ASC`
    );

    return res.json({
      productAlerts: productsResult.rows.map((row) => ({
        id: row.id,
        name: row.name,
        brand: row.brand,
        stock: row.stock,
        lowStockThreshold: row.low_stock_threshold
      })),
      variantAlerts: variantsResult.rows.map((row) => ({
        id: row.id,
        productId: row.product_id,
        productName: row.product_name,
        name: row.name,
        presentation: row.presentation,
        stock: row.stock,
        lowStockThreshold: row.low_stock_threshold
      }))
    });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener alertas de stock" });
  }
});

productsRouter.get("/", async (_req, res) => {
  try {
    const result = await query(
      `SELECT id, name, brand, short_description, long_description,
              price_ars AS price, stock, low_stock_threshold, is_visible, categories, media, seo
       FROM products
       ORDER BY id`
    );

    res.json({ items: result.rows.map(mapProduct) });
  } catch {
    res.status(500).json({ error: "No se pudieron obtener productos" });
  }
});

productsRouter.post("/media/upload", requireAuth, requireAdmin, (req, res) => {
  upload.array("files", MAX_MEDIA_ITEMS)(req, res, async (error) => {
    if (error) {
      if (error instanceof multer.MulterError) {
        if (error.code === "LIMIT_FILE_COUNT") {
          return res.status(400).json({ error: "Podés subir hasta 5 imágenes por vez" });
        }

        if (error.code === "LIMIT_FILE_SIZE") {
          return res.status(400).json({ error: "Cada imagen debe pesar menos de 5MB" });
        }
      }

      return res.status(400).json({ error: error.message || "No se pudieron subir las imágenes" });
    }

    const files = Array.isArray(req.files) ? req.files : [];

    if (!files.length) {
      return res.status(400).json({ error: "No se recibieron imágenes" });
    }

    await optimizeUploadedFiles(files);

    return res.status(201).json({
      items: files.map((file) => ({
        url: buildUploadedImageUrl(req, file.filename),
        type: "image",
        alt: ""
      }))
    });
  });
});

productsRouter.post("/", requireAuth, requireAdmin, async (req, res) => {
  const { name, brand, shortDescription, longDescription, price, stock, lowStockThreshold, isVisible, categories, media, seo } = req.body || {};
  const normalizedName = normalizeText(name);
  const normalizedBrand = normalizeText(brand) || null;
  const normalizedShortDescription = normalizeText(shortDescription) || null;
  const normalizedLongDescription = normalizeText(longDescription) || null;
  const parsedPrice = parsePrice(price);
  const parsedStock = parseStock(stock);
  const parsedThreshold = parseOptionalInteger(lowStockThreshold, 10);
  const parsedVisible = parseBoolean(isVisible, true);
  const parsedCategories = parseCategories(categories);
  const parsedMedia = parseMedia(media, { name: normalizedName, brand: normalizedBrand, categories: parsedCategories });
  const parsedSeo = parseSeo(seo);

  if (parsedMedia === null) {
    return res.status(400).json({ error: "Se permiten hasta 5 imágenes por producto" });
  }

  if (!normalizedName || parsedPrice === null || parsedStock === null || parsedThreshold === null) {
    return res.status(400).json({ error: "Datos de producto inválidos" });
  }

  try {
    const duplicateId = await findDuplicateProductId({ name: normalizedName, brand: normalizedBrand });
    if (duplicateId) {
      return res.status(409).json({
        error: "Ya existe un producto con el mismo nombre y marca"
      });
    }

    const result = await query(
      `INSERT INTO products (
         name, brand, short_description, long_description,
         price_ars, stock, low_stock_threshold, is_visible, categories, media, seo
       )
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11::jsonb)
       RETURNING id, name, brand, short_description, long_description,
                 price_ars AS price, stock, low_stock_threshold, is_visible, categories, media, seo`,
      [
        normalizedName,
        normalizedBrand,
        normalizedShortDescription,
        normalizedLongDescription,
        parsedPrice,
        parsedStock,
        parsedThreshold,
        parsedVisible,
        parsedCategories,
        JSON.stringify(parsedMedia),
        JSON.stringify(parsedSeo)
      ]
    );

    await persistCategories(parsedCategories);

    return res.status(201).json({ item: mapProduct(result.rows[0]) });
  } catch {
    return res.status(500).json({ error: "No se pudo crear el producto" });
  }
});

productsRouter.put("/:id", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const { name, brand, shortDescription, longDescription, price, stock, lowStockThreshold, isVisible, categories, media, seo } = req.body || {};
  const normalizedName = normalizeText(name);
  const normalizedBrand = normalizeText(brand) || null;
  const normalizedShortDescription = normalizeText(shortDescription) || null;
  const normalizedLongDescription = normalizeText(longDescription) || null;
  const parsedPrice = parsePrice(price);
  const parsedStock = parseStock(stock);
  const parsedThreshold = parseOptionalInteger(lowStockThreshold, 10);
  const parsedVisible = parseBoolean(isVisible, true);
  const parsedCategories = parseCategories(categories);
  const parsedMedia = parseMedia(media, { name: normalizedName, brand: normalizedBrand, categories: parsedCategories });
  const parsedSeo = parseSeo(seo);

  if (parsedMedia === null) {
    return res.status(400).json({ error: "Se permiten hasta 5 imágenes por producto" });
  }

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  if (!normalizedName || parsedPrice === null || parsedStock === null || parsedThreshold === null) {
    return res.status(400).json({ error: "Datos de producto inválidos" });
  }

  try {
    const duplicateId = await findDuplicateProductId({
      name: normalizedName,
      brand: normalizedBrand,
      excludeId: productId
    });

    if (duplicateId) {
      return res.status(409).json({
        error: "Ya existe un producto con el mismo nombre y marca"
      });
    }

    const result = await query(
      `UPDATE products
       SET name = $1,
           brand = $2,
           short_description = $3,
           long_description = $4,
           price_ars = $5,
           stock = $6,
           low_stock_threshold = $7,
           is_visible = $8,
           categories = $9,
           media = $10::jsonb,
           seo = $11::jsonb
       WHERE id = $12
       RETURNING id, name, brand, short_description, long_description,
                 price_ars AS price, stock, low_stock_threshold, is_visible, categories, media, seo`,
      [
        normalizedName,
        normalizedBrand,
        normalizedShortDescription,
        normalizedLongDescription,
        parsedPrice,
        parsedStock,
        parsedThreshold,
        parsedVisible,
        parsedCategories,
        JSON.stringify(parsedMedia),
        JSON.stringify(parsedSeo),
        productId
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await persistCategories(parsedCategories);

    return res.json({ item: mapProduct(result.rows[0]) });
  } catch {
    return res.status(500).json({ error: "No se pudo actualizar el producto" });
  }
});

productsRouter.delete("/:id", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  const client = await db.connect();

  try {
    await client.query("BEGIN");
    await client.query("UPDATE order_items SET product_id = NULL WHERE product_id = $1", [productId]);
    await client.query("UPDATE promotions SET product_id = NULL, active = FALSE WHERE product_id = $1", [productId]);
    await client.query("UPDATE promotions SET target_product_id = NULL, active = FALSE WHERE target_product_id = $1", [productId]);

    const result = await client.query("DELETE FROM products WHERE id = $1 RETURNING id", [productId]);

    if (!result.rows[0]) {
      await client.query("ROLLBACK");
      return res.status(404).json({ error: "Producto no encontrado" });
    }

    await client.query("COMMIT");

    return res.json({ success: true });
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch {}

    if (error?.code === "23503") {
      return res.status(409).json({ error: "No se puede eliminar el producto porque está asociado a otros registros" });
    }

    return res.status(500).json({ error: "No se pudo eliminar el producto" });
  } finally {
    client.release();
  }
});

productsRouter.get("/:id/variants", async (req, res) => {
  const productId = Number(req.params.id);

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  try {
    const result = await query(
      `SELECT id, product_id, name, presentation, sku, price_delta_ars, stock, low_stock_threshold, is_active
       FROM product_variants
       WHERE product_id = $1
       ORDER BY id ASC`,
      [productId]
    );

    return res.json({ items: result.rows.map(mapVariant) });
  } catch {
    return res.status(500).json({ error: "No se pudieron obtener las variantes" });
  }
});

productsRouter.post("/:id/variants", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const { name, presentation, sku, priceDelta, stock, lowStockThreshold, isActive } = req.body || {};

  if (!Number.isInteger(productId) || productId <= 0) {
    return res.status(400).json({ error: "ID de producto inválido" });
  }

  const normalizedName = normalizeText(name);
  const normalizedPresentation = normalizeText(presentation) || null;
  const normalizedSku = normalizeText(sku) || null;
  const parsedPriceDelta = parseOptionalNumber(priceDelta, 0);
  const parsedStock = parseOptionalInteger(stock, 0);
  const parsedThreshold = parseOptionalInteger(lowStockThreshold, 5);
  const parsedIsActive = typeof isActive === "boolean" ? isActive : true;

  if (!normalizedName || parsedPriceDelta === null || parsedStock === null || parsedThreshold === null) {
    return res.status(400).json({ error: "Datos de variante inválidos" });
  }

  try {
    const result = await query(
      `INSERT INTO product_variants (product_id, name, presentation, sku, price_delta_ars, stock, low_stock_threshold, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id, product_id, name, presentation, sku, price_delta_ars, stock, low_stock_threshold, is_active`,
      [productId, normalizedName, normalizedPresentation, normalizedSku, parsedPriceDelta, parsedStock, parsedThreshold, parsedIsActive]
    );

    return res.status(201).json({ item: mapVariant(result.rows[0]) });
  } catch {
    return res.status(500).json({ error: "No se pudo crear la variante" });
  }
});

productsRouter.put("/:id/variants/:variantId", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);
  const { name, presentation, sku, priceDelta, stock, lowStockThreshold, isActive } = req.body || {};

  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(variantId) || variantId <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  const normalizedName = normalizeText(name);
  const normalizedPresentation = normalizeText(presentation) || null;
  const normalizedSku = normalizeText(sku) || null;
  const parsedPriceDelta = parseOptionalNumber(priceDelta, 0);
  const parsedStock = parseOptionalInteger(stock, 0);
  const parsedThreshold = parseOptionalInteger(lowStockThreshold, 5);
  const parsedIsActive = typeof isActive === "boolean" ? isActive : true;

  if (!normalizedName || parsedPriceDelta === null || parsedStock === null || parsedThreshold === null) {
    return res.status(400).json({ error: "Datos de variante inválidos" });
  }

  try {
    const result = await query(
      `UPDATE product_variants
       SET name = $1,
           presentation = $2,
           sku = $3,
           price_delta_ars = $4,
           stock = $5,
           low_stock_threshold = $6,
           is_active = $7
       WHERE id = $8 AND product_id = $9
       RETURNING id, product_id, name, presentation, sku, price_delta_ars, stock, low_stock_threshold, is_active`,
      [
        normalizedName,
        normalizedPresentation,
        normalizedSku,
        parsedPriceDelta,
        parsedStock,
        parsedThreshold,
        parsedIsActive,
        variantId,
        productId
      ]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    return res.json({ item: mapVariant(result.rows[0]) });
  } catch {
    return res.status(500).json({ error: "No se pudo actualizar la variante" });
  }
});

productsRouter.delete("/:id/variants/:variantId", requireAuth, requireAdmin, async (req, res) => {
  const productId = Number(req.params.id);
  const variantId = Number(req.params.variantId);

  if (!Number.isInteger(productId) || productId <= 0 || !Number.isInteger(variantId) || variantId <= 0) {
    return res.status(400).json({ error: "ID inválido" });
  }

  try {
    const result = await query(
      "DELETE FROM product_variants WHERE id = $1 AND product_id = $2 RETURNING id",
      [variantId, productId]
    );

    if (!result.rows[0]) {
      return res.status(404).json({ error: "Variante no encontrada" });
    }

    return res.json({ success: true });
  } catch {
    return res.status(500).json({ error: "No se pudo eliminar la variante" });
  }
});

export default productsRouter;
