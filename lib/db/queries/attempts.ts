import "server-only";
import {
  and,
  asc,
  count,
  eq,
  inArray,
  isNotNull,
  isNull,
  lt,
  sql,
  sum,
} from "drizzle-orm";
import type { Db } from "@/lib/db";
import {
  attemptAnswers,
  questionOptions,
  questions,
  roundAttempts,
  roundQualifiers,
  rounds,
} from "@/lib/db/schema";
import type { PublicQuestion } from "@/lib/rounds/types";

/** Saves are accepted this long after the deadline, for network delay. */
export const DEADLINE_GRACE_MS = 15_000;

/**
 * Submits every attempt whose deadline (plus grace) has passed. The
 * submission time is the deadline itself, so time taken equals the limit.
 * Called before anything reads attempt state.
 */
export async function finalizeExpiredAttempts(db: Db): Promise<void> {
  await db
    .update(roundAttempts)
    .set({ submittedAt: sql`${roundAttempts.deadlineAt}`, autoSubmitted: true })
    .where(
      and(
        isNull(roundAttempts.submittedAt),
        isNotNull(roundAttempts.deadlineAt),
        lt(
          roundAttempts.deadlineAt,
          sql`now() - make_interval(secs => ${DEADLINE_GRACE_MS / 1000})`,
        ),
      ),
    );
}

/** Submits every open attempt of a round, e.g. when an admin closes it. */
export async function finalizeRoundAttempts(db: Db, roundId: string) {
  await db
    .update(roundAttempts)
    .set({
      submittedAt: sql`least(now(), coalesce(${roundAttempts.deadlineAt}, now()))`,
      autoSubmitted: true,
    })
    .where(
      and(
        eq(roundAttempts.roundId, roundId),
        isNull(roundAttempts.submittedAt),
      ),
    );
}

export type AttemptState = typeof roundAttempts.$inferSelect;

export type ParticipantRoundCard = {
  id: string;
  number: number;
  title: string;
  description: string;
  instructions: string;
  status: "draft" | "open" | "closed";
  durationMinutes: number | null;
  sequential: boolean;
  questionCount: number;
  maxScore: number;
  attempt: AttemptState | null;
  score: number;
  /** False when the round admits only the previous round's top N and this participant is not one of them. */
  qualified: boolean;
  /** The admin's top N for this round, or null when everyone may take it. */
  qualifierLimit: number | null;
};

/**
 * Whether a participant may take a round: always, unless the admin limited
 * it to the previous round's top N.
 */
