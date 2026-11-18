import { z } from "zod";
// Relative import with an extension: scripts/import-questions.ts reuses
// questionSchema, and Node's type stripping has no "@/" alias.
import { questionTypes, roundStatuses } from "../rounds/constants.ts";

export const roundNumberSchema = z.coerce.number().int().min(1).max(3);

export const roundSettingsSchema = z.object({
  title: z.string().trim().min(2).max(80),
  description: z.string().trim().max(600),
  instructions: z.string().trim().max(2000),
  status: z.enum(roundStatuses),
  /** Empty means no time limit. */
  durationMinutes: z
    .string()
    .trim()
    .transform((value) => (value === "" ? null : Number(value)))
    .pipe(z.number().int().min(1).max(600).nullable()),
  sequential: z.boolean(),
});

const optionSchema = z.object({
  text: z.string().trim().max(500),
  isCorrect: z.boolean(),
});

export const MAX_OPTIONS = 6;

export const questionSchema = z
  .object({
    type: z.enum(questionTypes),
    prompt: z.string().trim().min(3, "Write the question.").max(4000),
    code: z
      .string()
      .max(20_000)
      .transform((value) => value.replace(/\s+$/, "")),
    codeLanguage: z.string().trim().max(30),
    points: z.coerce.number().int().min(1).max(100),
    acceptedAnswers: z.array(z.string().trim().min(1).max(300)).max(30),
    options: z.array(optionSchema).max(MAX_OPTIONS),
  })
  .transform((question) => ({
    ...question,
    options: question.options.filter((option) => option.text !== ""),
  }))
  .superRefine((question, ctx) => {
    if (question.type === "single_choice") {
      if (question.options.length < 2) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "Give at least two options.",
        });
      }
      if (question.options.filter((o) => o.isCorrect).length !== 1) {
        ctx.addIssue({
          code: "custom",
          path: ["options"],
          message: "Mark exactly one filled-in option as correct.",
        });
      }
    } else if (question.acceptedAnswers.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["acceptedAnswers"],
        message: "Give at least one accepted answer.",
      });
    }
  });
export type QuestionInput = z.infer<typeof questionSchema>;

/** How many of the previous round's top places advance. */
export const qualifierCountSchema = z.coerce
  .number({ error: "Enter a whole number." })
  .int("Enter a whole number.")
  .min(1, "At least one participant must advance.")
  .max(100_000);

export const accessKeySchema = z.object({
  label: z.string().trim().min(1, "Give the key a label.").max(60),
  /** Optional custom key; a random one is generated when empty. */
  customKey: z
    .string()
    .trim()
    .max(64)
    .refine(
      (value) => value === "" || /^[A-Za-z0-9 -]{6,64}$/.test(value),
      "Custom keys use 6 to 64 letters, digits, spaces or dashes.",
    ),
});

export const unlockSchema = z.object({
  round: roundNumberSchema,
  key: z.string().trim().min(1, "Enter the access key.").max(100),
});

export const saveAnswerSchema = z.object({
  round: roundNumberSchema,
  questionId: z.uuid(),
  answer: z.string().max(500),
});
