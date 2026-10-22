import "server-only";
import { and, count, eq, gt, lt } from "drizzle-orm";
import { headers } from "next/headers";
import type { Db } from "@/lib/db";
import { throttleEvents } from "@/lib/db/schema";

/**
 * Database-backed failure throttle for sign-in and access-key attempts.
 * Counts failures per bucket in a sliding window. No Redis needed at the
 * scale of one event.
 */

export type ThrottleRule = { limit: number; windowMs: number };

/**
 * Per-account limits are tight. Per-IP limits are loose because a whole
 * venue usually shares one public IP behind the campus NAT.
 */
export const rules = {
  participantLoginAccount: { limit: 10, windowMs: 15 * 60_000 },
  participantLoginIp: { limit: 300, windowMs: 15 * 60_000 },
  adminLoginAccount: { limit: 5, windowMs: 15 * 60_000 },
  adminLoginIp: { limit: 30, windowMs: 15 * 60_000 },
  accessKey: { limit: 8, windowMs: 10 * 60_000 },
} satisfies Record<string, ThrottleRule>;

export async function isThrottled(
  db: Db,
  checks: [bucket: string, rule: ThrottleRule][],
): Promise<boolean> {
  for (const [bucket, rule] of checks) {
    const since = new Date(Date.now() - rule.windowMs);
    const [row] = await db
      .select({ failures: count() })
      .from(throttleEvents)
      .where(
        and(
          eq(throttleEvents.bucket, bucket),
          gt(throttleEvents.createdAt, since),
        ),
      );
    if ((row?.failures ?? 0) >= rule.limit) return true;
  }
  return false;
}

export async function recordFailure(db: Db, buckets: string[]): Promise<void> {
  await db.insert(throttleEvents).values(buckets.map((bucket) => ({ bucket })));
  // Opportunistic cleanup keeps the table small without a cron job.
  if (Math.random() < 0.05) {
    await db
      .delete(throttleEvents)
      .where(lt(throttleEvents.createdAt, new Date(Date.now() - 86_400_000)));
  }
}

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
