"use server";

import { eq } from "drizzle-orm";
import { z } from "zod";
import { requireAdminDb } from "@/lib/auth/session";
import { contactSubmissions } from "@/lib/db/schema";
import type { ActionState } from "@/lib/validations/form";

export async function deleteMessage(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = z.uuid().safeParse(formData.get("messageId"));
  if (!id.success) return { status: "error", message: "Unknown message." };
  try {
    await db
      .delete(contactSubmissions)
      .where(eq(contactSubmissions.id, id.data));
    return { status: "success", message: "Message deleted." };
  } catch (error) {
    console.error("deleteMessage failed", error);
    return { status: "error", message: "The message could not be deleted." };
  }
}