export async function isQualified(
  db: Db,
  round: { id: string; qualifierLimit: number | null },
  participantId: string,
): Promise<boolean> {
  if (round.qualifierLimit === null) return true;
  const [row] = await db
    .select({ rank: roundQualifiers.rank })
    .from(roundQualifiers)
    .where(
      and(
        eq(roundQualifiers.roundId, round.id),
        eq(roundQualifiers.participantId, participantId),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** The three rounds as one participant sees them on the Test page. */
export async function getParticipantRounds(
  db: Db,
  participantId: string,
): Promise<ParticipantRoundCard[]> {
  await finalizeExpiredAttempts(db);
  const [roundRows, totals, attempts, qualifiedRows] = await Promise.all([
    db.select().from(rounds).orderBy(asc(rounds.number)),
    db
      .select({
        roundId: questions.roundId,
        questionCount: count(),
        maxScore: sum(questions.points).mapWith(Number),
      })
      .from(questions)
      .groupBy(questions.roundId),
    db
      .select({
        attempt: roundAttempts,
        score:
          sql<number>`coalesce(sum(${attemptAnswers.pointsAwarded}), 0)`.mapWith(
            Number,
          ),
      })
      .from(roundAttempts)
      .leftJoin(attemptAnswers, eq(attemptAnswers.attemptId, roundAttempts.id))
      .where(eq(roundAttempts.participantId, participantId))
      .groupBy(roundAttempts.id),
    db
      .select({ roundId: roundQualifiers.roundId })
      .from(roundQualifiers)
      .where(eq(roundQualifiers.participantId, participantId)),
  ]);
  const qualifiedFor = new Set(qualifiedRows.map((row) => row.roundId));

  return roundRows.map((round) => {
    const total = totals.find((t) => t.roundId === round.id);
    const attempt = attempts.find((a) => a.attempt.roundId === round.id);
    return {
      id: round.id,
      number: round.number,
      title: round.title,
      description: round.description,
      instructions: round.instructions,
      status: round.status,
      durationMinutes: round.durationMinutes,
      sequential: round.sequential,
      questionCount: total?.questionCount ?? 0,
      maxScore: total?.maxScore ?? 0,
      attempt: attempt?.attempt ?? null,
      score: attempt?.score ?? 0,
      qualified: round.qualifierLimit === null || qualifiedFor.has(round.id),
      qualifierLimit: round.qualifierLimit,
    };
  });
}

export type SavedAnswer = {
  answer: string;
  /** Only sent for sequential rounds, where feedback is immediate. */
  isCorrect?: boolean;
  tries: number;
};

export type ParticipantRoundView = {
  round: typeof rounds.$inferSelect;
  attempt: AttemptState;
  /** Without answer keys. In sequential rounds: solved clues plus the current one. */
  questions: PublicQuestion[];
  answers: Record<string, SavedAnswer>;
  totalQuestions: number;
  /** Sequential rounds only; always 0 otherwise. */
  solvedCount: number;
};

/** Questions of a round with their options, answer keys included (server only). */
export async function getRoundQuestions(db: Db, roundId: string) {
  const questionRows = await db
    .select()
    .from(questions)
    .where(eq(questions.roundId, roundId))
    .orderBy(asc(questions.position), asc(questions.createdAt));
  const ids = questionRows.map((q) => q.id);
  const optionRows = ids.length
    ? await db
        .select()
        .from(questionOptions)
        .where(inArray(questionOptions.questionId, ids))
        .orderBy(asc(questionOptions.position))
    : [];
  return questionRows.map((question) => ({
    ...question,
    options: optionRows.filter((o) => o.questionId === question.id),
  }));
}

export type RoundQuestion = Awaited<
  ReturnType<typeof getRoundQuestions>
>[number];

/** Strips everything the browser must not see before the round is submitted. */
export function toPublicQuestion(question: RoundQuestion): PublicQuestion {
  return {
    id: question.id,
    type: question.type,
    prompt: question.prompt,
    code: question.code,
    codeLanguage: question.codeLanguage,
    points: question.points,
    options: question.options.map(({ id, text }) => ({ id, text })),
  };
}

/** Index of the first unsolved question; equals length when all are solved. */
export function currentClueIndex(
  list: { id: string }[],
  answers: Map<string, { isCorrect: boolean }>,
): number {
  const index = list.findIndex((q) => !answers.get(q.id)?.isCorrect);
  return index === -1 ? list.length : index;
}

export async function getAttempt(
  db: Db,
  participantId: string,
  roundId: string,
) {
  const [attempt] = await db
    .select()
    .from(roundAttempts)
    .where(
      and(
        eq(roundAttempts.participantId, participantId),
        eq(roundAttempts.roundId, roundId),
      ),
    )
    .limit(1);
  return attempt ?? null;
}

export async function getAttemptAnswers(db: Db, attemptId: string) {
  return db
    .select()
    .from(attemptAnswers)
    .where(eq(attemptAnswers.attemptId, attemptId));
}

/**
 * One round for the participant's round page. `null` when not unlocked,
 * or when the participant is not (or no longer) qualified for it.
 */
export async function getParticipantRound(
  db: Db,
  participantId: string,
  roundNumber: number,
): Promise<ParticipantRoundView | null> {
  await finalizeExpiredAttempts(db);
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.number, roundNumber))
    .limit(1);
  if (!round) return null;
  const [attempt, qualified] = await Promise.all([
    getAttempt(db, participantId, round.id),
    isQualified(db, round, participantId),
  ]);
  if (!attempt || !qualified) return null;

  const [list, answerRows] = await Promise.all([
    getRoundQuestions(db, round.id),
    getAttemptAnswers(db, attempt.id),
  ]);
  const byQuestion = new Map(answerRows.map((a) => [a.questionId, a]));
  // Correctness is only revealed in sequential rounds.
  const solvedCount = round.sequential
    ? answerRows.filter((a) => a.isCorrect).length
    : 0;

  const visible = round.sequential
    ? list.slice(0, currentClueIndex(list, byQuestion) + 1)
    : list;

  const answers: Record<string, SavedAnswer> = {};
  for (const question of visible) {
    const saved = byQuestion.get(question.id);
    if (!saved) continue;
    answers[question.id] = {
      answer: saved.answer,
      tries: saved.tries,
      ...(round.sequential ? { isCorrect: saved.isCorrect } : {}),
    };
  }

  return {
    round,
    attempt,
    questions: visible.map(toPublicQuestion),
    answers,
    totalQuestions: list.length,
    solvedCount,
  };
}
