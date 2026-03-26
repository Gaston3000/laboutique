import pg from 'pg';
const pool = new pg.Pool({ connectionString: 'postgresql://postgres:Balto@localhost:5432/la_boutique_db' });
const res = await pool.query("SELECT COUNT(*) as total, COUNT(*) FILTER (WHERE LOWER(customer_name) != 'gaston costabella') as to_delete FROM orders");
console.log(res.rows[0]);
await pool.end();
