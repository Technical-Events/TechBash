import "server-only";
import { neon, neonConfig } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";

// Local development only: route the HTTP driver to a local Neon proxy
// (docs/DATABASE.md, "Local database"). Never set in production.
if (process.env.NEON_FETCH_ENDPOINT) {
  neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
}

function createDb(url: string) {
  return drizzle(neon(url));
}

export type Db = ReturnType<typeof createDb>;

let db: Db | undefined;

/**
 * Returns the Drizzle client, or `null` when `DATABASE_URL` is not set
 * (demo mode). Callers must handle `null`.
 */
export function getDb(): Db | null {
  const url = process.env.DATABASE_URL;
  if (!url) return null;
  return (db ??= createDb(url));
}
