import assert from "node:assert/strict";
import { test } from "node:test";
import { evaluateAnswer, normalizeAnswer } from "../lib/rounds/evaluate.ts";
import {
  accessKeyHint,
  generateAccessKey,
  normalizeAccessKey,
} from "../lib/rounds/access-key.ts";

const choice = {
  type: "single_choice" as const,
  points: 2,
  acceptedAnswers: [],
  options: [
    { id: "a", isCorrect: false },
    { id: "b", isCorrect: true },
  ],
};

test("single choice is correct only for a correct option of the question", () => {
  assert.deepEqual(evaluateAnswer(choice, "b"), {
    isCorrect: true,
    pointsAwarded: 2,
  });
  assert.deepEqual(evaluateAnswer(choice, "a"), {
    isCorrect: false,
    pointsAwarded: 0,
  });
  assert.equal(evaluateAnswer(choice, "zzz").isCorrect, false);
});

test("short text matches accepted answers after normalization", () => {
  const key = {
    type: "short_text" as const,
    points: 1,
    acceptedAnswers: ["Off by one", "line 4"],
    options: [],
  };
  assert.equal(normalizeAnswer("  OFF   by ONE "), "off by one");
  assert.equal(evaluateAnswer(key, "off by one").isCorrect, true);
  assert.equal(evaluateAnswer(key, "LINE 4").isCorrect, true);
  assert.equal(evaluateAnswer(key, "line 5").isCorrect, false);
  assert.equal(evaluateAnswer(key, "   ").isCorrect, false);
});

test("short text with an empty accepted answer never matches blank input", () => {
  const key = { ...choice, type: "short_text" as const, acceptedAnswers: [""] };
  assert.equal(evaluateAnswer(key, "").isCorrect, false);
});

test("access keys are normalized, generated in groups and hinted", () => {
  assert.equal(normalizeAccessKey(" ab12-cd 34 "), "AB12CD34");
  const keys = new Set(Array.from({ length: 200 }, generateAccessKey));
  assert.equal(keys.size, 200);
  for (const key of keys) {
    assert.match(
      key,
      /^[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}-[A-HJKMNP-Z2-9]{4}$/,
    );
  }
  assert.equal(accessKeyHint("K7QM-X2PD-9HRT"), "9HRT");
});

test("sniffImageType trusts bytes, not names", async () => {
  const { sniffImageType } = await import("../lib/content/photo.ts");
  assert.equal(
    sniffImageType(new Uint8Array([0xff, 0xd8, 0xff, 0xe0])),
    "image/jpeg",
  );
  assert.equal(
    sniffImageType(
      new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    ),
    "image/png",
  );
  const webp = new TextEncoder().encode("RIFF\0\0\0\0WEBPVP8 ");
  assert.equal(sniffImageType(webp), "image/webp");
  assert.equal(
    sniffImageType(new TextEncoder().encode("<svg onload=alert(1)>")),
    null,
  );
  assert.equal(sniffImageType(new Uint8Array([])), null);
});
