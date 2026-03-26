import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Balto@localhost:5432/la_boutique_db' });
const res = await pool.query("SELECT id, customer_name, created_at FROM orders ORDER BY created_at DESC");
console.log('Total orders:', res.rows.length);
res.rows.forEach(r => console.log(r.id, '|', r.customer_name, '|', new Date(r.created_at).toLocaleDateString()));
await pool.end();
