import { Pool } from "pg";
import dotenv from "dotenv";
dotenv.config();

export const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30_000,
  connectionTimeoutMillis: 5_000,
  // Required for Neon and most cloud Postgres providers
  ssl: process.env.DATABASE_URL?.includes("neon.tech")
    ? { rejectUnauthorized: false }
    : false,
});

db.on("error", (err) => {
  console.error("Unexpected DB error:", err);
  process.exit(-1);
});