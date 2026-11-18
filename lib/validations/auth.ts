import { z } from "zod";
import {
  isValidUsn,
  normalizeName,
  normalizeUsn,
} from "@/lib/participants/roster";

export const usnSchema = z
  .string()
  .max(40, "That USN is too long.")
  .transform(normalizeUsn)
  .refine(isValidUsn, "Enter a valid USN (letters and digits, 5 to 20 long).");

export const fullNameSchema = z
  .string()
  .max(200, "That name is too long.")
  .transform(normalizeName)
  .pipe(
    z
      .string()
      .min(2, "Enter your full name.")
      .max(100, "Keep the name under 100 characters."),
  );

export const participantLoginSchema = z.object({
  fullName: fullNameSchema,
  usn: usnSchema,
});
export type ParticipantLoginInput = z.infer<typeof participantLoginSchema>;

const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254)
  .pipe(z.email("Enter a valid email address."));

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(256),
});

/** Same limits as Better Auth's emailAndPassword config (lib/auth/server.ts). */
const adminPasswordSchema = z
  .string()
  .min(12, "Use at least 12 characters.")
  .max(128, "Use at most 128 characters.");

/** A password typed twice; the repeat must match. */
const passwordPair = {
  password: adminPasswordSchema,
  confirmPassword: z.string().max(256),
};
const passwordsMatch = (value: { password: string; confirmPassword: string }) =>
  value.password === value.confirmPassword;
const mismatch = {
  path: ["confirmPassword"],
  message: "The two passwords do not match.",
};

export const newAdminSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(2, "Enter the admin's name.")
      .max(100, "Keep the name under 100 characters."),
    // Participant accounts use placeholder addresses under .invalid.
    email: emailSchema.refine(
      (email) => !email.endsWith(".invalid"),
      "Use a real email address.",
    ),
    ...passwordPair,
  })
  .refine(passwordsMatch, mismatch);

export const adminPasswordResetSchema = z
  .object({ userId: z.string().min(1).max(100), ...passwordPair })
  .refine(passwordsMatch, mismatch);
