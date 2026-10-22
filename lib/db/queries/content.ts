import "server-only";
import { asc, eq } from "drizzle-orm";
import { cacheLife, cacheTag } from "next/cache";
import {
  defaultEventInfo,
  defaultPeople,
  defaultRounds,
  type EventInfo,
  type Person,
  type RoundSummary,
} from "@/lib/content/defaults";
import { getDb } from "@/lib/db";
import { eventInfo, people, rounds } from "@/lib/db/schema";

/** Cache tags. Admin actions call `updateTag` with these after a write. */
export const tags = { content: "content", rounds: "rounds" } as const;

/** Public event details for Home and Contact. Cached until an admin edits them. */
export async function getEventInfo(): Promise<EventInfo> {
  "use cache";
  cacheTag(tags.content);
  cacheLife("days");
  const db = getDb();
  if (!db) return defaultEventInfo;
  const [row] = await db
    .select({
      name: eventInfo.name,
      tagline: eventInfo.tagline,
      introduction: eventInfo.introduction,
      details: eventInfo.details,
      eventDate: eventInfo.eventDate,
      venue: eventInfo.venue,
      organizer: eventInfo.organizer,
      leadName: eventInfo.leadName,
      leadEmail: eventInfo.leadEmail,
      leadPhone: eventInfo.leadPhone,
      resultsPublished: eventInfo.resultsPublished,
      winnerCount: eventInfo.winnerCount,
    })
    .from(eventInfo)
    .where(eq(eventInfo.id, 1));
  return row ?? defaultEventInfo;
}

export async function getPeople(): Promise<Person[]> {
  "use cache";
  cacheTag(tags.content);
  cacheLife("days");
  const db = getDb();
  if (!db) return defaultPeople;
  return db
    .select({
      id: people.id,
      kind: people.kind,
      name: people.name,
      role: people.role,
      department: people.department,
      bio: people.bio,
      email: people.email,
      phone: people.phone,
      photoUrl: people.photoUrl,
      position: people.position,
    })
    .from(people)
    .orderBy(asc(people.position), asc(people.name));
}

/** Round names and descriptions for the public pages. */
export async function getRoundSummaries(): Promise<RoundSummary[]> {
  "use cache";
  cacheTag(tags.rounds);
  cacheLife("days");
  const db = getDb();
  if (!db) return defaultRounds;
  const rows = await db
    .select({
      number: rounds.number,
      title: rounds.title,
      description: rounds.description,
      status: rounds.status,
      durationMinutes: rounds.durationMinutes,
      sequential: rounds.sequential,
    })
    .from(rounds)
    .orderBy(asc(rounds.number));
  return rows.length ? rows : defaultRounds;
}
