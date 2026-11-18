"use server";

import { getDb } from "@/lib/db";
import { contactSubmissions } from "@/lib/db/schema";
import {
  type Attempt,
  beginAttempt,
  clientIp,
  releaseAttempt,
  rules,
} from "@/lib/security/throttle";
import {
  type ContactFormState,
  validateContact,
} from "@/lib/validations/contact";

/**
 * Validates a contact message and stores it when a database is configured,
 * at most 10 per IP per hour. Never sends email. Without `DATABASE_URL` it reports demo mode instead of
 * pretending the message went anywhere.
 */
export async function submitContact(
  _previous: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const parsed = validateContact(Object.fromEntries(formData));
  if (!parsed.ok) return { status: "invalid", fieldErrors: parsed.fieldErrors };

  const db = getDb();
  if (!db) return { status: "demo" };

  let attempt: Attempt | null = null;
  try {
    // Every stored message counts, so one visitor cannot flood the inbox.
    attempt = await beginAttempt(db, [
      [`contact:ip:${await clientIp()}`, rules.contactIp],
    ]);
    if (!attempt) return { status: "throttled" };
    await db.insert(contactSubmissions).values(parsed.data);
    return { status: "stored" };
  } catch (error) {
    // Log the cause on the server only; the client gets a generic state.
    console.error("submitContact: insert failed", error);
    if (attempt) await releaseAttempt(db, attempt).catch(() => undefined);
    return { status: "error" };
  }
}
