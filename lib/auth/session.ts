import "server-only";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { type Db, getDb } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { getAuth } from "./server";

export type AdminViewer = {
  role: "admin";
  userId: string;
  name: string;
  email: string;
};
export type ParticipantViewer = {
  role: "participant";
  userId: string;
  participantId: string;
  usn: string;
  fullName: string;
};
export type Viewer = AdminViewer | ParticipantViewer;

/**
 * The signed-in user for this request, or `null`. Reads the session from
 * the database (no cookie cache), so revocation applies immediately. A
 * participant removed from the roster is treated as signed out.
 * Data Access Layer: every protected page and Server Action goes through here.
 */
export const getViewer = cache(async (): Promise<Viewer | null> => {
  const auth = getAuth();
  const db = getDb();
  if (!auth || !db) return null;

  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return null;
  const { user } = session;

  if (user.role === "admin") {
    return {
      role: "admin",
      userId: user.id,
      name: user.name,
      email: user.email,
    };
  }
  const [entry] = await db
    .select()
    .from(participants)
    .where(eq(participants.userId, user.id))
    .limit(1);
  if (!entry) return null;
  return {
    role: "participant",
    userId: user.id,
    participantId: entry.id,
    usn: entry.usn,
    fullName: entry.fullName,
  };
});

/** For admin pages and actions: redirects to the admin login otherwise. */
export async function requireAdmin(): Promise<AdminViewer> {
  const viewer = await getViewer();
  if (viewer?.role !== "admin") redirect("/admin/login");
  return viewer;
}

/** For participant pages and actions: redirects to the Test login otherwise. */
export async function requireParticipant(): Promise<ParticipantViewer> {
  const viewer = await getViewer();
  if (viewer?.role !== "participant") redirect("/test");
  return viewer;
}

/** Admin plus the database client, for admin pages and Server Actions. */
export async function requireAdminDb(): Promise<{
  admin: AdminViewer;
  db: Db;
}> {
  const admin = await requireAdmin();
  const db = getDb();
  // Unreachable: a session cannot exist without a database.
  if (!db) redirect("/admin/login");
  return { admin, db };
}
