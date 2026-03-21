import fs from "node:fs";
import { query } from "../db.js";

console.log("🔄 Extrayendo e importando solo productos del backup...\n");

const backupFile = "sql/backups/full_snapshot_20260321.sql";

if (!fs.existsSync(backupFile)) {
  console.error("❌ No se encontró el archivo de backup");
  process.exit(1);
}

const content = fs.readFileSync(backupFile, "utf8");

// Buscar la sección de COPY products
const copyProductsMatch = content.match(/COPY public\.products.*?\n([\s\S]*?)\n\\\./m);

if (!copyProductsMatch) {
  console.error("❌ No se encontró la sección COPY products en el backup");
  process.exit(1);
}

const copyData = copyProductsMatch[1];
const lines = copyData.split("\n").filter(line => line.trim());

console.log(`📦 Encontradas ${lines.length} líneas de productos\n`);

// Limpiar productos existentes
console.log("🧹 Limpiando productos existentes...");
await query("TRUNCATE TABLE products CASCADE");

console.log("📥 Importando productos...\n");

let imported = 0;
let errors = 0;

for (const line of lines) {
  try {
    const fields = line.split("\t");
    
    // El formato es: id, name, brand, short_description, long_description, price_ars, stock, low_stock_threshold, is_visible, categories, media, seo
    const [id, name, brand, shortDesc, longDesc, price, stock, lowStockThreshold, isVisible, categories, media, seo] = fields;
    
    // Convertir valores
    const parsedCategories = categories === "\\N" ? null : categories;
    const parsedMedia = media === "\\N" ? null : media;
    const parsedSeo = seo === "\\N" ? null : seo;
    
    await query(`
      INSERT INTO products (id, name, brand, short_description, long_description, price_ars, stock, low_stock_threshold, is_visible, categories, media, seo)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
    `, [
      parseInt(id),
      name === "\\N" ? null : name.replace(/\\n/g, "\n"),
      brand === "\\N" ? null : brand,
      shortDesc === "\\N" ? null : shortDesc.replace(/\\n/g, "\n"),
      longDesc === "\\N" ? null : longDesc.replace(/\\n/g, "\n"),
      parseFloat(price),
      parseInt(stock),
      parseInt(lowStockThreshold),
      isVisible === "t",
      parsedCategories,
      parsedMedia,
      parsedSeo
    ]);
    
    imported++;
    
    if (imported % 50 === 0) {
      console.log(`   ✅ ${imported} productos importados...`);
    }
  } catch (error) {
    errors++;
    if (errors <= 5) {
      console.error(`   ❌ Error en línea: ${error.message}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log(`✅ Importados: ${imported} productos`);
console.log(`❌ Errores: ${errors}`);
console.log("=".repeat(60));

process.exit(0);
