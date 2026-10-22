import type { QuestionType } from "./constants.ts";

/**
 * Answer checking. Pure functions: the server calls them when an answer is
 * saved, and tests import this file directly.
 */

/** Case-insensitive, whitespace-insensitive form of a typed answer. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en");
}

export type AnswerKey = {
  type: QuestionType;
  points: number;
  acceptedAnswers: string[];
  options: { id: string; isCorrect: boolean }[];
};

export type Evaluation = { isCorrect: boolean; pointsAwarded: number };

/**
 * Single choice: `answer` is an option id and must be a correct option of
 * this question. Short text: matches any accepted answer after
 * normalization.
 */
export function evaluateAnswer(key: AnswerKey, answer: string): Evaluation {
  const isCorrect =
    key.type === "single_choice"
      ? key.options.some((option) => option.id === answer && option.isCorrect)
      : answer.trim() !== "" &&
        key.acceptedAnswers.some(
          (accepted) => normalizeAnswer(accepted) === normalizeAnswer(answer),
        );
  return { isCorrect, pointsAwarded: isCorrect ? key.points : 0 };
}
