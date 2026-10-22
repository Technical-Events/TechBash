import { EVENT_TIME_ZONE } from "@/lib/site";

const dateTime = new Intl.DateTimeFormat("en-IN", {
  timeZone: EVENT_TIME_ZONE,
  day: "2-digit",
  month: "short",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: false,
});

/** "22 Oct, 14:05:09" in the event's time zone. */
export function formatDateTime(
  value: Date | string | null | undefined,
): string {
  if (!value) return "-";
  return dateTime.format(typeof value === "string" ? new Date(value) : value);
}
