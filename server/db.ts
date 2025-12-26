import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "@shared/schema";

const { Pool } = pg;

// Lazy initialization to avoid crashes during module load
let pool: pg.Pool | null = null;
let drizzleDb: ReturnType<typeof drizzle> | null = null;

function getPool(): pg.Pool {
  if (!pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
  }
  return pool;
}

function getDb() {
  if (!drizzleDb) {
    drizzleDb = drizzle(getPool(), { schema });
  }
  return drizzleDb;
}

// Export a proxy that lazily initializes on first access
export const db = new Proxy({} as ReturnType<typeof drizzle>, {
  get(_, prop) {
    return (getDb() as any)[prop];
  },
});

export { getPool as pool };
