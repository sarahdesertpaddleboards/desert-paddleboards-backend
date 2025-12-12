import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./schema";

const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  connectionLimit: 5,
});

// IMPORTANT: Add mode: "default"
export const db = drizzle(pool, {
  schema,
  mode: "default",
});
