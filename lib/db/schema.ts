import {
  boolean,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
// Relative import: drizzle-kit does not resolve the "@/" alias.
import { difficulties } from "../quiz/types";

// Implemented tables only. `users` and `quiz_attempts` are planned;
// see docs/DATABASE.md.

export const quizDifficulty = pgEnum("quiz_difficulty", difficulties);
export const quizStatus = pgEnum("quiz_status", [
  "draft",
  "published",
  "archived",
]);
export const questionType = pgEnum("question_type", [
  "single_choice",
  "multiple_choice",
  "true_false",
]);

const createdAt = timestamp("created_at", { withTimezone: true })
  .notNull()
  .defaultNow();
const updatedAt = timestamp("updated_at", { withTimezone: true })
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

export const quizzes = pgTable(
  "quizzes",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    slug: text("slug").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: text("category").notNull(),
    difficulty: quizDifficulty("difficulty").notNull(),
    status: quizStatus("status").notNull().default("draft"),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("quizzes_status_category_idx").on(table.status, table.category),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    quizId: uuid("quiz_id")
      .notNull()
      .references(() => quizzes.id, { onDelete: "cascade" }),
    prompt: text("prompt").notNull(),
    type: questionType("type").notNull().default("single_choice"),
    position: integer("position").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("questions_quiz_position_key").on(table.quizId, table.position),
  ],
);

export const answerOptions = pgTable(
  "answer_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
    position: integer("position").notNull(),
    createdAt,
  },
  (table) => [
    unique("answer_options_question_position_key").on(
      table.questionId,
      table.position,
    ),
  ],
);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt,
});
