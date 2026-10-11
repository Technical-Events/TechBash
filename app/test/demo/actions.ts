"use server";

import { demoQuiz } from "@/lib/quiz/demo-quiz";
import { scoreQuiz } from "@/lib/quiz/scoring";
import type { SubmitQuizResult } from "@/lib/quiz/types";
import { answersSchema } from "@/lib/validations/quiz";

/** Scores the demo quiz on the server. Nothing is stored. */
export async function submitDemoQuiz(
  input: unknown,
): Promise<SubmitQuizResult> {
  const parsed = answersSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false,
      error: "That submission could not be read. Try again.",
    };
  }
  return { ok: true, result: scoreQuiz(demoQuiz, parsed.data) };
}
