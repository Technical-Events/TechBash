import type { QuestionType } from "@/lib/rounds/constants";

/** A question as the browser may see it: no answer key. */
export type PublicQuestion = {
  id: string;
  type: QuestionType;
  prompt: string;
  code: string | null;
  codeLanguage: string | null;
  points: number;
  options: { id: string; text: string }[];
};

/** Result of a participant answer save. */
export type SaveAnswerResult =
  | { ok: true; savedAt: string; correct?: boolean; roundComplete?: boolean }
  | { ok: false; error: string; expired?: boolean };

export type SubmitRoundResult = { ok: true } | { ok: false; error: string };
