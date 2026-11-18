import "server-only";
import { and, count, eq, gt, inArray, lt } from "drizzle-orm";
import { headers } from "next/headers";
import type { Db } from "@/lib/db";
import { throttleEvents } from "@/lib/db/schema";

/**
 * Database-backed failure throttle for sign-in, access-key and contact
 * attempts. Counts events per bucket in a sliding window. No Redis needed
 * at the scale of one event.
 */

export type ThrottleRule = { limit: number; windowMs: number };

/**
 * Per-account limits are tight. Per-IP limits are loose because a whole
 * venue usually shares one public IP behind the campus NAT.
 */
export const rules = {
  participantLoginAccount: { limit: 10, windowMs: 15 * 60_000 },
  participantLoginIp: { limit: 300, windowMs: 15 * 60_000 },
  /** One email from one IP: a stranger elsewhere cannot lock an admin out. */
  adminLoginEmailIp: { limit: 5, windowMs: 15 * 60_000 },
  /** One email from every IP together: caps guessing spread over many IPs. */
  adminLoginEmail: { limit: 50, windowMs: 15 * 60_000 },
  adminLoginIp: { limit: 30, windowMs: 15 * 60_000 },
  accessKey: { limit: 8, windowMs: 10 * 60_000 },
  /** Stored contact messages, not failures. */
  contactIp: { limit: 10, windowMs: 60 * 60_000 },
} satisfies Record<string, ThrottleRule>;

/** The rows `beginAttempt` wrote for one request. */
export type Attempt = { ids: string[] };

/**
 * Records an attempt in every bucket, then checks the limits. Writing
 * before counting means parallel requests count each other; checking first
 * would let a burst of simultaneous requests through. Returns `null` when a
 * bucket is over its limit (the attempt is then removed again).
 *
 * The rows stay as recorded failures. Call `releaseAttempt` when the
 * outcome was not a failure (success, or an error on our side).
 */
export async function beginAttempt(
  db: Db,
  checks: [bucket: string, rule: ThrottleRule][],
): Promise<Attempt | null> {
  const rows = await db
    .insert(throttleEvents)
    .values(checks.map(([bucket]) => ({ bucket })))
    .returning({ id: throttleEvents.id });
  const attempt: Attempt = { ids: rows.map((row) => row.id) };

  for (const [bucket, rule] of checks) {
    const since = new Date(Date.now() - rule.windowMs);
    const [row] = await db
      .select({ events: count() })
      .from(throttleEvents)
      .where(
        and(
          eq(throttleEvents.bucket, bucket),
          gt(throttleEvents.createdAt, since),
        ),
      );
    // The count includes this attempt, so `limit` attempts are allowed.
    if ((row?.events ?? 0) > rule.limit) {
      await releaseAttempt(db, attempt);
      return null;
    }
  }

  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.05) {
    await db
      .delete(throttleEvents)
      .where(lt(throttleEvents.createdAt, new Date(Date.now() - 86_400_000)));
  }
  return attempt;
}

/** Removes an attempt's rows: it did not fail. */
export async function releaseAttempt(db: Db, attempt: Attempt): Promise<void> {
  if (attempt.ids.length === 0) return;
  await db
    .delete(throttleEvents)
    .where(inArray(throttleEvents.id, attempt.ids));
}

/** Clears a bucket after a success, e.g. an account's earlier failures. */
export async function clearFailures(db: Db, bucket: string): Promise<void> {
  await db.delete(throttleEvents).where(eq(throttleEvents.bucket, bucket));
}

/**
 * Client IP for throttling. On Vercel `x-forwarded-for` is set by the
 * platform; elsewhere it may be spoofed, so IP buckets are paired with
 * per-account buckets.
 */
export async function clientIp(): Promise<string> {
  const list = await headers();
  return (
    list.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    list.get("x-real-ip") ||
    "unknown"
  );
}
