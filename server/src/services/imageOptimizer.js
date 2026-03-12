import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const DEFAULT_MAX_DIMENSION = 1000;

function normalizeExtension(filePath) {
  return path.extname(filePath || "").toLowerCase();
}

function shouldSkipOptimization({ extension, mimeType }) {
  if (extension === ".gif" || mimeType === "image/gif") {
    return true;
  }

  return false;
}

function buildOutputPipeline(image, { extension, hasAlpha }) {
  if (extension === ".jpg" || extension === ".jpeg") {
    return image.jpeg({ quality: 62, mozjpeg: true });
  }

  if (extension === ".webp") {
    return image.webp({ quality: 60, effort: 6 });
  }

  if (extension === ".avif") {
    return image.avif({ quality: 42, effort: 5 });
  }

  if (extension === ".png" || hasAlpha) {
    return image.png({
      compressionLevel: 9,
      effort: 10,
      palette: true,
      quality: 62
    });
  }

  return image.jpeg({ quality: 62, mozjpeg: true });
}

export async function optimizeImageFile(filePath, options = {}) {
  const extension = normalizeExtension(filePath);
  const mimeType = typeof options.mimeType === "string" ? options.mimeType.toLowerCase() : "";

  if (shouldSkipOptimization({ extension, mimeType })) {
    return {
      changed: false,
      beforeBytes: 0,
      afterBytes: 0,
      reason: "skipped"
    };
  }

  const beforeStat = await fs.stat(filePath);
  const beforeBytes = Number(beforeStat.size || 0);

  const image = sharp(filePath, {
    failOn: "none",
    limitInputPixels: false
  });

  const metadata = await image.metadata();
  const hasAlpha = Boolean(metadata.hasAlpha);

  const transformed = image
    .rotate()
    .resize({
      width: DEFAULT_MAX_DIMENSION,
      height: DEFAULT_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true
    });

  const outputBuffer = await buildOutputPipeline(transformed, { extension, hasAlpha }).toBuffer();

  if (!outputBuffer.length || outputBuffer.length >= beforeBytes) {
    return {
      changed: false,
      beforeBytes,
      afterBytes: beforeBytes,
      reason: "not-smaller"
    };
  }

  const tempPath = `${filePath}.tmp`;
  await fs.writeFile(tempPath, outputBuffer);
  await fs.rename(tempPath, filePath);

  return {
    changed: true,
    beforeBytes,
    afterBytes: outputBuffer.length,
    reason: "optimized"
  };
}
