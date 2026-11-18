/**
 * Access-key helpers that need no secret. Hashing lives in
 * lib/security/access-key-hash.ts (server-only).
 */

/** Uppercases and strips spaces and dashes, so "tb-ab12 cd34" = "TBAB12CD34". */
export function normalizeAccessKey(value: string): string {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

const KEY_MIN = 100_000;
const KEY_RANGE = 900_000;
// Largest multiple of KEY_RANGE below 2^32: rejection sampling keeps
// `value % KEY_RANGE` uniform.
const KEY_LIMIT = Math.floor(2 ** 32 / KEY_RANGE) * KEY_RANGE;

/**
 * Random 6-digit key such as `482917`, easy to read aloud. No leading zero,
 * so it is never mistaken for 5 digits. Brute force is held off by the
 * access-key throttle (lib/security/throttle.ts).
 */
export function generateAccessKey(): string {
  const value = new Uint32Array(1);
  do crypto.getRandomValues(value);
  while (value[0] >= KEY_LIMIT);
  return String(KEY_MIN + (value[0] % KEY_RANGE));
}

/**
 * Last two characters of the normalized key, so admins can tell keys apart
 * without the panel showing most of a 6-digit key.
 */
export function accessKeyHint(key: string): string {
  return normalizeAccessKey(key).slice(-2);
}
