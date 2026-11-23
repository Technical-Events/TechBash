"use server";

import { isAPIError } from "better-auth/api";
import { and, eq, isNull, sql } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { PARTICIPANT_MISMATCH } from "@/lib/auth/participant-plugin";
import { getAuth } from "@/lib/auth/server";
import { requireParticipant } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import {
  DEADLINE_GRACE_MS,
  currentClueIndex,
  finalizeExpiredAttempts,
  getQuestion,
  getAttemptAnswers,
  getRoundQuestions,
  getRoundWithAttempt,
  isQualified,
} from "@/lib/db/queries/attempts";
import {
  accessKeys,
  attemptAnswers,
  roundAttempts,
} from "@/lib/db/schema";
import { evaluateAnswer } from "@/lib/rounds/evaluate";
import type { SaveAnswerResult, SubmitRoundResult } from "@/lib/rounds/types";
import { hashAccessKey } from "@/lib/security/access-key-hash";
import {
  type Attempt,
  beginAttempt,
  clearFailures,
  clientIp,
  releaseAttempt,
  rules,
} from "@/lib/security/throttle";
import { participantLoginSchema } from "@/lib/validations/auth";
import { type ActionState, invalid } from "@/lib/validations/form";
import {
  roundNumberSchema,
  saveAnswerSchema,
  unlockSchema,
} from "@/lib/validations/rounds";

const GENERIC_ERROR =
  "Something went wrong on our side. Try again in a moment.";

function notQualified(round: {
  number: number;
  qualifierLimit: number | null;
}) {
  return `This round is open only to the top ${round.qualifierLimit} of round ${round.number - 1}.`;
}

