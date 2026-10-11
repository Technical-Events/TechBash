import assert from "node:assert/strict";
import { test } from "node:test";
import { scoreQuiz, toPublicQuiz } from "../lib/quiz/scoring.ts";
import type { Quiz } from "../lib/quiz/types.ts";

const quiz: Quiz = {
  slug: "t",
  title: "T",
  description: "",
  difficulty: "beginner",
  questions: [
    {
      id: "q1",
      prompt: "1?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionId: "a",
      explanation: "because",
    },
    {
      id: "q2",
      prompt: "2?",
      options: [
        { id: "a", text: "A" },
        { id: "b", text: "B" },
      ],
      correctOptionId: "b",
      explanation: "because",
    },
  ],
};

test("scores correct, wrong and unanswered questions", () => {
  assert.deepEqual(
    { ...scoreQuiz(quiz, { q1: "a", q2: "b" }), review: undefined },
    { score: 2, total: 2, percent: 100, review: undefined },
  );
  assert.equal(scoreQuiz(quiz, { q1: "a", q2: "a" }).percent, 50);
  assert.equal(scoreQuiz(quiz, {}).score, 0);
});

test("treats unknown option ids and prototype keys as unanswered", () => {
  const result = scoreQuiz(quiz, { q1: "zzz", nope: "a" });
  assert.equal(result.score, 0);
  assert.equal(result.review[0].selectedOptionId, null);
  // "constructor" exists on Object.prototype; it must not count as an answer.
  const proto = {
    ...quiz,
    questions: [{ ...quiz.questions[0], id: "constructor" }],
  };
  assert.equal(scoreQuiz(proto, {}).review[0].selectedOptionId, null);
});

test("public quiz carries no answer key", () => {
  const json = JSON.stringify(toPublicQuiz(quiz));
  assert.ok(!json.includes("correctOptionId"));
  assert.ok(!json.includes("explanation"));
});
