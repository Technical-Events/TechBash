/** Shared with the `quiz_difficulty` enum in lib/db/schema.ts. */
export const difficulties = ["beginner", "intermediate", "advanced"] as const;
export type Difficulty = (typeof difficulties)[number];

export type QuizOption = { id: string; text: string };

/** A question as the browser may see it: no answer key. */
export type PublicQuestion = {
  id: string;
  prompt: string;
  options: QuizOption[];
};

export type PublicQuiz = {
  slug: string;
  title: string;
  description: string;
  difficulty: Difficulty;
  questions: PublicQuestion[];
};

/** Server-side question, including the answer key. */
export type Question = PublicQuestion & {
  correctOptionId: string;
  explanation: string;
};

export type Quiz = Omit<PublicQuiz, "questions"> & { questions: Question[] };

/** Question id mapped to the selected option id. */
export type Answers = Record<string, string>;

export type QuestionReview = {
  questionId: string;
  selectedOptionId: string | null;
  correctOptionId: string;
  isCorrect: boolean;
  explanation: string;
};

export type QuizResult = {
  score: number;
  total: number;
  percent: number;
  review: QuestionReview[];
};

export type SubmitQuizResult =
  { ok: true; result: QuizResult } | { ok: false; error: string };
