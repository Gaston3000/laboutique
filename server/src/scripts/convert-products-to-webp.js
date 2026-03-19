import path from "node:path";
import fs from "node:fs/promises";
import sharp from "sharp";
import { db } from "../db.js";

const UPLOADS_DIR = path.resolve(process.cwd(), "uploads", "products");
const QUALITY = 82;
const MAX_DIMENSION = 1000;

async function convertFileToWebp(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === ".webp" || ext === ".gif") return null;

  const webpPath = filePath.replace(/\.(png|jpe?g|avif)$/i, ".webp");
  if (webpPath === filePath) return null;

  const beforeStat = await fs.stat(filePath);
  const beforeBytes = beforeStat.size;

  const buffer = await sharp(filePath, { failOn: "none", limitInputPixels: false })
    .rotate()
    .resize({ width: MAX_DIMENSION, height: MAX_DIMENSION, fit: "inside", withoutEnlargement: true })
    .webp({ quality: QUALITY, effort: 4 })
    .toBuffer();

  await fs.writeFile(webpPath, buffer);
  await fs.unlink(filePath);

  return {
    oldName: path.basename(filePath),
    newName: path.basename(webpPath),
    beforeBytes,
    afterBytes: buffer.length
  };
}

async function updateDatabaseUrls(fileMap) {
  if (!fileMap.size) return 0;

  const rows = await db.query("SELECT id, media FROM products WHERE media != '[]'::jsonb");
  let updated = 0;

  for (const row of rows.rows) {
    const media = row.media;
    if (!Array.isArray(media) || !media.length) continue;

    let changed = false;
    const newMedia = media.map((item) => {
      if (!item?.url) return item;

      for (const [oldName, newName] of fileMap) {
        if (item.url.includes(oldName)) {
          changed = true;
          return { ...item, url: item.url.replace(oldName, newName) };
        }
      }
      return item;
    });

    if (changed) {
      await db.query("UPDATE products SET media = $1 WHERE id = $2", [JSON.stringify(newMedia), row.id]);
      updated++;
    }
  }

  return updated;
}

async function main() {
  console.log("Scanning uploads/products...");
  const entries = await fs.readdir(UPLOADS_DIR);
  const targets = entries.filter((f) => /\.(png|jpe?g|avif)$/i.test(f));

  console.log(`Found ${targets.length} images to convert to WebP`);
  if (!targets.length) {
    console.log("Nothing to do.");
    await db.end();
    return;
  }

  let converted = 0;
  let errors = 0;
  let totalBefore = 0;
  let totalAfter = 0;
  const fileMap = new Map();

  for (const file of targets) {
    try {
      const result = await convertFileToWebp(path.join(UPLOADS_DIR, file));
      if (result) {
        converted++;
        totalBefore += result.beforeBytes;
        totalAfter += result.afterBytes;
        fileMap.set(result.oldName, result.newName);
      }
    } catch (err) {
      errors++;
      console.error(`Error converting ${file}:`, err.message);
    }
  }

  const savedMB = ((totalBefore - totalAfter) / 1024 / 1024).toFixed(1);
  const pct = totalBefore > 0 ? Math.round((1 - totalAfter / totalBefore) * 100) : 0;

  console.log(`\nConverted: ${converted} | Errors: ${errors}`);
  console.log(`Before: ${(totalBefore / 1024 / 1024).toFixed(1)} MB`);
  console.log(`After: ${(totalAfter / 1024 / 1024).toFixed(1)} MB`);
  console.log(`Saved: ${savedMB} MB (${pct}%)`);

  console.log("\nUpdating database URLs...");
  const dbUpdated = await updateDatabaseUrls(fileMap);
  console.log(`Updated ${dbUpdated} products in database.`);

  await db.end();
  console.log("Done!");
}

main().catch((err) => {
  console.error("Failed:", err);
  process.exit(1);
});
