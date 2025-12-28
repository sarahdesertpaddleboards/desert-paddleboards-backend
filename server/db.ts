import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "./db/schema";
import { eq } from "drizzle-orm";
import { adminUsers } from "./db/schema";

// --- connection pool ---
const pool = mysql.createPool({
  uri: process.env.DATABASE_URL!,
  connectionLimit: 5,
});

// IMPORTANT: drizzle mysql2 needs mode
export const db = drizzle(pool, {
  schema,
  mode: "default",
});

// --- legacy compatibility ---
export async function getDb() {
  return db;
}

// --- admin helpers ---
export async function getAdminById(id: number) {
  const rows = await db
    .select()
    .from(adminUsers)
    .where(eq(adminUsers.id, id))
    .limit(1);

  return rows[0] ?? null;
}

