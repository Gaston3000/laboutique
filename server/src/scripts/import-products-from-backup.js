import fs from "node:fs";
import { query } from "../db.js";

console.log("🔄 Extrayendo e importando productos del backup...\n");

const backupFile = "sql/backups/full_snapshot_20260321.sql";

if (!fs.existsSync(backupFile)) {
  console.error("❌ No se encontró el archivo de backup");
  process.exit(1);
}

const content = fs.readFileSync(backupFile, "utf8");

// Extraer todas las líneas que empiezan con INSERT INTO "products"
const productInserts = [];
const lines = content.split("\n");

let currentInsert = "";
for (const line of lines) {
  if (line.trim().startsWith('INSERT INTO "products"')) {
    if (currentInsert) {
      productInserts.push(currentInsert);
    }
    currentInsert = line;
  } else if (currentInsert && !line.trim().startsWith('INSERT INTO') && line.trim()) {
    // Continuar con la línea anterior
    currentInsert += "\n" + line;
  } else if (currentInsert && line.trim().endsWith(");")) {
    currentInsert += "\n" + line;
    productInserts.push(currentInsert);
    currentInsert = "";
  }
}

console.log(`📦 Encontrados ${productInserts.length} INSERTs de productos\n`);

// Limpiar productos existentes
console.log("🧹 Limpiando productos existentes...");
await query("TRUNCATE TABLE products CASCADE");

console.log("📥 Importando productos...\n");

let imported = 0;
let errors = 0;

for (let i = 0; i < productInserts.length; i++) {
  const insertStatement = productInserts[i];
  
  try {
    await query(insertStatement);
    imported++;
    
    if (imported % 50 === 0) {
      console.log(`   ✅ ${imported} productos importados...`);
    }
  } catch (error) {
    errors++;
    if (errors <= 10) {
      console.error(`   ❌ Error en producto ${i + 1}: ${error.message.substring(0, 100)}`);
    }
  }
}

console.log("\n" + "=".repeat(60));
console.log(`✅ Importados: ${imported} productos`);
console.log(`❌ Errores: ${errors}`);
console.log("=".repeat(60));

// Verificar productos con imágenes
const result = await query(`
  SELECT 
    COUNT(*) as total,
    COUNT(CASE WHEN media IS NOT NULL AND jsonb_array_length(media) > 0 THEN 1 END) as con_imagenes
  FROM products
`);

console.log(`\n📊 RESUMEN:`);
console.log(`   Total productos: ${result.rows[0].total}`);
console.log(`   Con imágenes: ${result.rows[0].con_imagenes}`);

process.exit(0);
