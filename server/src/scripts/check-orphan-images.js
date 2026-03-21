import { query } from "../db.js";
import fs from "node:fs";
import path from "node:path";

const uploadsDir = path.resolve(process.cwd(), "uploads", "products");

async function checkOrphanImages() {
  console.log("🔍 Verificando imágenes huérfanas...\n");

  try {
    // Obtener todas las imágenes físicas
    const filesInFolder = fs.readdirSync(uploadsDir).filter(f => f.endsWith(".webp"));
    console.log(`📁 Archivos WebP en servidor: ${filesInFolder.length}`);

    // Obtener todas las URLs de la base de datos
    const result = await query(`
      SELECT id, name, media 
      FROM products 
      WHERE media IS NOT NULL AND jsonb_array_length(media) > 0
    `);

    const urlsInDb = new Set();
    result.rows.forEach(product => {
      if (Array.isArray(product.media)) {
        product.media.forEach(item => {
          if (item.url) {
            // Extraer el nombre del archivo de la URL
            const fileName = item.url.split("/").pop();
            urlsInDb.add(fileName);
          }
        });
      }
    });

    console.log(`💾 Archivos referenciados en DB: ${urlsInDb.size}\n`);

    // Encontrar archivos huérfanos (en disco pero no en DB)
    const orphanFiles = filesInFolder.filter(file => !urlsInDb.has(file));

    if (orphanFiles.length > 0) {
      console.log(`⚠️  Encontradas ${orphanFiles.length} imágenes huérfanas (en disco pero no en DB):`);
      orphanFiles.slice(0, 20).forEach(file => console.log(`   - ${file}`));
      if (orphanFiles.length > 20) {
        console.log(`   ... y ${orphanFiles.length - 20} más`);
      }
    } else {
      console.log("✅ No hay imágenes huérfanas");
    }

    console.log();

    // Encontrar URLs en DB que no tienen archivo físico
    const missingFiles = [];
    result.rows.forEach(product => {
      if (Array.isArray(product.media)) {
        product.media.forEach(item => {
          if (item.url) {
            const fileName = item.url.split("/").pop();
            if (!filesInFolder.includes(fileName)) {
              missingFiles.push({
                productId: product.id,
                productName: product.name,
                fileName: fileName
              });
            }
          }
        });
      }
    });

    if (missingFiles.length > 0) {
      console.log(`❌ Encontradas ${missingFiles.length} referencias en DB sin archivo físico:`);
      missingFiles.slice(0, 10).forEach(item => {
        console.log(`   - Producto ${item.productId} (${item.productName}): ${item.fileName}`);
      });
      if (missingFiles.length > 10) {
        console.log(`   ... y ${missingFiles.length - 10} más`);
      }
    } else {
      console.log("✅ Todas las referencias en DB tienen su archivo físico");
    }

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkOrphanImages();
