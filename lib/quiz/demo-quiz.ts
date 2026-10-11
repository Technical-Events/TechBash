import "server-only";
import type { Quiz } from "./types";

/**
 * DEMO DATA. Local sample questions with their answer keys.
 * Server-only so the keys never reach a client bundle. Replaced by the
 * database-backed quizzes in Phase 2 (see docs/ARCHITECTURE.md).
 */
export const demoQuiz: Quiz = {
  slug: "demo",
  title: "Web Fundamentals",
  description: "Five quick questions on HTTP, HTML, CSS and JavaScript.",
  difficulty: "beginner",
  questions: [
    {
      id: "q1",
      prompt: "Which of these HTTP methods is defined as idempotent?",
      options: [
        { id: "a", text: "POST" },
        { id: "b", text: "PUT" },
        { id: "c", text: "PATCH" },
        { id: "d", text: "CONNECT" },
      ],
      correctOptionId: "b",
      explanation:
        "PUT replaces the target resource, so repeating the same request leaves the server in the same state. POST, PATCH and CONNECT carry no such guarantee.",
    },
    {
      id: "q2",
      prompt: "What does the defer attribute do on a <script src> tag?",
      options: [
        { id: "a", text: "Blocks HTML parsing until the script has run" },
        {
          id: "b",
          text: "Runs the script as soon as it downloads, in any order",
        },
        {
          id: "c",
          text: "Downloads in parallel and runs after parsing, in document order",
        },
        { id: "d", text: "Loads the script only when the user scrolls to it" },
      ],
      correctOptionId: "c",
      explanation:
        "Deferred scripts download without blocking the parser and execute in order once the document has been parsed. Running as soon as downloaded is what async does.",
    },
    {
      id: "q3",
      prompt:
        "Which status code tells a client that it must authenticate to get the response?",
      options: [
        { id: "a", text: "400 Bad Request" },
        { id: "b", text: "401 Unauthorized" },
        { id: "c", text: "403 Forbidden" },
        { id: "d", text: "404 Not Found" },
      ],
      correctOptionId: "b",
      explanation:
        "401 means credentials are missing or invalid. 403 means the server knows who you are and still refuses.",
    },
    {
      id: "q4",
      prompt: "Which CSS selector has the highest specificity?",
      options: [
        { id: "a", text: "ul li a" },
        { id: "b", text: "a:hover" },
        { id: "c", text: ".nav.active" },
        { id: "d", text: "#nav" },
      ],
      correctOptionId: "d",
      explanation:
        "One id (1,0,0) outranks any number of classes, pseudo-classes or element selectors.",
    },
    {
      id: "q5",
      prompt: "In JavaScript, what does typeof null evaluate to?",
      options: [
        { id: "a", text: '"null"' },
        { id: "b", text: '"undefined"' },
        { id: "c", text: '"object"' },
        { id: "d", text: '"number"' },
      ],
      correctOptionId: "c",
      explanation:
        'A bug from the first JavaScript implementation that was kept for compatibility: typeof null is "object".',
    },
  ],
};
