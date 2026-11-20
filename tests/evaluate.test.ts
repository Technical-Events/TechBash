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

test("access keys are normalized, generated as 6 digits and hinted", () => {
  assert.equal(normalizeAccessKey(" ab12-cd 34 "), "AB12CD34");
  assert.equal(normalizeAccessKey("482 917"), "482917");
  const keys = Array.from({ length: 2000 }, generateAccessKey);
  for (const key of keys) assert.match(key, /^[1-9][0-9]{5}$/);
  // 2000 draws from 900000 values: a handful of repeats at most.
  assert.ok(new Set(keys).size > 1990);
  assert.equal(accessKeyHint("482-917"), "17");
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

test("isBlobUrl only accepts public Vercel Blob URLs", async () => {
  const { isBlobUrl } = await import("../lib/content/photo.ts");
  assert.equal(
    isBlobUrl("https://store.public.blob.vercel-storage.com/people/x.jpg"),
    true,
  );
  assert.equal(
    isBlobUrl("http://store.public.blob.vercel-storage.com/people/x.jpg"),
    false,
  );
  assert.equal(isBlobUrl("https://example.com/people/x.jpg"), false);
  assert.equal(
    isBlobUrl(
      "https://store.public.blob.vercel-storage.com.evil.example/people/x.jpg",
    ),
    false,
  );
  assert.equal(isBlobUrl("/people/devika.jpg"), false);
  assert.equal(isBlobUrl("not a url"), false);
});
