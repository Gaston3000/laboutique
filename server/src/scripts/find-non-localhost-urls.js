import { query } from "../db.js";

async function findNonLocalhostUrls() {
  try {
    const result = await query(`
      SELECT id, name, media 
      FROM products 
      WHERE media IS NOT NULL
    `);

    console.log("🔍 Buscando URLs que NO sean localhost...\n");

    const nonLocalhostProducts = [];
    const hostsFound = new Set();

    result.rows.forEach((product) => {
      if (Array.isArray(product.media)) {
        product.media.forEach((item) => {
          if (item.url && typeof item.url === "string") {
            const url = item.url.toLowerCase();
            
            // Extraer el host de la URL
            try {
              const urlObj = new URL(item.url);
              const host = urlObj.host;
              hostsFound.add(host);
              
              // Si no es localhost:4000, agregarlo a la lista
              if (!url.includes("localhost:4000") && !url.startsWith("/")) {
                nonLocalhostProducts.push({
                  id: product.id,
                  name: product.name,
                  url: item.url,
                  host: host
                });
              }
            } catch (e) {
              // URL inválida, reportar
              console.log(`⚠️  URL inválida en producto ${product.id}: ${item.url}`);
            }
          }
        });
      }
    });

    console.log("📊 Hosts encontrados en URLs:");
    hostsFound.forEach(host => console.log(`   - ${host}`));
    console.log();

    if (nonLocalhostProducts.length > 0) {
      console.log(`⚠️  Encontrados ${nonLocalhostProducts.length} productos con URLs que NO son localhost:4000:\n`);
      nonLocalhostProducts.slice(0, 10).forEach(p => {
        console.log(`   ID ${p.id}: ${p.name}`);
        console.log(`      Host: ${p.host}`);
        console.log(`      URL: ${p.url}\n`);
      });
      
      if (nonLocalhostProducts.length > 10) {
        console.log(`   ... y ${nonLocalhostProducts.length - 10} más\n`);
      }
    } else {
      console.log("✅ Todas las URLs usan localhost:4000\n");
    }

    console.log(`Total productos analizados: ${result.rows.length}`);
  } catch (error) {
    console.error("❌ Error:", error);
  }
  process.exit(0);
}

findNonLocalhostUrls();
