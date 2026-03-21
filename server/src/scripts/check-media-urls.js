import { query } from "../db.js";

async function checkMediaUrls() {
  try {
    const result = await query(`
      SELECT id, name, media 
      FROM products 
      WHERE media IS NOT NULL 
      ORDER BY id 
      LIMIT 10
    `);

    console.log("=".repeat(80));
    console.log("PRIMERAS 10 PRODUCTOS CON IMÁGENES:");
    console.log("=".repeat(80));

    result.rows.forEach((product) => {
      console.log(`\n📦 ID ${product.id}: ${product.name}`);
      if (Array.isArray(product.media)) {
        product.media.forEach((item, index) => {
          console.log(`   ${index + 1}. ${item.url}`);
        });
      }
    });

    console.log("\n" + "=".repeat(80));
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

checkMediaUrls();
