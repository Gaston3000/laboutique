import { db, query } from "../db.js";

async function migrateUsersAuthColumns() {
  try {
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified BOOLEAN NOT NULL DEFAULT FALSE");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code TEXT");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS verification_code_expires_at TIMESTAMP");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_discount_active BOOLEAN NOT NULL DEFAULT FALSE");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_discount_expires_at TIMESTAMP");
    await query("ALTER TABLE users ADD COLUMN IF NOT EXISTS welcome_discount_used BOOLEAN NOT NULL DEFAULT FALSE");

    await query("UPDATE users SET email_verified = FALSE WHERE email_verified IS NULL");
    await query("UPDATE users SET welcome_discount_active = FALSE WHERE welcome_discount_active IS NULL");
    await query("UPDATE users SET welcome_discount_used = FALSE WHERE welcome_discount_used IS NULL");

    console.log("Migracion OK: columnas de autenticacion en users listas.");
  } catch (error) {
    console.error("Error en migracion de users/auth:", error);
    process.exitCode = 1;
  } finally {
    await db.end();
  }
}

migrateUsersAuthColumns();