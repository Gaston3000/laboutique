import { query } from './src/db.js';
try {
  await query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS reset_password_code VARCHAR(6), ADD COLUMN IF NOT EXISTS reset_password_code_expires_at TIMESTAMPTZ`);
  console.log('Migration OK');
  const r = await query(`SELECT column_name FROM information_schema.columns WHERE table_name='users' AND column_name IN ('reset_password_code','reset_password_code_expires_at')`);
  console.log('Columns found:', r.rows.map(x => x.column_name).join(', '));
} catch(e) {
  console.error('Error:', e.message);
}
process.exit(0);
