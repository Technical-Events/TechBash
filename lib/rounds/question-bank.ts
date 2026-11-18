/**
 * Question bank parsing for scripts/import-questions.ts (format documented
 * there). Pure: tests import this file directly.
 */
import { z } from "zod";
// Relative import with an extension: Node's type stripping has no "@/" alias.
import { type QuestionInput, questionSchema } from "../validations/rounds.ts";

const bankQuestionSchema = z.object({
  topic: z.string().optional(),
  type: z.enum(["single_choice", "short_text"]).default("single_choice"),
  prompt: z.string(),
  code: z.string().default(""),
  codeLanguage: z.string().default(""),
  points: z.number().int().default(1),
  options: z.array(z.string().trim().min(1)).default([]),
  answer: z.string().trim().optional(),
  acceptedAnswers: z.array(z.string()).default([]),
});

const bankSchema = z.object({
  rounds: z
    .array(
      z.object({
        round: z.number().int().min(1).max(3),
        questions: z.array(bankQuestionSchema).min(1),
      }),
    )
    .min(1),
});

type ParsedRound = { round: number; questions: QuestionInput[] };

/** Validates the whole bank; throws with every problem listed. */
export function parseBank(raw: unknown): ParsedRound[] {
  const bank = bankSchema.safeParse(raw);
  if (!bank.success) {
    throw new Error(`Invalid question bank:\n${z.prettifyError(bank.error)}`);
  }
  const problems: string[] = [];
  const seen = new Set<number>();
  const parsed = bank.data.rounds.map(({ round, questions: list }) => {
    if (seen.has(round)) problems.push(`Round ${round} appears twice.`);
    seen.add(round);
    const prompts = new Set<string>();
    return {
      round,
      questions: list.flatMap((question, index) => {
        const where = `Round ${round}, question ${index + 1}`;
        // Code rounds reuse prompts ("What is the output?"); the code differs.
        const identity = `${question.prompt.trim()}\n${question.code.trim()}`;
        if (prompts.has(identity)) {
          problems.push(
            `${where}: same prompt and code as an earlier question.`,
          );
        }
        prompts.add(identity);
        if (question.type === "single_choice") {
          const matches = question.options.filter(
            (option) => option === question.answer,
          ).length;
          if (matches !== 1) {
            problems.push(
              `${where}: "answer" must equal exactly one option's text.`,
            );
          }
          if (new Set(question.options).size !== question.options.length) {
            problems.push(`${where}: two options have the same text.`);
          }
        }
        const result = questionSchema.safeParse({
          type: question.type,
          prompt: question.prompt,
          code: question.code,
          codeLanguage: question.codeLanguage,
          points: question.points,
          acceptedAnswers: question.acceptedAnswers,
          options: question.options.map((text) => ({
            text,
            isCorrect: text === question.answer,
          })),
        });
        if (!result.success) {
          for (const issue of result.error.issues) {
            problems.push(`${where}: ${issue.message}`);
          }
          return [];
        }
        return [result.data];
      }),
    };
  });
  if (problems.length) {
    throw new Error(`Invalid question bank:\n- ${problems.join("\n- ")}`);
  }
  return parsed;
}
