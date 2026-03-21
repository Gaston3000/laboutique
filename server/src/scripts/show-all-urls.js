import { query } from "../db.js";

async function showAllUniqueUrls() {
  try {
    const result = await query(`
      SELECT id, name, media 
      FROM products 
      WHERE media IS NOT NULL AND jsonb_array_length(media) > 0
      ORDER BY id
      LIMIT 20
    `);

    console.log("🔍 MOSTRANDO URLs REALES DE LA BASE DE DATOS:\n");
    console.log("=".repeat(100));

    result.rows.forEach((product, index) => {
      console.log(`\n${index + 1}. Producto ID ${product.id}: ${product.name}`);
      if (Array.isArray(product.media)) {
        product.media.forEach((item, mediaIndex) => {
          console.log(`   [${mediaIndex + 1}] ${item.url}`);
        });
      }
    });

    console.log("\n" + "=".repeat(100));

    // Análisis de hosts
    const hosts = new Map();
    const allProducts = await query(`
      SELECT media 
      FROM products 
      WHERE media IS NOT NULL AND jsonb_array_length(media) > 0
    `);

    allProducts.rows.forEach(row => {
      if (Array.isArray(row.media)) {
        row.media.forEach(item => {
          try {
            const url = new URL(item.url);
            const host = url.host;
            hosts.set(host, (hosts.get(host) || 0) + 1);
          } catch (e) {
            // URL inválida o relativa
          }
        });
      }
    });

    console.log("\n📊 DISTRIBUCIÓN DE HOSTS:");
    hosts.forEach((count, host) => {
      console.log(`   ${host}: ${count} imágenes`);
    });

  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

showAllUniqueUrls();
