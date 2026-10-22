"use server";

import { del, put } from "@vercel/blob";
import { eq } from "drizzle-orm";
import { updateTag } from "next/cache";
import { z } from "zod";
import { requireAdminDb } from "@/lib/auth/session";
import { photoExtension, sniffImageType } from "@/lib/content/photo";
import { tags } from "@/lib/db/queries/content";
import { eventInfo, people } from "@/lib/db/schema";
import {
  PHOTO_MAX_BYTES,
  eventInfoSchema,
  personSchema,
} from "@/lib/validations/content";
import { type ActionState, checkbox, invalid } from "@/lib/validations/form";

const FAILED: ActionState = {
  status: "error",
  message: "The change could not be saved. Try again.",
};

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/** Deletes an uploaded photo. Failure only leaves an orphan file, so it is logged, not raised. */
async function removeBlob(url: string | null) {
  if (!url || !process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(url);
  } catch (error) {
    console.error("removeBlob failed", error);
  }
}

export async function updateEventInfo(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = eventInfoSchema.safeParse({
    name: text(formData, "name"),
    tagline: text(formData, "tagline"),
    introduction: text(formData, "introduction"),
    details: text(formData, "details"),
    eventDate: text(formData, "eventDate"),
    venue: text(formData, "venue"),
    organizer: text(formData, "organizer"),
    leadName: text(formData, "leadName"),
    leadEmail: text(formData, "leadEmail"),
    leadPhone: text(formData, "leadPhone"),
    resultsPublished: checkbox(formData, "resultsPublished"),
    winnerCount: text(formData, "winnerCount"),
  });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db
      .insert(eventInfo)
      .values({ id: 1, ...parsed.data })
      .onConflictDoUpdate({ target: eventInfo.id, set: parsed.data });
    updateTag(tags.content);
    return { status: "success", message: "Event details saved." };
  } catch (error) {
    console.error("updateEventInfo failed", error);
    return FAILED;
  }
}

type PhotoResult =
  { ok: true; file: File | null } | { ok: false; state: ActionState };

async function readPhoto(formData: FormData): Promise<PhotoResult> {
  const file = formData.get("photo");
  if (!(file instanceof File) || file.size === 0)
    return { ok: true, file: null };
  if (file.size > PHOTO_MAX_BYTES) {
    return {
      ok: false,
      state: { status: "error", message: "Photos must be 2 MB or smaller." },
    };
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return {
      ok: false,
      state: {
        status: "error",
        message:
          "Photo uploads are not configured (BLOB_READ_WRITE_TOKEN is missing).",
      },
    };
  }
  return { ok: true, file };
}

/** Creates or updates a team member or faculty profile, with an optional photo. */
export async function savePerson(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = personSchema.safeParse({
    kind: text(formData, "kind"),
    name: text(formData, "name"),
    role: text(formData, "role"),
    department: text(formData, "department"),
    bio: text(formData, "bio"),
    email: text(formData, "email"),
    phone: text(formData, "phone"),
    position: text(formData, "position") || "0",
  });
  if (!parsed.success) return invalid(parsed.error);
  const idInput = text(formData, "personId");
  const id = idInput ? z.uuid().safeParse(idInput) : null;
  if (id && !id.success) return { status: "error", message: "Unknown person." };

  const photo = await readPhoto(formData);
  if (!photo.ok) return photo.state;

  let photoUrl: string | null | undefined;
  let saved = false;
  try {
    if (photo.file) {
      const bytes = new Uint8Array(await photo.file.arrayBuffer());
      const type = sniffImageType(bytes);
      if (!type)
        return {
          status: "error",
          message: "Upload a JPEG, PNG or WebP image.",
        };
      const blob = await put(
        `people/photo.${photoExtension[type]}`,
        Buffer.from(bytes),
        {
          access: "public",
          contentType: type,
          addRandomSuffix: true,
        },
      );
      photoUrl = blob.url;
    } else if (checkbox(formData, "removePhoto")) {
      photoUrl = null;
    }

    const values = {
      ...parsed.data,
      ...(photoUrl !== undefined ? { photoUrl } : {}),
    };
    if (id) {
      const [before] = await db
        .select({ photoUrl: people.photoUrl })
        .from(people)
        .where(eq(people.id, id.data));
      if (!before) {
        await removeBlob(photoUrl ?? null);
        return { status: "error", message: "That profile no longer exists." };
      }
      await db.update(people).set(values).where(eq(people.id, id.data));
      saved = true;
      if (photoUrl !== undefined && before.photoUrl !== photoUrl)
        await removeBlob(before.photoUrl);
    } else {
      await db.insert(people).values(values);
      saved = true;
    }
    updateTag(tags.content);
    return { status: "success", message: `${parsed.data.name} saved.` };
  } catch (error) {
    console.error("savePerson failed", error);
    // A new upload that never made it into the database is an orphan.
    if (!saved) await removeBlob(photoUrl ?? null);
    return FAILED;
  }
}

export async function deletePerson(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = z.uuid().safeParse(text(formData, "personId"));
  if (!id.success) return { status: "error", message: "Unknown person." };
  try {
    const [deleted] = await db
      .delete(people)
      .where(eq(people.id, id.data))
      .returning({ photoUrl: people.photoUrl });
    await removeBlob(deleted?.photoUrl ?? null);
    updateTag(tags.content);
    return { status: "success", message: "Profile deleted." };
  } catch (error) {
    console.error("deletePerson failed", error);
    return FAILED;
  }
}
