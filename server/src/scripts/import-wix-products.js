import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { db, query } from "../db.js";

const MAX_SEO_KEYWORDS = 20;
const SEO_STOP_WORDS = new Set([
  "de",
  "del",
  "la",
  "el",
  "los",
  "las",
  "y",
  "en",
  "para",
  "con",
  "sin",
  "por",
  "x"
]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function normalizeHeaderKey(value) {
  return normalizeText(value).toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getRowValueByAliases(row, aliases) {
  if (!row || typeof row !== "object") {
    return "";
  }

  const aliasSet = new Set(aliases.map((alias) => normalizeHeaderKey(alias)));

  for (const [key, value] of Object.entries(row)) {
    if (aliasSet.has(normalizeHeaderKey(key))) {
      return normalizeText(value);
    }
  }

  return "";
}

function parseCategories(rawCategories) {
  const value = normalizeText(rawCategories);
  if (!value) {
    return [];
  }

  const parts = value
    .split(/[|;,>]/)
    .map((item) => normalizeText(item))
    .filter(Boolean);

  return Array.from(new Set(parts));
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
  if (!Number.isFinite(parsed) || parsed < 0) {
    return 0;
  }

  return Math.floor(parsed);
}

function parseBoolean(value, fallback = true) {
  if (typeof value !== "string") {
    return fallback;
  }

  const normalized = value.trim().toLowerCase();
  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  return fallback;
}

function normalizeSeoText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function parseKeywordList(value) {
  if (!value) {
    return [];
  }

  return value
    .split(/[;,|]/)
    .map((item) => normalizeSeoText(item))
    .filter(Boolean);
}

function toSeoObject(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const keywordsSource = Array.isArray(source.keywords) ? source.keywords : [];

  return {
    metaTitle: normalizeSeoText(source.metaTitle),
    metaDescription: normalizeSeoText(source.metaDescription),
    imageAlt: normalizeSeoText(source.imageAlt),
    slug: normalizeSeoText(source.slug),
    canonicalUrl: normalizeSeoText(source.canonicalUrl),
    focusKeyword: normalizeSeoText(source.focusKeyword),
    keywords: Array.from(
      new Set(
        keywordsSource
          .map((keyword) => normalizeSeoText(keyword))
          .filter(Boolean)
      )
    ).slice(0, MAX_SEO_KEYWORDS),
    ogTitle: normalizeSeoText(source.ogTitle),
    ogDescription: normalizeSeoText(source.ogDescription),
    twitterTitle: normalizeSeoText(source.twitterTitle),
    twitterDescription: normalizeSeoText(source.twitterDescription)
  };
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSeoValue(seo) {
  const parsed = toSeoObject(seo);
  return (
    hasText(parsed.metaTitle) ||
    hasText(parsed.metaDescription) ||
    hasText(parsed.imageAlt) ||
    hasText(parsed.slug) ||
    hasText(parsed.canonicalUrl) ||
    hasText(parsed.focusKeyword) ||
    parsed.keywords.length > 0 ||
    hasText(parsed.ogTitle) ||
    hasText(parsed.ogDescription) ||
    hasText(parsed.twitterTitle) ||
    hasText(parsed.twitterDescription)
  );
}

function slugify(value) {
  const base = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return base;
}

function extractPresentations(name) {
  const source = normalizeText(name);
  if (!source) {
    return [];
  }

  const matches = source.match(/(?:x\s*)?\d+(?:[.,]\d+)?\s*(?:ml|l|lt|lts|cc|cm3|g|gr|kg|un|u|pack|packs|oz)\b/gi) || [];
  return Array.from(new Set(matches.map((item) => item.replace(/\s+/g, " ").trim())));
}

function tokenizeForSeo(value) {
  const normalized = normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ");

  return normalized
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length >= 2 && !SEO_STOP_WORDS.has(part));
}

function buildAutoKeywords({ name, brand, categories, presentations }) {
  const source = new Set();
  const addKeyword = (keyword) => {
    const normalized = normalizeSeoText(keyword);
    if (!normalized) {
      return;
    }
    source.add(normalized);
  };

  addKeyword(name);
  if (brand) {
    addKeyword(`${name} ${brand}`);
    addKeyword(brand);
  }

  for (const category of categories) {
    addKeyword(category);
  }

  for (const presentation of presentations) {
    addKeyword(presentation);
    addKeyword(`${name} ${presentation}`);
  }

  for (const token of tokenizeForSeo(name)) {
    addKeyword(token);
  }

  addKeyword("limpieza");
  addKeyword("limpieza del hogar");

  return Array.from(source).slice(0, MAX_SEO_KEYWORDS);
}

function buildAutoSeoFromProduct({ name, brand, categories }) {
  const normalizedName = normalizeText(name);
  const normalizedBrand = normalizeText(brand);
  const normalizedCategories = Array.isArray(categories)
    ? categories.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const presentations = extractPresentations(normalizedName);
  const presentationText = presentations[0] ? ` ${presentations[0]}` : "";
  const brandText = normalizedBrand ? ` ${normalizedBrand}` : "";

  const metaTitleBase = `${normalizedName}${brandText} | La Boutique de la Limpieza`;
  const metaTitle = metaTitleBase.length > 70 ? metaTitleBase.slice(0, 70).trim() : metaTitleBase;
  const metaDescription = `${normalizedName}${presentationText} para limpieza del hogar${normalizedBrand ? ` de ${normalizedBrand}` : ""}. Compra online con envio rapido en La Boutique de la Limpieza.`;
  const focusKeyword = presentations[0] ? `${normalizedName} ${presentations[0]}` : normalizedName;
  const slug = slugify(`${normalizedName}-${normalizedBrand || "producto"}`);
  const keywords = buildAutoKeywords({
    name: normalizedName,
    brand: normalizedBrand,
    categories: normalizedCategories,
    presentations
  });

  return {
    metaTitle,
    metaDescription,
    imageAlt: normalizedName,
    slug,
    canonicalUrl: "",
    focusKeyword,
    keywords,
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    twitterTitle: metaTitle,
    twitterDescription: metaDescription
  };
}

function buildSeoFromCsvRow(row, autoSeo) {
  const seo = toSeoObject(autoSeo);
  const csvSeo = {
    metaTitle: getRowValueByAliases(row, ["meta title", "seo title", "title tag", "seotitle", "metatitle"]),
    metaDescription: getRowValueByAliases(row, [
      "meta description",
      "seo description",
      "description tag",
      "metadescription",
      "seodescription"
    ]),
    imageAlt: getRowValueByAliases(row, ["image alt", "seo image alt", "alt", "alt text", "imagealt"]),
    slug: getRowValueByAliases(row, ["slug", "url slug", "seoslug"]),
    canonicalUrl: getRowValueByAliases(row, ["canonical url", "canonical", "canonicalurl"]),
    focusKeyword: getRowValueByAliases(row, ["focus keyword", "keyword", "focuskeyword"]),
    keywordsRaw: getRowValueByAliases(row, ["meta keywords", "seo keywords", "keywords", "metakeywords", "seokeywords"]),
    ogTitle: getRowValueByAliases(row, ["og title", "open graph title", "ogtitle"]),
    ogDescription: getRowValueByAliases(row, ["og description", "open graph description", "ogdescription"]),
    twitterTitle: getRowValueByAliases(row, ["twitter title", "twittertitle"]),
    twitterDescription: getRowValueByAliases(row, ["twitter description", "twitterdescription"])
  };

  if (csvSeo.metaTitle) seo.metaTitle = csvSeo.metaTitle;
  if (csvSeo.metaDescription) seo.metaDescription = csvSeo.metaDescription;
  if (csvSeo.imageAlt) seo.imageAlt = csvSeo.imageAlt;
  if (csvSeo.slug) seo.slug = slugify(csvSeo.slug);
  if (csvSeo.canonicalUrl) seo.canonicalUrl = csvSeo.canonicalUrl;
  if (csvSeo.focusKeyword) seo.focusKeyword = csvSeo.focusKeyword;
  if (csvSeo.ogTitle) seo.ogTitle = csvSeo.ogTitle;
  if (csvSeo.ogDescription) seo.ogDescription = csvSeo.ogDescription;
  if (csvSeo.twitterTitle) seo.twitterTitle = csvSeo.twitterTitle;
  if (csvSeo.twitterDescription) seo.twitterDescription = csvSeo.twitterDescription;

  const csvKeywords = parseKeywordList(csvSeo.keywordsRaw);
  if (csvKeywords.length > 0) {
    seo.keywords = Array.from(new Set([...csvKeywords, ...seo.keywords])).slice(0, MAX_SEO_KEYWORDS);
  }

  return seo;
}

function mergeSeoKeepExisting(existingSeo, incomingSeo) {
  const existing = toSeoObject(existingSeo);
  const incoming = toSeoObject(incomingSeo);

  const mergedKeywords = Array.from(new Set([...existing.keywords, ...incoming.keywords])).slice(0, MAX_SEO_KEYWORDS);

  return {
    metaTitle: existing.metaTitle || incoming.metaTitle,
    metaDescription: existing.metaDescription || incoming.metaDescription,
    imageAlt: existing.imageAlt || incoming.imageAlt,
    slug: existing.slug || incoming.slug,
    canonicalUrl: existing.canonicalUrl || incoming.canonicalUrl,
    focusKeyword: existing.focusKeyword || incoming.focusKeyword,
    keywords: mergedKeywords,
    ogTitle: existing.ogTitle || incoming.ogTitle,
    ogDescription: existing.ogDescription || incoming.ogDescription,
    twitterTitle: existing.twitterTitle || incoming.twitterTitle,
    twitterDescription: existing.twitterDescription || incoming.twitterDescription
  };
}

async function main() {
  const csvPath = process.argv[2];

  if (!csvPath) {
    console.error("Uso: npm run import:wix -- \"C:/ruta/catalog_products.csv\"");
    process.exit(1);
  }

  const rawCsv = await fs.readFile(csvPath, "utf8");
  const rows = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const seenHandles = new Set();
  const products = [];

  for (const row of rows) {
    const fieldType = normalizeText(row.fieldType).toLowerCase();
    if (fieldType !== "product") {
      continue;
    }

    const handleId = normalizeText(row.handleId);
    if (handleId && seenHandles.has(handleId)) {
      continue;
    }

    const name = normalizeText(row.name);
    const brand = normalizeText(row.brand) || null;
    const price = parsePrice(row.price);
    const stock = parseStock(row.inventory);
    const visible = parseBoolean(row.visible, true);
    const categoriesRaw = getRowValueByAliases(row, [
      "categories",
      "category",
      "collections",
      "collection",
      "product categories",
      "product category",
      "rubro"
    ]);
    const categories = parseCategories(categoriesRaw);

    if (!name || price === null) {
      continue;
    }

    const autoSeo = buildAutoSeoFromProduct({ name, brand, categories });
    const seo = buildSeoFromCsvRow(row, autoSeo);

    products.push({ name, brand, price, stock, visible, categories, seo });

    if (handleId) {
      seenHandles.add(handleId);
    }
  }

  if (!products.length) {
    console.log("No se encontraron productos válidos en el CSV.");
    await db.end();
    return;
  }

  const existingResult = await query("SELECT id, name, brand, seo FROM products");
  const existingByKey = new Map();

  for (const row of existingResult.rows) {
    const key = `${normalizeKey(row.name)}||${normalizeKey(row.brand || "")}`;
    existingByKey.set(key, {
      id: row.id,
      seo: hasSeoValue(row.seo) ? toSeoObject(row.seo) : null
    });
  }

  let inserted = 0;
  let updated = 0;
  let skippedInvisible = 0;
  const categoryNames = new Set();

  await query("BEGIN");

  try {
    for (const product of products) {
      if (!product.visible) {
        skippedInvisible += 1;
        continue;
      }

      const key = `${normalizeKey(product.name)}||${normalizeKey(product.brand || "")}`;
      const existingProduct = existingByKey.get(key);
      const existingId = existingProduct?.id;
      const finalSeo = existingProduct?.seo ? mergeSeoKeepExisting(existingProduct.seo, product.seo) : product.seo;

      if (existingId) {
        await query(
          `UPDATE products
           SET price_ars = $1,
               stock = $2,
               brand = $3,
               categories = $4,
               seo = $5::jsonb
           WHERE id = $6`,
          [product.price, product.stock, product.brand, product.categories, JSON.stringify(finalSeo), existingId]
        );
        updated += 1;

        for (const category of product.categories) {
          categoryNames.add(category);
        }
        continue;
      }

      const insertResult = await query(
        `INSERT INTO products (name, brand, price_ars, stock, categories, seo)
         VALUES ($1, $2, $3, $4, $5, $6::jsonb)
         RETURNING id`,
        [product.name, product.brand, product.price, product.stock, product.categories, JSON.stringify(product.seo)]
      );

      const newId = insertResult.rows[0]?.id;
      if (newId) {
        existingByKey.set(key, { id: newId, seo: toSeoObject(product.seo) });
      }

      inserted += 1;

      for (const category of product.categories) {
        categoryNames.add(category);
      }
    }

    if (categoryNames.size > 0) {
      await query(
        `INSERT INTO categories (name)
         SELECT DISTINCT category_name
         FROM UNNEST($1::text[]) AS category_name
         WHERE category_name <> ''
         ON CONFLICT (name) DO NOTHING`,
        [Array.from(categoryNames)]
      );
    }

    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }

  const totalResult = await query("SELECT COUNT(*)::int AS total FROM products");
  const total = totalResult.rows[0]?.total ?? 0;

  console.log("Importación finalizada.");
  console.log(`Productos leídos del CSV: ${products.length}`);
  console.log(`Insertados: ${inserted}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Saltados por no visibles: ${skippedInvisible}`);
  console.log(`Total en base: ${total}`);

  await db.end();
}

main().catch(async (error) => {
  console.error("Error al importar productos de Wix:", error.message);
  await db.end();
  process.exit(1);
});
