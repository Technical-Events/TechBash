import "server-only";
import { asc, count, eq, sql, sum } from "drizzle-orm";
import type { Db } from "@/lib/db";
import {
  attemptAnswers,
  participants,
  questions,
  roundAttempts,
  rounds,
} from "@/lib/db/schema";
import {
  type ParticipantOutcome,
  type RankedParticipant,
  rankParticipants,
} from "@/lib/results/ranking";
import { finalizeExpiredAttempts } from "./attempts";

export type RoundInfo = {
  id: string;
  number: number;
  title: string;
  status: "draft" | "open" | "closed";
  questionCount: number;
  maxScore: number;
};

export type AttemptRow = {
  attemptId: string;
  participantId: string;
  roundId: string;
  roundNumber: number;
  accessKeyId: string | null;
  startedAt: Date;
  deadlineAt: Date | null;
  submittedAt: Date | null;
  autoSubmitted: boolean;
  score: number;
  answered: number;
  correct: number;
};

export type ParticipantRow = typeof participants.$inferSelect;

export type ResultsData = {
  rounds: RoundInfo[];
  participants: ParticipantRow[];
  attempts: AttemptRow[];
  ranked: RankedParticipant[];
};

/**
 * Everything the results, dashboard and export views need, read in four
 * queries. Expired attempts are finalized first so time-outs count.
 */
export async function getResultsData(db: Db): Promise<ResultsData> {
  await finalizeExpiredAttempts(db);
  const [roundRows, totals, participantRows, attemptRows] = await Promise.all([
    db
      .select({
        id: rounds.id,
        number: rounds.number,
        title: rounds.title,
        status: rounds.status,
      })
      .from(rounds)
      .orderBy(asc(rounds.number)),
    db
      .select({
        roundId: questions.roundId,
        questionCount: count(),
        maxScore: sum(questions.points).mapWith(Number),
      })
      .from(questions)
      .groupBy(questions.roundId),
    db.select().from(participants).orderBy(asc(participants.usn)),
    db
      .select({
        attemptId: roundAttempts.id,
        participantId: roundAttempts.participantId,
        roundId: roundAttempts.roundId,
        roundNumber: rounds.number,
        accessKeyId: roundAttempts.accessKeyId,
        startedAt: roundAttempts.startedAt,
        deadlineAt: roundAttempts.deadlineAt,
        submittedAt: roundAttempts.submittedAt,
        autoSubmitted: roundAttempts.autoSubmitted,
        score:
          sql<number>`coalesce(sum(${attemptAnswers.pointsAwarded}), 0)`.mapWith(
            Number,
          ),
        answered: count(attemptAnswers.id),
        correct:
          sql<number>`count(*) filter (where ${attemptAnswers.isCorrect})`.mapWith(
            Number,
          ),
      })
      .from(roundAttempts)
      .innerJoin(rounds, eq(rounds.id, roundAttempts.roundId))
      .leftJoin(attemptAnswers, eq(attemptAnswers.attemptId, roundAttempts.id))
      .groupBy(roundAttempts.id, rounds.number),
  ]);

  const roundInfo: RoundInfo[] = roundRows.map((round) => {
    const total = totals.find((t) => t.roundId === round.id);
    return {
      ...round,
      questionCount: total?.questionCount ?? 0,
      maxScore: total?.maxScore ?? 0,
    };
  });

  const outcomes: ParticipantOutcome[] = participantRows.map((p) => ({
    participantId: p.id,
    usn: p.usn,
    fullName: p.fullName,
    rounds: attemptRows
      .filter((a) => a.participantId === p.id)
      .map((a) => ({
        roundNumber: a.roundNumber,
        score: a.score,
        startedAt: a.startedAt,
        submittedAt: a.submittedAt,
      })),
  }));

  return {
    rounds: roundInfo,
    participants: participantRows,
    attempts: attemptRows,
    ranked: rankParticipants(outcomes, roundInfo.length),
  };
}

/** Per-question answer counts for one round, for the analytics charts. */
export async function getQuestionStats(db: Db, roundId: string) {
  return db
    .select({
      questionId: questions.id,
      position: questions.position,
      prompt: questions.prompt,
      points: questions.points,
      answered: count(attemptAnswers.id),
      correct:
        sql<number>`count(*) filter (where ${attemptAnswers.isCorrect})`.mapWith(
          Number,
        ),
      tries: sql<number>`coalesce(sum(${attemptAnswers.tries}), 0)`.mapWith(
        Number,
      ),
    })
    .from(questions)
    .leftJoin(attemptAnswers, eq(attemptAnswers.questionId, questions.id))
    .where(eq(questions.roundId, roundId))
    .groupBy(questions.id)
    .orderBy(asc(questions.position), asc(questions.createdAt));
}
