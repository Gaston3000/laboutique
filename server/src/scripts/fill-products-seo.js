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
const PUBLIC_SITE_URL = normalizeText(process.env.PUBLIC_SITE_URL || process.env.CLIENT_URL || "").replace(/\/$/, "");

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function toSeoObject(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const keywordsSource = Array.isArray(source.keywords) ? source.keywords : [];

  return {
    metaTitle: normalizeText(source.metaTitle),
    metaDescription: normalizeText(source.metaDescription),
    imageAlt: normalizeText(source.imageAlt),
    slug: normalizeText(source.slug),
    canonicalUrl: normalizeText(source.canonicalUrl),
    focusKeyword: normalizeText(source.focusKeyword),
    keywords: Array.from(
      new Set(
        keywordsSource
          .map((keyword) => normalizeText(keyword))
          .filter(Boolean)
      )
    ).slice(0, MAX_SEO_KEYWORDS),
    ogTitle: normalizeText(source.ogTitle),
    ogDescription: normalizeText(source.ogDescription),
    twitterTitle: normalizeText(source.twitterTitle),
    twitterDescription: normalizeText(source.twitterDescription)
  };
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
  return normalizeText(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
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
    const normalized = normalizeText(keyword);
    if (!normalized) {
      return;
    }

    source.add(normalized);
  };

  addKeyword(name);

  if (brand) {
    addKeyword(brand);
    addKeyword(`${name} ${brand}`);
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
  const mainCategory = normalizedCategories[0] || "productos de limpieza";

  const metaTitleBase = `${normalizedName}${brandText} | La Boutique de la Limpieza`;
  const metaTitle = metaTitleBase.length > 70 ? metaTitleBase.slice(0, 70).trim() : metaTitleBase;
  const metaDescription = `${normalizedName}${presentationText} para ${mainCategory}${normalizedBrand ? ` de ${normalizedBrand}` : ""}. Compra online con envio rapido y precios mayoristas en La Boutique de la Limpieza.`;
  const focusKeyword = presentations[0] ? `${normalizedName} ${presentations[0]}` : normalizedName;
  const slug = slugify(`${normalizedName}-${normalizedBrand || "producto"}`);
  const canonicalUrl = PUBLIC_SITE_URL && slug ? `${PUBLIC_SITE_URL}/?producto=${encodeURIComponent(slug)}` : "";

  return {
    metaTitle,
    metaDescription,
    imageAlt: normalizedName,
    slug,
    canonicalUrl,
    focusKeyword,
    keywords: buildAutoKeywords({
      name: normalizedName,
      brand: normalizedBrand,
      categories: normalizedCategories,
      presentations
    }),
    ogTitle: metaTitle,
    ogDescription: metaDescription,
    twitterTitle: metaTitle,
    twitterDescription: metaDescription
  };
}

function buildAutoDescriptions({ name, brand, categories }) {
  const normalizedName = normalizeText(name) || "Producto";
  const normalizedBrand = normalizeText(brand);
  const normalizedCategories = Array.isArray(categories)
    ? categories.map((item) => normalizeText(item)).filter(Boolean)
    : [];
  const mainCategory = normalizedCategories[0] || "limpieza del hogar";
  const presentations = extractPresentations(normalizedName);
  const presentationText = presentations[0] ? ` en presentacion ${presentations[0]}` : "";
  const brandText = normalizedBrand ? ` de ${normalizedBrand}` : "";

  const shortDescription = `${normalizedName}${brandText}${presentationText}. Calidad y rendimiento para ${mainCategory}.`;
  const longDescription = `${normalizedName}${brandText} es ideal para tareas de ${mainCategory}. ${presentations[0] ? `Formato ${presentations[0]} para una dosificacion practica y eficiente. ` : ""}Compra online en La Boutique de la Limpieza con atencion personalizada, envio rapido y stock actualizado.`;

  return {
    shortDescription,
    longDescription
  };
}

function normalizeMedia(value) {
  if (!Array.isArray(value)) {
    return [];
  }

  const normalized = [];

  for (const item of value) {
    if (!item || typeof item !== "object") {
      continue;
    }

    const url = normalizeText(item.url);
    if (!url) {
      continue;
    }

    normalized.push({
      url,
      type: normalizeText(item.type).toLowerCase() === "video" ? "video" : "image",
      alt: normalizeText(item.alt)
    });
  }

  return normalized;
}

const IMAGE_ALT_SUFFIXES = [
  "",
  "vista detalle",
  "presentacion del producto",
  "vista alternativa",
  "primer plano"
];

function cleanTrailingPunctuation(text) {
  return text.replace(/[\s\-–—_.,;:]+$/, "").replace(/^[\s\-–—_.,;:]+/, "");
}

function buildImageAlt({ name, brand, categories, index }) {
  const cleanedName = cleanTrailingPunctuation(normalizeText(name)) || "Producto";
  const normalizedBrand = normalizeText(brand);
  const categoryList = Array.isArray(categories) ? categories.map((c) => normalizeText(c)).filter(Boolean) : [];
  const mainCategory = categoryList[0] || "";

  const brandPart = normalizedBrand ? ` ${normalizedBrand}` : "";

  if (index === 0) {
    const categoryPart = mainCategory ? ` - ${mainCategory.toLowerCase()}` : "";
    return `${cleanedName}${brandPart}${categoryPart}`.trim();
  }

  const suffix = IMAGE_ALT_SUFFIXES[index] || `vista ${index + 1}`;
  return `${cleanedName}${brandPart} - ${suffix}`.trim();
}

function fillMediaAltText(media, product, { forceRegenerate = false } = {}) {
  const normalized = normalizeMedia(media);

  return normalized.map((item, index) => {
    if (item.type !== "image") {
      return item;
    }

    if (item.alt && !forceRegenerate) {
      return item;
    }

    return {
      ...item,
      alt: buildImageAlt({ name: product.name, brand: product.brand, categories: product.categories, index })
    };
  });
}

function mergeSeoKeepExisting(existingSeo, generatedSeo) {
  const existing = toSeoObject(existingSeo);
  const generated = toSeoObject(generatedSeo);

  return {
    metaTitle: existing.metaTitle || generated.metaTitle,
    metaDescription: existing.metaDescription || generated.metaDescription,
    imageAlt: existing.imageAlt || generated.imageAlt,
    slug: existing.slug || generated.slug,
    canonicalUrl: existing.canonicalUrl || generated.canonicalUrl,
    focusKeyword: existing.focusKeyword || generated.focusKeyword,
    keywords: Array.from(new Set([...existing.keywords, ...generated.keywords])).slice(0, MAX_SEO_KEYWORDS),
    ogTitle: existing.ogTitle || generated.ogTitle,
    ogDescription: existing.ogDescription || generated.ogDescription,
    twitterTitle: existing.twitterTitle || generated.twitterTitle,
    twitterDescription: existing.twitterDescription || generated.twitterDescription
  };
}

function sameSeo(a, b) {
  return JSON.stringify(toSeoObject(a)) === JSON.stringify(toSeoObject(b));
}

function sameMedia(a, b) {
  return JSON.stringify(normalizeMedia(a)) === JSON.stringify(normalizeMedia(b));
}

async function main() {
  const forceAlt = process.argv.includes("--force-alt");
  if (forceAlt) {
    console.log("Modo --force-alt: se regeneran TODOS los ALT de imagenes.");
  }

  const result = await query("SELECT id, name, brand, categories, short_description, long_description, seo, media FROM products ORDER BY id ASC");

  let updated = 0;
  let alreadyComplete = 0;
  let imagesAltUpdated = 0;
  let descriptionsUpdated = 0;

  await query("BEGIN");

  try {
    for (const row of result.rows) {
      const generatedSeo = buildAutoSeoFromProduct({
        name: row.name,
        brand: row.brand,
        categories: row.categories
      });
      const generatedDescriptions = buildAutoDescriptions({
        name: row.name,
        brand: row.brand,
        categories: row.categories
      });

      const finalSeo = hasSeoValue(row.seo) ? mergeSeoKeepExisting(row.seo, generatedSeo) : generatedSeo;
      const finalMedia = fillMediaAltText(row.media, row, { forceRegenerate: forceAlt });
      const mediaChanged = !sameMedia(row.media, finalMedia);
      const seoChanged = !sameSeo(row.seo, finalSeo);
      const nextShortDescription = hasText(row.short_description)
        ? normalizeText(row.short_description)
        : generatedDescriptions.shortDescription;
      const nextLongDescription = hasText(row.long_description)
        ? normalizeText(row.long_description)
        : generatedDescriptions.longDescription;
      const descriptionsChanged = nextShortDescription !== normalizeText(row.short_description)
        || nextLongDescription !== normalizeText(row.long_description);

      if (!seoChanged && !mediaChanged && !descriptionsChanged) {
        alreadyComplete += 1;
        continue;
      }

      await query("UPDATE products SET seo = $1::jsonb, media = $2::jsonb, short_description = $3, long_description = $4 WHERE id = $5", [
        JSON.stringify(finalSeo),
        JSON.stringify(finalMedia),
        nextShortDescription || null,
        nextLongDescription || null,
        row.id
      ]);
      updated += 1;

      if (mediaChanged) {
        imagesAltUpdated += 1;
      }

      if (descriptionsChanged) {
        descriptionsUpdated += 1;
      }
    }

    await query("COMMIT");
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  }

  console.log("SEO de productos actualizado.");
  console.log(`Total productos: ${result.rows.length}`);
  console.log(`Actualizados: ${updated}`);
  console.log(`Productos con ALT de imagen completado: ${imagesAltUpdated}`);
  console.log(`Productos con descripcion comercial completada: ${descriptionsUpdated}`);
  console.log(`Sin cambios: ${alreadyComplete}`);

  await db.end();
}

main().catch(async (error) => {
  console.error("Error al completar SEO de productos:", error.message);
  await db.end();
  process.exit(1);
});
