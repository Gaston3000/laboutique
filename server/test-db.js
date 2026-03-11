import dotenv from "dotenv";
import pg from "pg";

dotenv.config();

const { Pool } = pg;

const db = new Pool({
  connectionString: process.env.DATABASE_URL
});

console.log("Testing database connection...");
console.log("DATABASE_URL:", process.env.DATABASE_URL);

db.query("SELECT NOW()")
  .then((result) => {
    console.log("✓ Database connection successful!");
    console.log("Current time from DB:", result.rows[0].now);
    process.exit(0);
  })
  .catch((error) => {
    console.error("✗ Database connection failed:");
    console.error(error);
    process.exit(1);
  });
