import { query } from "../db.js";
import fs from "node:fs";
import path from "node:path";

const uploadsDir = path.resolve(process.cwd(), "uploads", "products");

async function fixMediaUrls() {
  console.log("🔄 Iniciando actualización de URLs de medios a WebP...\n");

  try {
    // Obtener todos los productos con media
    const result = await query("SELECT id, name, media FROM products WHERE media IS NOT NULL");
    const products = result.rows;

    console.log(`📦 Productos encontrados: ${products.length}\n`);

    let updatedCount = 0;
    let noChangeCount = 0;
    let errorCount = 0;

    for (const product of products) {
      if (!Array.isArray(product.media) || product.media.length === 0) {
        continue;
      }

      let needsUpdate = false;
      const updatedMedia = product.media.map((item) => {
        if (!item.url || typeof item.url !== "string") {
          return item;
        }

        // Si la URL ya termina en .webp, no hacer nada
        if (item.url.endsWith(".webp")) {
          return item;
        }

        // Extraer el nombre del archivo de la URL
        const urlParts = item.url.split("/");
        const fileName = urlParts[urlParts.length - 1];
        const baseFileName = fileName.replace(/\.(jpg|jpeg|png|gif)$/i, "");
        const webpFileName = `${baseFileName}.webp`;

        // Verificar si el archivo .webp existe
        const webpPath = path.join(uploadsDir, webpFileName);
        if (!fs.existsSync(webpPath)) {
          console.log(`⚠️  No se encontró: ${webpFileName} para producto ${product.name}`);
          return item;
        }

        needsUpdate = true;

        // Construir la nueva URL con .webp
        const newUrl = item.url.replace(/\.(jpg|jpeg|png|gif)$/i, ".webp");

        return {
          ...item,
          url: newUrl
        };
      });

      if (needsUpdate) {
        try {
          await query("UPDATE products SET media = $1 WHERE id = $2", [
            JSON.stringify(updatedMedia),
            product.id
          ]);
          updatedCount++;
          console.log(`✅ Actualizado: ${product.name} (ID: ${product.id})`);
        } catch (error) {
          errorCount++;
          console.error(`❌ Error al actualizar producto ${product.id}:`, error.message);
        }
      } else {
        noChangeCount++;
      }
    }

    console.log("\n" + "=".repeat(60));
    console.log("📊 RESUMEN:");
    console.log("=".repeat(60));
    console.log(`✅ Productos actualizados: ${updatedCount}`);
    console.log(`⏭️  Sin cambios: ${noChangeCount}`);
    console.log(`❌ Errores: ${errorCount}`);
    console.log("=".repeat(60));

    if (updatedCount > 0) {
      console.log("\n🎉 ¡URLs actualizadas exitosamente a formato WebP!");
    }
  } catch (error) {
    console.error("\n❌ Error fatal:", error);
    process.exit(1);
  }

  process.exit(0);
}

fixMediaUrls();
