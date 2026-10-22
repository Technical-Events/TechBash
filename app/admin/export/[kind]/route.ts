import { and, asc, eq, sql } from "drizzle-orm";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getResultsData } from "@/lib/db/queries/results";
import {
  attemptAnswers,
  participants,
  questionOptions,
  questions,
  roundAttempts,
  rounds,
} from "@/lib/db/schema";
import { type CsvValue, formatDuration, toCsv } from "@/lib/results/csv";
import { firstFinisher } from "@/lib/results/ranking";

function error(status: number, code: string, message: string) {
  return Response.json(
    { error: { code, message } },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/** CSV exports for admins: `results`, `participants` or `answers`. */
export async function GET(
  _request: Request,
  context: RouteContext<"/admin/export/[kind]">,
) {
  const viewer = await getViewer();
  if (viewer?.role !== "admin")
    return error(401, "unauthorized", "Admin sign-in required.");
  const db = getDb();
  if (!db) return error(503, "unavailable", "No database configured.");
  const { kind } = await context.params;

  try {
    let header: string[];
    let rows: CsvValue[][];

    if (kind === "results" || kind === "participants") {
      const data = await getResultsData(db);
      const first = firstFinisher(data.ranked);
      const attemptOf = (participantId: string, roundId: string) =>
        data.attempts.find(
          (a) => a.participantId === participantId && a.roundId === roundId,
        );

      if (kind === "participants") {
        header = ["usn", "full_name", "registered_at", "last_login_at"];
        rows = data.participants.map((p) => [
          p.usn,
          p.fullName,
          p.createdAt,
          p.lastLoginAt,
        ]);
      } else {
        header = [
          "rank",
          "usn",
          "full_name",
          ...data.rounds.flatMap((r) => [
            `round${r.number}_score`,
            `round${r.number}_status`,
            `round${r.number}_started_at`,
            `round${r.number}_submitted_at`,
          ]),
          "total_score",
          "rounds_submitted",
          "time_taken",
          "time_taken_seconds",
          "finished_at",
          "first_finisher",
        ];
        rows = data.ranked.map((entry) => [
          entry.rank,
          entry.usn,
          entry.fullName,
          ...data.rounds.flatMap((round) => {
            const attempt = attemptOf(entry.participantId, round.id);
            const status = !attempt
              ? "not_started"
              : !attempt.submittedAt
                ? "in_progress"
                : attempt.autoSubmitted
                  ? "auto_submitted"
                  : "submitted";
            return [
              attempt?.score ?? 0,
              status,
              attempt?.startedAt,
              attempt?.submittedAt,
            ];
          }),
          entry.totalScore,
          entry.roundsSubmitted,
          formatDuration(entry.timeTakenMs),
          Math.round(entry.timeTakenMs / 1000),
          entry.finishedAt,
          first?.participantId === entry.participantId ? "yes" : "",
        ]);
      }
    } else if (kind === "answers") {
      const answerRows = await db
        .select({
          usn: participants.usn,
          fullName: participants.fullName,
          round: rounds.number,
          position: questions.position,
          type: questions.type,
          prompt: questions.prompt,
          answer: attemptAnswers.answer,
          optionText: questionOptions.text,
          isCorrect: attemptAnswers.isCorrect,
          points: attemptAnswers.pointsAwarded,
          tries: attemptAnswers.tries,
          answeredAt: attemptAnswers.answeredAt,
        })
        .from(attemptAnswers)
        .innerJoin(
          roundAttempts,
          eq(roundAttempts.id, attemptAnswers.attemptId),
        )
        .innerJoin(
          participants,
          eq(participants.id, roundAttempts.participantId),
        )
        .innerJoin(questions, eq(questions.id, attemptAnswers.questionId))
        .innerJoin(rounds, eq(rounds.id, questions.roundId))
        .leftJoin(
          questionOptions,
          and(
            eq(questionOptions.questionId, questions.id),
            sql`${questionOptions.id}::text = ${attemptAnswers.answer}`,
          ),
        )
        .orderBy(
          asc(participants.usn),
          asc(rounds.number),
          asc(questions.position),
        );
      header = [
        "usn",
        "full_name",
        "round",
        "question_position",
        "question",
        "answer",
        "correct",
        "points",
        "tries",
        "answered_at",
      ];
      rows = answerRows.map((r) => [
        r.usn,
        r.fullName,
        r.round,
        r.position,
        r.prompt,
        r.type === "single_choice"
          ? (r.optionText ?? "(removed option)")
          : r.answer,
        r.isCorrect ? "yes" : "no",
        r.points,
        r.tries,
        r.answeredAt,
      ]);
    } else {
      return error(404, "not_found", "Unknown export.");
    }

    const stamp = new Date().toISOString().slice(0, 16).replace(/[:T]/g, "-");
    // BOM so spreadsheet apps read the file as UTF-8.
    return new Response(`﻿${toCsv(header, rows)}`, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="techbash-${kind}-${stamp}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (cause) {
    console.error("export failed", cause);
    return error(500, "export_failed", "The export could not be created.");
  }
}
