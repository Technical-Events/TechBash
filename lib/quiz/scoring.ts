import type { Answers, PublicQuiz, Quiz, QuizResult } from "./types";

/** Strips answer keys and explanations so a quiz can be sent to the browser. */
export function toPublicQuiz(quiz: Quiz): PublicQuiz {
  return {
    ...quiz,
    questions: quiz.questions.map(({ id, prompt, options }) => ({
      id,
      prompt,
      options,
    })),
  };
}

/**
 * Scores single-choice answers. Unanswered questions and option ids that do
 * not belong to the question count as wrong.
 */
export function scoreQuiz(quiz: Quiz, answers: Answers): QuizResult {
  const review = quiz.questions.map((question) => {
    const selected = Object.hasOwn(answers, question.id)
      ? answers[question.id]
      : undefined;
    const selectedOptionId = question.options.some((o) => o.id === selected)
      ? (selected as string)
      : null;
    return {
      questionId: question.id,
      selectedOptionId,
      correctOptionId: question.correctOptionId,
      isCorrect: selectedOptionId === question.correctOptionId,
      explanation: question.explanation,
    };
  });

  const score = review.filter((r) => r.isCorrect).length;
  const total = review.length;
  return {
    score,
    total,
    percent: total === 0 ? 0 : Math.round((score / total) * 100),
    review,
  };
}
