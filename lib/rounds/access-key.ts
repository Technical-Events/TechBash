/**
 * Access-key helpers that need no secret. Hashing lives in
 * lib/security/access-key-hash.ts (server-only).
 */

// No 0/O, 1/I/L: keys are read aloud and copied from a projector.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Uppercases and strips spaces and dashes, so "tb-ab12 cd34" = "TBAB12CD34". */
export function normalizeAccessKey(value: string): string {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

/** Random key such as `K7QM-X2PD-9HRT` (12 characters, about 59 bits). */
export function generateAccessKey(): string {
  const chars: string[] = [];
  // Rejection sampling: 248 is the largest multiple of 31 below 256, so
  // `byte % 31` stays uniform.
  while (chars.length < 12) {
    for (const byte of crypto.getRandomValues(new Uint8Array(16))) {
      if (byte < 248 && chars.length < 12) {
        chars.push(ALPHABET[byte % ALPHABET.length]);
      }
    }
  }
  return [0, 4, 8]
    .map((start) => chars.slice(start, start + 4).join(""))
    .join("-");
}

/** Last four characters of the normalized key. */
export function accessKeyHint(key: string): string {
  return normalizeAccessKey(key).slice(-4);
}
