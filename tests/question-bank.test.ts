import assert from "node:assert/strict";
import { test } from "node:test";
import { parseBank } from "../lib/rounds/question-bank.ts";

const choice = (prompt: string, answer = "B") => ({
  prompt,
  options: ["A", "B", "C", "D"],
  answer,
});

test("parses choice and text questions with defaults", () => {
  const [round] = parseBank({
    rounds: [
      {
        round: 1,
        questions: [
          { topic: "CSE", ...choice("First question?") },
          {
            type: "short_text",
            prompt: "Second question?",
            acceptedAnswers: ["yes"],
            points: 2,
          },
        ],
      },
    ],
  });
  assert.equal(round.round, 1);
  const [first, second] = round.questions;
  assert.equal(first.type, "single_choice");
  assert.equal(first.points, 1);
  assert.deepEqual(
    first.options.map((o) => [o.text, o.isCorrect]),
    [
      ["A", false],
      ["B", true],
      ["C", false],
      ["D", false],
    ],
  );
  assert.equal(second.type, "short_text");
  assert.deepEqual(second.acceptedAnswers, ["yes"]);
  assert.equal(second.points, 2);
});

test("rejects an answer that matches no option", () => {
  assert.throws(
    () =>
      parseBank({
        rounds: [{ round: 1, questions: [choice("Question one?", "Z")] }],
      }),
    /Round 1, question 1: "answer" must equal exactly one option/,
  );
});

test("rejects duplicate options, prompts and rounds", () => {
  assert.throws(
    () =>
      parseBank({
        rounds: [
          {
            round: 2,
            questions: [
              { prompt: "Same?", options: ["X", "X", "Y"], answer: "Y" },
              choice("Same?"),
            ],
          },
          { round: 2, questions: [choice("Other?")] },
        ],
      }),
    (error: Error) =>
      /two options have the same text/.test(error.message) &&
      /same prompt and code as an earlier question/.test(error.message) &&
      /Round 2 appears twice/.test(error.message),
  );
});

test("allows a repeated prompt when the code differs", () => {
  const [round] = parseBank({
    rounds: [
      {
        round: 3,
        questions: [
          { ...choice("What is the output?"), code: "print(1)" },
          { ...choice("What is the output?"), code: "print(2)" },
        ],
      },
    ],
  });
  assert.equal(round.questions.length, 2);
});

test("rejects a malformed file and an unknown round", () => {
  assert.throws(() => parseBank({}), /Invalid question bank/);
  assert.throws(
    () => parseBank({ rounds: [{ round: 4, questions: [choice("Q?")] }] }),
    /Invalid question bank/,
  );
});
