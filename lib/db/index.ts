import "server-only";
import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

function createDb(url: string) {
  return drizzle(neon(url));
}

let db: ReturnType<typeof createDb> | undefined;

/**
 * Returns the Drizzle client, or `null` when `DATABASE_URL` is not set
 * (demo mode). Callers must handle `null`.
 */
export function getDb() {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return (db ??= createDb(url));
}
