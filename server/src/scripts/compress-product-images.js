import path from "node:path";
import fs from "node:fs/promises";
import { optimizeImageFile } from "../services/imageOptimizer.js";

const IMAGE_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

async function walkFiles(dirPath) {
  const entries = await fs.readdir(dirPath, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await walkFiles(fullPath)));
      continue;
    }

    if (entry.isFile()) {
      files.push(fullPath);
    }
  }

  return files;
}

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(2);
}

async function main() {
  const uploadsDir = path.resolve(process.cwd(), "uploads", "products");

  const allFiles = await walkFiles(uploadsDir);
  const imageFiles = allFiles.filter((filePath) => IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  if (!imageFiles.length) {
    console.log("No se encontraron imágenes para comprimir.");
    return;
  }

  let processed = 0;
  let optimized = 0;
  let beforeTotal = 0;
  let afterTotal = 0;
  let errors = 0;

  for (const filePath of imageFiles) {
    try {
      const result = await optimizeImageFile(filePath);
      processed += 1;
      beforeTotal += result.beforeBytes;
      afterTotal += result.afterBytes;

      if (result.changed) {
        optimized += 1;
      }
    } catch {
      errors += 1;
    }
  }

  const savedBytes = Math.max(beforeTotal - afterTotal, 0);
  const savedPercent = beforeTotal > 0 ? ((savedBytes / beforeTotal) * 100).toFixed(1) : "0.0";

  console.log(`Procesadas: ${processed}`);
  console.log(`Optimizadas: ${optimized}`);
  console.log(`Errores: ${errors}`);
  console.log(`Antes: ${formatMB(beforeTotal)} MB`);
  console.log(`Despues: ${formatMB(afterTotal)} MB`);
  console.log(`Ahorrado: ${formatMB(savedBytes)} MB (${savedPercent}%)`);
}

main().catch((error) => {
  console.error("Fallo la compresion de imagenes:", error?.message || error);
  process.exit(1);
});
