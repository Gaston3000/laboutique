import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import pg from "pg";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const serverRoot = path.resolve(__dirname, "../../");

dotenv.config({ path: path.join(serverRoot, ".env") });

const { Pool } = pg;

function quoteIdent(value) {
  return `"${String(value).replace(/"/g, '""')}"`;
}

function quoteString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function toPgArrayLiteral(arr) {
  return `{${arr
    .map((item) => {
      if (item === null || item === undefined) {
        return "NULL";
      }

      const text = String(item)
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"');

      return `"${text}"`;
    })
    .join(",")}}`;
}

function serializeValue(value, udtName) {
  if (value === null || value === undefined) {
    return "NULL";
  }

  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : "NULL";
  }

  if (typeof value === "boolean") {
    return value ? "TRUE" : "FALSE";
  }

  if (value instanceof Date) {
    return quoteString(value.toISOString());
  }

  if (Buffer.isBuffer(value)) {
    return `'\\x${value.toString("hex")}'`;
  }

  if (Array.isArray(value)) {
    const arrayLiteral = toPgArrayLiteral(value);
    if (udtName && udtName.startsWith("_")) {
      const baseType = udtName.slice(1);
      return `${quoteString(arrayLiteral)}::${baseType}[]`;
    }

    return quoteString(JSON.stringify(value));
  }

  if (typeof value === "object") {
    return quoteString(JSON.stringify(value));
  }

  return quoteString(value);
}

function topoSortTables(tables, dependencies) {
  const adjacency = new Map();
  const indegree = new Map();

  for (const table of tables) {
    adjacency.set(table, new Set());
    indegree.set(table, 0);
  }

  for (const { child, parent } of dependencies) {
    if (!adjacency.has(parent) || !adjacency.has(child)) {
      continue;
    }

    if (!adjacency.get(parent).has(child)) {
      adjacency.get(parent).add(child);
      indegree.set(child, (indegree.get(child) || 0) + 1);
    }
  }

  const queue = [...tables].filter((table) => indegree.get(table) === 0).sort();
  const ordered = [];

  while (queue.length > 0) {
    const current = queue.shift();
    ordered.push(current);

    for (const next of adjacency.get(current)) {
      indegree.set(next, indegree.get(next) - 1);
      if (indegree.get(next) === 0) {
        queue.push(next);
        queue.sort();
      }
    }
  }

  if (ordered.length < tables.length) {
    const remaining = tables.filter((table) => !ordered.includes(table)).sort();
    return [...ordered, ...remaining];
  }

  return ordered;
}

async function run() {
  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL no esta definido en server/.env");
  }

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();

  try {
    const tablesResult = await client.query(
      `SELECT tablename
         FROM pg_tables
        WHERE schemaname = 'public'
        ORDER BY tablename`
    );

    const tables = tablesResult.rows.map((row) => row.tablename);
    if (tables.length === 0) {
      throw new Error("No se encontraron tablas en schema public");
    }

    const depsResult = await client.query(
      `SELECT child.relname AS child, parent.relname AS parent
         FROM pg_constraint c
         JOIN pg_class child ON child.oid = c.conrelid
         JOIN pg_namespace nchild ON nchild.oid = child.relnamespace
         JOIN pg_class parent ON parent.oid = c.confrelid
         JOIN pg_namespace nparent ON nparent.oid = parent.relnamespace
        WHERE c.contype = 'f'
          AND nchild.nspname = 'public'
          AND nparent.nspname = 'public'`
    );

    const orderedTables = topoSortTables(tables, depsResult.rows);

    const lines = [];
    lines.push("-- Snapshot generado automaticamente");
    lines.push(`-- Fecha: ${new Date().toISOString()}`);
    lines.push("");
    lines.push("BEGIN;");
    lines.push("SET client_min_messages TO WARNING;");
    lines.push("");
    lines.push(
      `TRUNCATE TABLE ${orderedTables.map((table) => quoteIdent(table)).join(", ")} RESTART IDENTITY CASCADE;`
    );
    lines.push("");

    for (const table of orderedTables) {
      const colsResult = await client.query(
        `SELECT column_name, udt_name
           FROM information_schema.columns
          WHERE table_schema = 'public'
            AND table_name = $1
          ORDER BY ordinal_position`,
        [table]
      );

      const columns = colsResult.rows;
      if (columns.length === 0) {
        continue;
      }

      const dataResult = await client.query(`SELECT * FROM ${quoteIdent(table)}`);

      if (dataResult.rowCount === 0) {
        continue;
      }

      const columnNamesSql = columns.map((col) => quoteIdent(col.column_name)).join(", ");
      lines.push(`-- ${table} (${dataResult.rowCount} filas)`);

      for (const row of dataResult.rows) {
        const valuesSql = columns
          .map((col) => serializeValue(row[col.column_name], col.udt_name))
          .join(", ");

        lines.push(`INSERT INTO ${quoteIdent(table)} (${columnNamesSql}) VALUES (${valuesSql});`);
      }

      lines.push("");
    }

    const sequencesResult = await client.query(
      `SELECT table_name, column_name
         FROM information_schema.columns
        WHERE table_schema = 'public'
          AND column_default LIKE 'nextval(%'`
    );

    if (sequencesResult.rowCount > 0) {
      lines.push("-- Ajuste de secuencias");

      for (const row of sequencesResult.rows) {
        const table = row.table_name;
        const column = row.column_name;
        lines.push(
          `SELECT setval(pg_get_serial_sequence('${table}', '${column}'), COALESCE((SELECT MAX(${quoteIdent(column)}) FROM ${quoteIdent(table)}), 1), (SELECT COUNT(*) > 0 FROM ${quoteIdent(table)}));`
        );
      }

      lines.push("");
    }

    lines.push("COMMIT;");

    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    const outputDir = path.join(serverRoot, "sql", "backups");
    const outputFile = path.join(outputDir, `full_snapshot_${y}${m}${d}.sql`);

    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(outputFile, `${lines.join("\n")}\n`, "utf8");

    console.log(`Backup generado en: ${outputFile}`);
  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((error) => {
  console.error("Error al exportar base de datos:", error.message);
  process.exit(1);
});
