import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

// Connect to default postgres database first
const defaultDb = new Pool({
  connectionString: "postgresql://postgres:Melapody1520%24@localhost:5432/postgres"
});

console.log("Creating database if it doesn't exist...");

defaultDb.query("CREATE DATABASE la_boutique_db")
  .then(() => {
    console.log("✓ Database created successfully!");
    defaultDb.end();
  })
  .catch((error) => {
    if (error.code === "42P04") {
      console.log("✓ Database already exists.");
      defaultDb.end();
    } else {
      console.error("✗ Error creating database:");
      console.error(error.message);
      defaultDb.end();
      process.exit(1);
    }
  });
