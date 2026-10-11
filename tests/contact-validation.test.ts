import assert from "node:assert/strict";
import { test } from "node:test";
import { validateContact } from "../lib/validations/contact.ts";

const valid = {
  name: "Ada Lovelace",
  email: "ada@example.com",
  subject: "Hello there",
  message: "This is a long enough message.",
};

test("accepts valid input and trims it", () => {
  const result = validateContact({
    ...valid,
    name: "  Ada  ",
    email: " ada@example.com ",
  });
  assert.ok(result.ok);
  assert.equal(result.data.name, "Ada");
  assert.equal(result.data.email, "ada@example.com");
});

test("reports one message per invalid field", () => {
  const result = validateContact({
    name: "",
    email: "nope",
    subject: "x",
    message: "short",
  });
  assert.ok(!result.ok);
  assert.deepEqual(Object.keys(result.fieldErrors).sort(), [
    "email",
    "message",
    "name",
    "subject",
  ]);
  assert.equal(result.fieldErrors.email, "Enter a valid email address.");
});

test("rejects missing and non-string fields", () => {
  const result = validateContact({ ...valid, message: undefined, name: 42 });
  assert.ok(!result.ok);
  assert.equal(result.fieldErrors.message, "This field is required.");
  assert.equal(result.fieldErrors.name, "This field is required.");
});

test("enforces the upper length limits", () => {
  const result = validateContact({ ...valid, message: "x".repeat(2001) });
  assert.ok(!result.ok);
  assert.ok(result.fieldErrors.message);
});
