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

export const adminLoginSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .pipe(z.email("Enter a valid email address.")),
  password: z.string().min(1, "Enter your password.").max(256),
});
