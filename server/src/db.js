import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

// Fix: PostgreSQL devuelve "timestamp without time zone" sin indicador de zona.
// El driver de Node lo interpreta como hora local (incorrectamente).
// Forzamos que se interprete como UTC (que es como PG lo almacena con timezone=GMT).
pg.types.setTypeParser(1114, (val) => val + "+00");

const { Pool } = pg;

export const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

export async function query(text, params = []) {
  const result = await db.query(text, params);
  return result;
}
