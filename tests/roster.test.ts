import assert from "node:assert/strict";
import { test } from "node:test";
import {
  isValidUsn,
  namesMatch,
  normalizeName,
  normalizeUsn,
  parseRoster,
} from "../lib/participants/roster.ts";

test("normalizeUsn uppercases and strips spaces and dashes", () => {
  assert.equal(normalizeUsn(" 4jk 22-cs001 "), "4JK22CS001");
  assert.ok(isValidUsn("4JK22CS001"));
  assert.ok(!isValidUsn("4JK"));
  assert.ok(!isValidUsn("4JK22CS001'; drop"));
});

test("names match ignoring case, spacing and dots", () => {
  assert.equal(normalizeName("  Asha   K  "), "Asha K");
  assert.ok(namesMatch("S. Mohammed  Sharwan", "s mohammed sharwan"));
  assert.ok(!namesMatch("Asha K", "Asha R"));
});

test("parseRoster reads comma and tab lines and skips a header", () => {
  const result = parseRoster(
    "USN,Full Name\n4jk22cs001, Asha K\n\n4JK22CS002\tRavi  Kumar\n",
  );
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.entries, [
    { usn: "4JK22CS001", fullName: "Asha K" },
    { usn: "4JK22CS002", fullName: "Ravi Kumar" },
  ]);
});

test("parseRoster reports bad lines and duplicates with line numbers", () => {
  const result = parseRoster(
    "4JK22CS001,Asha\nnot-a-line\n4jk22cs001,Again\n??,X Y",
  );
  assert.equal(result.entries.length, 1);
  assert.deepEqual(
    result.errors.map((error) => error.line),
    [2, 3, 4],
  );
});
