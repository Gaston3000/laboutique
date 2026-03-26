import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Balto@localhost:5432/la_boutique_db' });
const res = await pool.query("DELETE FROM orders WHERE LOWER(customer_name) != 'gaston costabella' RETURNING id, customer_name");
console.log('Deleted', res.rowCount, 'orders:');
res.rows.forEach(r => console.log(' -', r.id, r.customer_name));
await pool.end();
