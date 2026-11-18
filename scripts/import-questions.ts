/**
 * Loads round questions from a JSON question bank into the database.
 *
 *   pnpm questions:import [file] [--round=N] [--dry-run] [--replace]
 *
 * file       Defaults to private/question-bank.json. The private/ folder is
 *            gitignored: the bank holds the answer keys, so keep it out of Git.
 * --round=N  Import only round N (1 to 3) from the file. Repeatable.
 * --dry-run  Only validate the file. Needs no database.
 * --replace  Delete a round's existing questions first. Refused once any
 *            participant has unlocked that round.
 *
 * Without --replace, a round that already has questions is refused. Every
 * round is checked before anything is written; each round is then written
 * in one transaction. Needs DATABASE_URL (from .env.local or the
 * environment) unless --dry-run.
 *
 * File format:
 *
 *   { "rounds": [ { "round": 1, "questions": [
 *       { "topic": "Civil", "prompt": "...", "options": ["A", "B", "C", "D"],
 *         "answer": "B" },
 *       { "type": "short_text", "prompt": "...", "acceptedAnswers": ["x"] }
 *   ] } ] }
 *
 * `answer` is the exact text of the correct option. Optional per question:
 * `type` (single_choice, the default, or short_text), `points` (default 1),
 * `code`, `codeLanguage`. `topic` is for the file's authors and is not
 * stored.
 */
import { randomUUID } from "node:crypto";
import { readFileSync } from "node:fs";
import { neon, neonConfig } from "@neondatabase/serverless";
import { count, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
// Relative imports with an extension: Node's type stripping has no "@/" alias.
import {
  questionOptions,
  questions,
  roundAttempts,
  rounds,
} from "../lib/db/schema.ts";
import { parseBank } from "../lib/rounds/question-bank.ts";

async function main() {
  const args = process.argv.slice(2);
  const flags = new Set(args.filter((arg) => arg.startsWith("--")));
  const only = new Set<number>();
  for (const flag of flags) {
    const round = /^--round=([1-3])$/.exec(flag);
    if (round) only.add(Number(round[1]));
    else if (flag !== "--dry-run" && flag !== "--replace") {
      throw new Error(
        `Unknown option ${flag}.\nUsage: pnpm questions:import [file] [--round=N] [--dry-run] [--replace]`,
      );
    }
  }
  const file =
    args.find((arg) => !arg.startsWith("--")) ?? "private/question-bank.json";

  let raw: unknown;
  try {
    raw = JSON.parse(readFileSync(file, "utf8"));
  } catch (error) {
    throw new Error(
      `Could not read ${file}: ${error instanceof Error ? error.message : error}`,
    );
  }
  // The whole file is validated; only the chosen rounds are imported.
  const bank = parseBank(raw).filter(
    (entry) => only.size === 0 || only.has(entry.round),
  );
  for (const round of only) {
    if (!bank.some((entry) => entry.round === round)) {
      throw new Error(`Round ${round} is not in ${file}.`);
    }
  }
  for (const { round, questions: list } of bank) {
    const points = list.reduce((total, q) => total + q.points, 0);
    console.log(`Round ${round}: ${list.length} questions, ${points} points.`);
  }
  if (flags.has("--dry-run")) {
    console.log("Dry run: the file is valid. Nothing was written.");
    return;
  }

  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fine: variables may come from the environment.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (process.env.NEON_FETCH_ENDPOINT)
    neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;
  const db = drizzle(neon(url));
  const replace = flags.has("--replace");

  // Check every round before writing any of them.
  const targets = [];
  for (const entry of bank) {
    const [round] = await db
      .select({ id: rounds.id, status: rounds.status })
      .from(rounds)
      .where(eq(rounds.number, entry.round));
    if (!round) {
      throw new Error(
        `Round ${entry.round} does not exist. Run pnpm db:migrate first.`,
      );
    }
    const [[existing], [started]] = await Promise.all([
      db
        .select({ n: count() })
        .from(questions)
        .where(eq(questions.roundId, round.id)),
      db
        .select({ n: count() })
        .from(roundAttempts)
        .where(eq(roundAttempts.roundId, round.id)),
    ]);
    if (existing.n > 0 && !replace) {
      throw new Error(
        `Round ${entry.round} already has ${existing.n} questions. Nothing was written. Use --replace to swap them.`,
      );
    }
    if (existing.n > 0 && round.status !== "draft") {
      throw new Error(
        `Round ${entry.round} is ${round.status}. Set it to draft in the admin panel before replacing its questions. Nothing was written.`,
      );
    }
    if (existing.n > 0 && started.n > 0) {
      throw new Error(
        `Round ${entry.round} has been unlocked by ${started.n} participants; replacing its questions would delete their answers. Nothing was written.`,
      );
    }
    targets.push({ ...entry, roundId: round.id, replacing: existing.n });
  }

  for (const { round, roundId, replacing, questions: list } of targets) {
    const rows = list.map((question, index) => ({
      id: randomUUID(),
      roundId,
      position: index + 1,
      type: question.type,
      prompt: question.prompt,
      code: question.code || null,
      codeLanguage: question.codeLanguage || null,
      points: question.points,
      acceptedAnswers:
        question.type === "short_text" ? question.acceptedAnswers : [],
    }));
    const optionRows = list.flatMap((question, index) =>
      question.type === "single_choice"
        ? question.options.map((option, position) => ({
            questionId: rows[index].id,
            position,
            ...option,
          }))
        : [],
    );
    await db.batch([
      db.delete(questions).where(eq(questions.roundId, roundId)),
      db.insert(questions).values(rows),
      ...(optionRows.length
        ? [db.insert(questionOptions).values(optionRows)]
        : []),
    ]);
    console.log(
      `Round ${round}: imported ${rows.length} questions${replacing ? ` (replaced ${replacing})` : ""}.`,
    );
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
