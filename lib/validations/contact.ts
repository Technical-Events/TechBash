import { z } from "zod";

export const contactSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your name (at least 2 characters).")
    .max(80, "Keep your name under 80 characters."),
  email: z
    .string()
    .trim()
    .max(254, "That email address is too long.")
    .pipe(z.email("Enter a valid email address.")),
  subject: z
    .string()
    .trim()
    .min(3, "Enter a subject (at least 3 characters).")
    .max(120, "Keep the subject under 120 characters."),
  message: z
    .string()
    .trim()
    .min(10, "Write a message of at least 10 characters.")
    .max(2000, "Keep the message under 2000 characters."),
});

export type ContactInput = z.infer<typeof contactSchema>;
export type ContactField = keyof ContactInput;
export type ContactFieldErrors = Partial<Record<ContactField, string>>;

export const contactFields = Object.keys(contactSchema.shape) as ContactField[];

/** Result of the `submitContact` Server Action. */
export type ContactFormState =
  | { status: "idle" }
  | { status: "invalid"; fieldErrors: ContactFieldErrors }
  | { status: "stored" }
  | { status: "demo" }
  | { status: "throttled" }
  | { status: "error" };

/** Runs on the client for fast feedback and on the server as the authority. */
export function validateContact(
  input: unknown,
):
  | { ok: true; data: ContactInput }
  | { ok: false; fieldErrors: ContactFieldErrors } {
  const parsed = contactSchema.safeParse(input);
  if (parsed.success) return { ok: true, data: parsed.data };

  const fieldErrors: ContactFieldErrors = {};
  for (const issue of parsed.error.issues) {
    const field = issue.path[0] as ContactField;
    // First message per field only. Non-string input falls back to "required".
    fieldErrors[field] ??=
      issue.code === "invalid_type" ? "This field is required." : issue.message;
  }
  return { ok: false, fieldErrors };
}
