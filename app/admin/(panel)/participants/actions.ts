"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdminDb } from "@/lib/auth/session";
import {
  authSessions,
  authUsers,
  participants,
  roundAttempts,
} from "@/lib/db/schema";
import { parseRoster } from "@/lib/participants/roster";
import { type ActionState, invalid } from "@/lib/validations/form";
import {
  participantSchema,
  rosterImportSchema,
} from "@/lib/validations/participants";

const FAILED: ActionState = {
  status: "error",
  message: "The change could not be saved. Try again.",
};

const idSchema = z.uuid();

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Postgres unique violation, e.g. a USN that is already registered. */
function isUniqueViolation(error: unknown): boolean {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (
    (error as { code?: string })?.code === "23505" || cause?.code === "23505"
  );
}

export async function addParticipant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = participantSchema.safeParse({
    usn: text(formData, "usn"),
    fullName: text(formData, "fullName"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    const [created] = await db
      .insert(participants)
      .values(parsed.data)
      .onConflictDoNothing()
      .returning({ id: participants.id });
    if (!created)
      return {
        status: "error",
        message: `${parsed.data.usn} is already registered.`,
      };
    return {
      status: "success",
      message: `${parsed.data.fullName} (${parsed.data.usn}) added.`,
    };
  } catch (error) {
    console.error("addParticipant failed", error);
    return FAILED;
  }
}

/** Bulk import of `USN,Full Name` lines. All-or-nothing on format errors. */
export async function importParticipants(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = rosterImportSchema.safeParse({
    roster: text(formData, "roster"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { entries, errors } = parseRoster(parsed.data.roster);
  if (errors.length) {
    return {
      status: "error",
      message: `Nothing imported: ${errors.length} line${errors.length === 1 ? "" : "s"} need fixing.`,
      issues: errors
        .slice(0, 25)
        .map((e) => (e.line ? `Line ${e.line}: ${e.message}` : e.message)),
    };
  }
  if (entries.length === 0)
    return { status: "error", message: "No participants found in the text." };

  try {
    let added = 0;
    for (let i = 0; i < entries.length; i += 500) {
      const rows = await db
        .insert(participants)
        .values(entries.slice(i, i + 500))
        .onConflictDoNothing({ target: participants.usn })
        .returning({ id: participants.id });
      added += rows.length;
    }
    const skipped = entries.length - added;
    return {
      status: "success",
      message: `${added} added${skipped ? `, ${skipped} skipped (USN already registered)` : ""}.`,
    };
  } catch (error) {
    console.error("importParticipants failed", error);
    return FAILED;
  }
}

export async function updateParticipant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = idSchema.safeParse(text(formData, "participantId"));
  const parsed = participantSchema.safeParse({
    usn: text(formData, "usn"),
    fullName: text(formData, "fullName"),
  });
  if (!id.success) return { status: "error", message: "Unknown participant." };
  if (!parsed.success) return invalid(parsed.error);
  try {
    const [updated] = await db
      .update(participants)
      .set(parsed.data)
      .where(eq(participants.id, id.data))
      .returning({ userId: participants.userId });
    if (!updated)
      return { status: "error", message: "That participant no longer exists." };
    if (updated.userId) {
      await db
        .update(authUsers)
        .set({ name: parsed.data.fullName })
        .where(eq(authUsers.id, updated.userId));
    }
    return { status: "success", message: "Participant saved." };
  } catch (error) {
    if (isUniqueViolation(error)) {
      return {
        status: "error",
        message: `${parsed.data.usn} belongs to another participant.`,
      };
    }
    console.error("updateParticipant failed", error);
    return FAILED;
  }
}

/** Signs the participant out everywhere. They can log in again. */
export async function endParticipantSessions(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = idSchema.safeParse(text(formData, "participantId"));
  if (!id.success) return { status: "error", message: "Unknown participant." };
  try {
    const [entry] = await db
      .select({ userId: participants.userId })
      .from(participants)
      .where(eq(participants.id, id.data));
    if (entry?.userId)
      await db
        .delete(authSessions)
        .where(eq(authSessions.userId, entry.userId));
    return { status: "success", message: "Sessions ended." };
  } catch (error) {
    console.error("endParticipantSessions failed", error);
    return FAILED;
  }
}

/**
 * Deletes one round attempt and its answers, so the participant can unlock
 * the round again (for example after a device failure).
 */
export async function resetAttempt(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = idSchema.safeParse(text(formData, "attemptId"));
  const participantId = idSchema.safeParse(text(formData, "participantId"));
  if (!id.success || !participantId.success)
    return { status: "error", message: "Unknown attempt." };
  try {
    await db
      .delete(roundAttempts)
      .where(
        and(
          eq(roundAttempts.id, id.data),
          eq(roundAttempts.participantId, participantId.data),
        ),
      );
    return {
      status: "success",
      message: "Attempt reset. The participant can unlock the round again.",
    };
  } catch (error) {
    console.error("resetAttempt failed", error);
    return FAILED;
  }
}

/** Removes the participant, their attempts, answers, login and sessions. */
export async function deleteParticipant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = idSchema.safeParse(text(formData, "participantId"));
  if (!id.success) return { status: "error", message: "Unknown participant." };
  try {
    const [deleted] = await db
      .delete(participants)
      .where(eq(participants.id, id.data))
      .returning({ userId: participants.userId });
    if (deleted?.userId) {
      await db
        .delete(authUsers)
        .where(
          and(
            eq(authUsers.id, deleted.userId),
            eq(authUsers.role, "participant"),
          ),
        );
    }
  } catch (error) {
    console.error("deleteParticipant failed", error);
    return FAILED;
  }
  redirect("/admin/participants");
}
