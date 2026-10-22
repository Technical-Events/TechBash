import { z } from "zod";
import { fullNameSchema, usnSchema } from "@/lib/validations/auth";

export const participantSchema = z.object({
  usn: usnSchema,
  fullName: fullNameSchema,
});

export const rosterImportSchema = z.object({
  roster: z.string().min(1, "Paste at least one line.").max(200_000),
});
