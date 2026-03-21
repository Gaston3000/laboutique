import { query } from "../db.js";

async function countProducts() {
  try {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN media IS NOT NULL AND jsonb_array_length(media) > 0 THEN 1 END) as con_imagenes,
        COUNT(CASE WHEN media IS NULL OR jsonb_array_length(media) = 0 THEN 1 END) as sin_imagenes
      FROM products
    `);

    const stats = result.rows[0];
    
    console.log("📊 ESTADÍSTICAS DE PRODUCTOS:");
    console.log("================================");
    console.log(`Total de productos: ${stats.total}`);
    console.log(`Con imágenes: ${stats.con_imagenes}`);
    console.log(`Sin imágenes: ${stats.sin_imagenes}`);
    console.log("================================\n");
  } catch (error) {
    console.error("Error:", error);
  }
  process.exit(0);
}

countProducts();
