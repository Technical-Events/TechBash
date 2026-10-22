import { z } from "zod";
import { personKinds } from "@/lib/rounds/constants";

const optionalEmail = z
  .string()
  .trim()
  .max(254)
  .refine(
    (v) => v === "" || z.email().safeParse(v).success,
    "Enter a valid email.",
  );

const optionalPhone = z
  .string()
  .trim()
  .max(30)
  .refine(
    (v) => v === "" || /^[0-9 +()-]{6,30}$/.test(v),
    "Enter a valid phone number.",
  );

export const eventInfoSchema = z.object({
  name: z.string().trim().min(2).max(80),
  tagline: z.string().trim().max(160),
  introduction: z.string().trim().max(2000),
  details: z.string().trim().max(4000),
  eventDate: z.string().trim().max(120),
  venue: z.string().trim().max(200),
  organizer: z.string().trim().max(200),
  leadName: z.string().trim().min(2).max(100),
  leadEmail: z.string().trim().max(254).pipe(z.email("Enter a valid email.")),
  leadPhone: optionalPhone,
  resultsPublished: z.boolean(),
  winnerCount: z.coerce.number().int().min(1).max(20),
});
export type EventInfoInput = z.infer<typeof eventInfoSchema>;

export const personSchema = z.object({
  kind: z.enum(personKinds),
  name: z.string().trim().min(2).max(100),
  role: z.string().trim().max(100),
  department: z.string().trim().max(150),
  bio: z.string().trim().max(1000),
  email: optionalEmail,
  phone: optionalPhone,
  position: z.coerce.number().int().min(0).max(1000),
});

export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
