import { query } from "./src/db.js";

async function main() {
  const r = await query(
    "UPDATE orders SET shipping_method = 'pickup' WHERE customer_address ILIKE '%retiro en el local%' AND shipping_method = 'shipping' RETURNING id, shipping_method"
  );
  console.log("Updated:", r.rows);
  process.exit(0);
}

main();
