import pg from 'pg';
import fs from 'fs';

const client = new pg.Client({
  connectionString: 'postgresql://postgres:Melapody1520$@localhost:5432/la_boutique_db'
});

async function runMigration() {
  try {
    await client.connect();
    console.log('📊 Ejecutando migración de verificación de email...');
    
    const migration = fs.readFileSync('./sql/migrations/add-email-verification.sql', 'utf8');
    await client.query(migration);
    
    console.log('✅ Migración completada exitosamente');
  } catch (err) {
    console.error('❌ Error en la migración:', err.message);
  } finally {
    await client.end();
  }
}

runMigration();
