import fs from "fs/promises";
import bcrypt from "bcryptjs";
import { parse } from "csv-parse/sync";
import { db, query } from "../db.js";

const ADMIN_FIRST_NAMES = new Set(["griselda", "nahuel", "gaston", "dylan"]);

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeComparable(value) {
  return normalizeText(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function parseDateTime(value) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  const isoCandidate = normalized.replace(" ", "T");
  const timestamp = Date.parse(isoCandidate);

  if (Number.isNaN(timestamp)) {
    return null;
  }

  return new Date(timestamp).toISOString();
}

function getRowValue(row, ...aliases) {
  for (const alias of aliases) {
    const rawValue = row?.[alias];
    const normalizedValue = normalizeText(rawValue);
    if (normalizedValue) {
      return normalizedValue;
    }
  }

  return "";
}

function buildPrimaryAddress(row) {
  for (let index = 1; index <= 10; index += 1) {
    const street = getRowValue(row, `Dirección ${index} - Calle`, `Direccion ${index} - Calle`);
    if (!street) {
      continue;
    }

    const city = getRowValue(row, `Dirección ${index} - Ciudad`, `Direccion ${index} - Ciudad`);
    const state = getRowValue(row, `Dirección ${index} - Estado/Región`, `Direccion ${index} - Estado/Region`);
    const postalCode = getRowValue(row, `Dirección ${index} - Código postal`, `Direccion ${index} - Codigo postal`);
    const country = getRowValue(row, `Dirección ${index} - País`, `Direccion ${index} - Pais`);

    return [street, city, state, postalCode, country].filter(Boolean).join(", ");
  }

  return "";
}

function buildName(firstName, lastName, email) {
  const first = normalizeText(firstName);
  const last = normalizeText(lastName);
  const fullName = [first, last].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  const fallbackFromEmail = normalizeText(email).split("@")[0] || "Sin nombre";
  return fallbackFromEmail;
}

function resolveRole(firstName) {
  const normalizedFirstName = normalizeComparable(firstName).split(/\s+/).filter(Boolean)[0] || "";
  return ADMIN_FIRST_NAMES.has(normalizedFirstName) ? "admin" : "client";
}

async function main() {
  const csvPath = process.argv[2];
  const defaultPassword = process.argv[3] || process.env.WIX_IMPORT_DEFAULT_PASSWORD || "Cambio123!";

  if (!csvPath) {
    console.error("Uso: npm run import:wix:contacts -- \"C:/ruta/contactos.csv\" \"PasswordTemporal123!\"");
    process.exit(1);
  }

  const rawCsv = await fs.readFile(csvPath, "utf8");
  const rows = parse(rawCsv, {
    columns: true,
    skip_empty_lines: true,
    relax_quotes: true,
    relax_column_count: true,
    bom: true
  });

  const usersByEmail = new Map();

  for (const row of rows) {
    const email = getRowValue(row, "Email 1").toLowerCase();
    if (!email) {
      continue;
    }

    if (usersByEmail.has(email)) {
      continue;
    }

    const firstName = getRowValue(row, "Nombre");
    const lastName = getRowValue(row, "Apellido");
    const phone = getRowValue(row, "Teléfono 1", "Telefono 1", "Teléfono 2", "Telefono 2");
    const memberStatus = getRowValue(row, "Estado de suscriptor por email") || "Nunca suscrito";
    const lastActivity = getRowValue(row, "Última actividad", "Ultima actividad");
    const lastActivityAt = parseDateTime(getRowValue(row, "Fecha de la última actividad (UTC+0)", "Fecha de la ultima actividad (UTC+0)"));
    const primaryAddress = buildPrimaryAddress(row);

    usersByEmail.set(email, {
      name: buildName(firstName, lastName, email),
      firstName,
      email,
      role: resolveRole(firstName),
      phone,
      memberStatus,
      lastActivity,
      lastActivityAt,
      primaryAddress
    });
  }

  if (!usersByEmail.size) {
    console.log("No se encontraron contactos con email para importar.");
    await db.end();
    return;
  }

  const passwordHash = await bcrypt.hash(defaultPassword, 10);

  await query("BEGIN");

  try {
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS avatar_url TEXT");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS member_status TEXT");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_activity TEXT");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS last_activity_at TIMESTAMP");
    await query("ALTER TABLE customers ADD COLUMN IF NOT EXISTS primary_address TEXT");

    await query("DELETE FROM users");
    await query(
      `DELETE FROM customers
       WHERE LOWER(TRIM(COALESCE(email, ''))) IN ('juan.perez@example.com', 'maria.gomez@example.com')`
    );

    let inserted = 0;
    let admins = 0;
    let customersUpserted = 0;

    for (const user of usersByEmail.values()) {
      await query(
        `INSERT INTO users (name, email, role, password_hash)
         VALUES ($1, $2, $3, $4)`,
        [user.name, user.email, user.role, passwordHash]
      );

      await query(
        `INSERT INTO customers (name, email, phone, member_status, last_activity, last_activity_at, primary_address)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (email) DO UPDATE
         SET
           name = EXCLUDED.name,
           phone = COALESCE(NULLIF(EXCLUDED.phone, ''), customers.phone),
           member_status = EXCLUDED.member_status,
           last_activity = EXCLUDED.last_activity,
           last_activity_at = COALESCE(EXCLUDED.last_activity_at, customers.last_activity_at),
           primary_address = COALESCE(NULLIF(EXCLUDED.primary_address, ''), customers.primary_address)`,
        [user.name, user.email, user.phone, user.memberStatus, user.lastActivity, user.lastActivityAt, user.primaryAddress]
      );

      inserted += 1;
      customersUpserted += 1;
      if (user.role === "admin") {
        admins += 1;
      }
    }

    await query("COMMIT");

    console.log(`Importación completada: ${inserted} usuarios.`);
    console.log(`Admins asignados por nombre: ${admins}.`);
    console.log(`Clientes actualizados en historial: ${customersUpserted}.`);
    console.log(`Contraseña temporal aplicada: ${defaultPassword}`);
  } catch (error) {
    await query("ROLLBACK");
    throw error;
  } finally {
    await db.end();
  }
}

main().catch((error) => {
  console.error("Error importando contactos:", error.message || error);
  process.exit(1);
});
