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

function buildOutputPipeline(image) {
  return image.webp({ quality: 82, effort: 4 });
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

  const transformed = image
    .rotate()
    .resize({
      width: DEFAULT_MAX_DIMENSION,
      height: DEFAULT_MAX_DIMENSION,
      fit: "inside",
      withoutEnlargement: true
    });

  const outputBuffer = await buildOutputPipeline(transformed).toBuffer();

  if (!outputBuffer.length || outputBuffer.length >= beforeBytes) {
    return {
      changed: false,
      beforeBytes,
      afterBytes: beforeBytes,
      reason: "not-smaller"
    };
  }

  // Always output as .webp
  const webpPath = filePath.replace(/\.(png|jpe?g|avif|webp)$/i, ".webp");
  const tempPath = `${webpPath}.tmp`;
  await fs.writeFile(tempPath, outputBuffer);
  await fs.rename(tempPath, webpPath);

  // Remove original if it had a different extension
  if (webpPath !== filePath) {
    await fs.unlink(filePath).catch(() => {});
  }

  return {
    changed: true,
    beforeBytes,
    afterBytes: outputBuffer.length,
    newPath: webpPath,
    reason: "optimized"
  };
}
