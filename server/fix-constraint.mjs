import { query } from "./src/db.js";

await query("ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check");
await query(`ALTER TABLE orders ADD CONSTRAINT orders_status_check CHECK (status IN ('nuevo', 'pago', 'confirmado', 'preparado', 'listo_retiro', 'enviado', 'entregado', 'cancelado'))`);
console.log("Constraint updated successfully");
process.exit(0);
