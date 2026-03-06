import fs from "fs/promises";
import { parse } from "csv-parse/sync";
import { db, query } from "../db.js";

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

    products.push({ name, brand, price, stock, visible, categories });

    if (handleId) {
      seenHandles.add(handleId);
    }
  }

  if (!products.length) {
    console.log("No se encontraron productos válidos en el CSV.");
    await db.end();
    return;
  }

  const existingResult = await query("SELECT id, name, brand FROM products");
  const existingByKey = new Map();

  for (const row of existingResult.rows) {
    const key = `${normalizeKey(row.name)}||${normalizeKey(row.brand || "")}`;
    existingByKey.set(key, row.id);
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
      const existingId = existingByKey.get(key);

      if (existingId) {
        await query(
          `UPDATE products
           SET price_ars = $1,
               stock = $2,
               brand = $3,
               categories = $4
           WHERE id = $5`,
          [product.price, product.stock, product.brand, product.categories, existingId]
        );
        updated += 1;

        for (const category of product.categories) {
          categoryNames.add(category);
        }
        continue;
      }

      const insertResult = await query(
        `INSERT INTO products (name, brand, price_ars, stock, categories)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id`,
        [product.name, product.brand, product.price, product.stock, product.categories]
      );

      const newId = insertResult.rows[0]?.id;
      if (newId) {
        existingByKey.set(key, newId);
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
