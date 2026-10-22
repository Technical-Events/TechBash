/** Chart helpers for the admin dashboard. Pure: tests import this file. */

export type Bucket = { label: string; count: number };

/**
 * Splits scores from 0 to `max` into at most `buckets` equal ranges
 * ("0-2", "3-5", ...). Each score lands in exactly one range.
 */
export function scoreHistogram(
  scores: number[],
  max: number,
  buckets = 5,
): Bucket[] {
  if (max <= 0) return [{ label: "0", count: scores.length }];
  const size = Math.ceil((max + 1) / Math.min(buckets, max + 1));
  const result: Bucket[] = [];
  for (let low = 0; low <= max; low += size) {
    const high = Math.min(max, low + size - 1);
    result.push({
      label: low === high ? String(low) : `${low}-${high}`,
      count: scores.filter((s) => s >= low && s <= high).length,
    });
  }
  return result;
}

export function percent(part: number, whole: number): number {
  return whole === 0 ? 0 : Math.round((part / whole) * 100);
}