/** Full name + USN sign-in against the roster. Redirects to /test on success. */
export async function loginParticipant(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = participantLoginSchema.safeParse({
    fullName: formData.get("fullName"),
    usn: formData.get("usn"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const auth = getAuth();
  const db = getDb();
  if (!auth || !db) {
    return {
      status: "error",
      message: "Sign-in is not available on this deployment.",
    };
  }

  const { usn, fullName } = parsed.data;
  const usnBucket = `participant-login:usn:${usn}`;
  const ipBucket = `participant-login:ip:${await clientIp()}`;
  let attempt: Attempt | null = null;
  try {
    attempt = await beginAttempt(db, [
      [usnBucket, rules.participantLoginAccount],
      [ipBucket, rules.participantLoginIp],
    ]);
    if (!attempt) {
      return {
        status: "error",
        message:
          "Too many failed attempts. Wait 15 minutes or ask an organizer.",
      };
    }
    await auth.api.signInParticipant({
      body: { usn, fullName },
      headers: await headers(),
    });
    await clearFailures(db, usnBucket);
    await releaseAttempt(db, attempt);
  } catch (error) {
    // A wrong name or USN stays recorded as a failure.
    if (isAPIError(error) && error.status === "UNAUTHORIZED") {
      return { status: "error", message: PARTICIPANT_MISMATCH };
    }
    // Anything else is not the visitor's mistake: do not count it.
    if (attempt) await releaseAttempt(db, attempt).catch(() => undefined);
    if (isAPIError(error) && error.status === "CONFLICT") {
      return { status: "error", message: error.message };
    }
    console.error("loginParticipant failed", error);
    return { status: "error", message: GENERIC_ERROR };
  }
  redirect("/test");
}

export async function logout(): Promise<void> {
  const auth = getAuth();
  if (auth) {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch (error) {
      console.error("logout failed", error);
    }
  }
  redirect("/test");
}

/** Checks a round's access key and starts the attempt. */
export async function unlockRound(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = unlockSchema.safeParse({
    round: formData.get("round"),
    key: formData.get("key"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const viewer = await requireParticipant();
  const db = getDb();
  if (!db) return { status: "error", message: GENERIC_ERROR };

  const bucket = `access-key:${viewer.participantId}:${parsed.data.round}`;
  let attempt: Attempt | null = null;
  try {
    const row = await getRoundWithAttempt(
      db,
      viewer.participantId,
      parsed.data.round,
    );
    const round = row?.round;
    if (!round || round.status === "draft") {
      return { status: "error", message: "This round is not open yet." };
    }
    if (round.status === "closed") {
      return { status: "error", message: "This round is closed." };
    }
    if (!(await isQualified(db, round, viewer.participantId))) {
      return { status: "error", message: notQualified(round) };
    }

    if (!row.attempt) {
      attempt = await beginAttempt(db, [[bucket, rules.accessKey]]);
      if (!attempt) {
        return {
          status: "error",
          message: "Too many wrong keys. Wait 10 minutes before trying again.",
        };
      }
      const [key] = await db
        .select({ id: accessKeys.id })
        .from(accessKeys)
        .where(
          and(
            eq(accessKeys.roundId, round.id),
            eq(accessKeys.keyHash, hashAccessKey(parsed.data.key)),
            isNull(accessKeys.revokedAt),
          ),
        )
        .limit(1);
      if (!key) {
        // The attempt stays recorded as a failure.
        return {
          status: "error",
          message: "That key is not valid for this round.",
        };
      }

      const startedAt = new Date();
      await db
        .insert(roundAttempts)
        .values({
          participantId: viewer.participantId,
          roundId: round.id,
          accessKeyId: key.id,
          startedAt,
          deadlineAt: round.durationMinutes
            ? new Date(startedAt.getTime() + round.durationMinutes * 60_000)
            : null,
        })
        .onConflictDoNothing();
      await clearFailures(db, bucket);
    }
  } catch (error) {
    console.error("unlockRound failed", error);
    if (attempt) await releaseAttempt(db, attempt).catch(() => undefined);
    return { status: "error", message: GENERIC_ERROR };
  }
  redirect(`/test/round/${parsed.data.round}`);
}

/**
 * Saves one answer. Correctness is computed here and stored; it is
 * returned to the browser only in sequential rounds (treasure hunt).
 */
export async function saveAnswer(input: unknown): Promise<SaveAnswerResult> {
  const parsed = saveAnswerSchema.safeParse(input);
  if (!parsed.success)
    return { ok: false, error: "That answer could not be read." };
  const viewer = await requireParticipant();
  const db = getDb();
  if (!db) return { ok: false, error: GENERIC_ERROR };

  const { round: roundNumber, questionId, answer } = parsed.data;
  try {
    // Independent reads run together: each one is a network round trip.
    const [row, question] = await Promise.all([
      getRoundWithAttempt(db, viewer.participantId, roundNumber),
      getQuestion(db, questionId),
    ]);
    const round = row?.round;
    if (!round || round.status !== "open") {
      return { ok: false, error: "This round is not open.", expired: true };
    }
    const attempt = row.attempt;
    if (!attempt) return { ok: false, error: "Unlock this round first." };
    if (attempt.submittedAt) {
      return {
        ok: false,
        error: "This round is already submitted.",
        expired: true,
      };
    }
    // The admin can change who advances after an attempt has started.
    if (!(await isQualified(db, round, viewer.participantId))) {
      return { ok: false, error: notQualified(round), expired: true };
    }
    if (
      attempt.deadlineAt &&
      Date.now() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS
    ) {
      await finalizeExpiredAttempts(db);
      return {
        ok: false,
        error: "Time is up. Your round was submitted.",
        expired: true,
      };
    }

    if (!question || question.roundId !== round.id)
      return { ok: false, error: "That question is not part of this round." };

    const value = answer.trim();
    if (question.type === "single_choice") {
      if (!question.options.some((option) => option.id === value)) {
        return { ok: false, error: "Pick one of the options." };
      }
    } else if (value.length === 0 || value.length > 300) {
      return { ok: false, error: "Type an answer of up to 300 characters." };
    }

    // Only the treasure hunt needs the whole list, for clue order.
    let list: { id: string }[] = [];
    if (round.sequential) {
      let saved;
      [list, saved] = await Promise.all([
        getRoundQuestions(db, round.id),
        getAttemptAnswers(db, attempt.id),
      ]);
      const byQuestion = new Map(saved.map((a) => [a.questionId, a]));
      if (list[currentClueIndex(list, byQuestion)]?.id !== question.id) {
        return {
          ok: false,
          error: "Solve the current clue first.",
          expired: true,
        };
      }
    }

    const { isCorrect, pointsAwarded } = evaluateAnswer(
      {
        type: question.type,
        points: question.points,
        acceptedAnswers: question.acceptedAnswers,
        options: question.options,
      },
      value,
    );
    const answeredAt = new Date();
    await db
      .insert(attemptAnswers)
      .values({
        attemptId: attempt.id,
        questionId,
        answer: value,
        isCorrect,
        pointsAwarded,
        answeredAt,
      })
      .onConflictDoUpdate({
        target: [attemptAnswers.attemptId, attemptAnswers.questionId],
        set: {
          answer: value,
          isCorrect,
          pointsAwarded,
          answeredAt,
          tries: sql`${attemptAnswers.tries} + 1`,
        },
        // A solved clue stays solved, even if a retry races in.
        setWhere: round.sequential
          ? eq(attemptAnswers.isCorrect, false)
          : undefined,
      });

    if (!round.sequential)
      return { ok: true, savedAt: answeredAt.toISOString() };

    const roundComplete = isCorrect && list.at(-1)?.id === question.id;
    if (roundComplete) {
      await db
        .update(roundAttempts)
        .set({ submittedAt: answeredAt })
        .where(
          and(
            eq(roundAttempts.id, attempt.id),
            isNull(roundAttempts.submittedAt),
          ),
        );
    }
    return {
      ok: true,
      savedAt: answeredAt.toISOString(),
      correct: isCorrect,
      roundComplete,
    };
  } catch (error) {
    console.error("saveAnswer failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}

/** Ends the participant's attempt at a round. Idempotent. */
export async function submitRound(input: unknown): Promise<SubmitRoundResult> {
  const parsed = roundNumberSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Unknown round." };
  const viewer = await requireParticipant();
  const db = getDb();
  if (!db) return { ok: false, error: GENERIC_ERROR };

  try {
    const row = await getRoundWithAttempt(
      db,
      viewer.participantId,
      parsed.data,
    );
    if (!row) return { ok: false, error: "Unknown round." };
    const { attempt } = row;
    if (!attempt) return { ok: false, error: "Unlock this round first." };
    if (attempt.submittedAt) return { ok: true };

    if (
      attempt.deadlineAt &&
      Date.now() > attempt.deadlineAt.getTime() + DEADLINE_GRACE_MS
    ) {
      await finalizeExpiredAttempts(db);
    } else {
      const now = new Date();
      // Past the deadline (inside the grace period) counts as a time-out.
      const late = attempt.deadlineAt !== null && now > attempt.deadlineAt;
      await db
        .update(roundAttempts)
        .set({
          submittedAt: late && attempt.deadlineAt ? attempt.deadlineAt : now,
          autoSubmitted: late,
        })
        .where(
          and(
            eq(roundAttempts.id, attempt.id),
            isNull(roundAttempts.submittedAt),
          ),
        );
    }
    return { ok: true };
  } catch (error) {
    console.error("submitRound failed", error);
    return { ok: false, error: GENERIC_ERROR };
  }
}
