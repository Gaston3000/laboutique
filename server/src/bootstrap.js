import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { db } from "./db.js";

export async function bootstrapDatabase() {
  const srcDir = fileURLToPath(new URL(".", import.meta.url));
  const schemaPath = resolve(srcDir, "..", "sql", "schema.sql");
  const schemaSql = await readFile(schemaPath, "utf8");
  await db.query(schemaSql);
}
