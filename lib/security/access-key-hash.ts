import "server-only";
import { createHmac } from "node:crypto";
import { normalizeAccessKey } from "@/lib/rounds/access-key";

/**
 * HMAC-SHA256 of a normalized access key, keyed with BETTER_AUTH_SECRET.
 * Only the hash is stored, so a database leak does not reveal keys.
 * Rotating the secret invalidates every access key: create new ones.
 */
export function hashAccessKey(key: string): string {
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!secret) throw new Error("BETTER_AUTH_SECRET is not set");
  return createHmac("sha256", secret)
    .update(`techbash-access-key:${normalizeAccessKey(key)}`)
    .digest("hex");
}
