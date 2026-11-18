"use server";

import { and, desc, eq, gt, isNull, lt, ne, notInArray } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import { refresh, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminDb } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { finalizeRoundAttempts } from "@/lib/db/queries/attempts";
import { tags } from "@/lib/db/queries/content";
import { getResultsData } from "@/lib/db/queries/results";
import {
  accessKeys,
  attemptAnswers,
  questionOptions,
  questions,
  roundQualifiers,
  rounds,
} from "@/lib/db/schema";
import { rankRound, selectQualifiers } from "@/lib/results/ranking";
import { accessKeyHint, generateAccessKey } from "@/lib/rounds/access-key";
import { evaluateAnswer } from "@/lib/rounds/evaluate";
import { hashAccessKey } from "@/lib/security/access-key-hash";
import { type ActionState, checkbox, invalid } from "@/lib/validations/form";
import {
  MAX_OPTIONS,
  accessKeySchema,
  qualifierCountSchema,
  questionSchema,
  roundNumberSchema,
  roundSettingsSchema,
} from "@/lib/validations/rounds";

const FAILED: ActionState = {
  status: "error",
  message: "The change could not be saved. Try again.",
};

type Batch = [BatchItem<"pg">, ...BatchItem<"pg">[]];

async function findRound(db: Db, value: FormDataEntryValue | null) {
  const number = roundNumberSchema.safeParse(value);
  if (!number.success) return null;
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.number, number.data))
    .limit(1);
  return round ?? null;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/* ------------------------------------------------------------------ rounds */

export async function updateRound(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = roundSettingsSchema.safeParse({
    title: text(formData, "title"),
    description: text(formData, "description"),
    instructions: text(formData, "instructions"),
    status: text(formData, "status"),
    durationMinutes: text(formData, "durationMinutes"),
    sequential: checkbox(formData, "sequential"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    const round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };
    await db.update(rounds).set(parsed.data).where(eq(rounds.id, round.id));
    // Closing a round submits every attempt still in progress.
    if (parsed.data.status === "closed" && round.status !== "closed") {
      await finalizeRoundAttempts(db, round.id);
    }
    updateTag(tags.rounds);
    return { status: "success", message: "Round settings saved." };
  } catch (error) {
    console.error("updateRound failed", error);
    return FAILED;
  }
}

/* ----------------------------------------------------------- qualification */

/**
 * Lets only the previous round's top N into this round. Replaces any
 * earlier selection. The previous round must be closed, so its ranking is
 * final; a tie on the last place advances everyone sharing it.
 */
export async function setQualifiers(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const count = qualifierCountSchema.safeParse(text(formData, "count"));
  if (!count.success) return invalid(count.error);

  try {
    const round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };
    const from = round.number - 1;
    if (from < 1) {
      return {
        status: "error",
        message: "Round 1 is always open to every participant.",
      };
    }
    const [previous] = await db
      .select({ status: rounds.status })
      .from(rounds)
      .where(eq(rounds.number, from));
    if (previous?.status !== "closed") {
      return {
        status: "error",
        message: `Close round ${from} first, so its ranking is final.`,
      };
    }

    const data = await getResultsData(db);
    const chosen = selectQualifiers(rankRound(data.outcomes, from), count.data);
    if (chosen.length === 0) {
      return {
        status: "error",
        message: `Nobody submitted round ${from}, so nobody can advance.`,
      };
    }
    await db.batch([
      db.delete(roundQualifiers).where(eq(roundQualifiers.roundId, round.id)),
      db.insert(roundQualifiers).values(
        chosen.map((entry) => ({
          roundId: round.id,
          participantId: entry.participantId,
          rank: entry.rank,
        })),
      ),
      db
        .update(rounds)
        .set({ qualifierLimit: count.data })
        .where(eq(rounds.id, round.id)),
    ]);
    refresh();

    const n = chosen.length;
    const note =
      n > count.data
        ? ` (${count.data} requested; everyone tied on the last place advances)`
        : n < count.data
          ? ` (only ${n} submitted round ${from})`
          : "";
    return {
      status: "success",
      message: `${n} participant${n === 1 ? "" : "s"} advance to round ${round.number}${note}.`,
    };
  } catch (error) {
    console.error("setQualifiers failed", error);
    return FAILED;
  }
}

/** Removes the selection: every participant may unlock the round again. */
export async function clearQualifiers(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  try {
    const round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };
    await db.batch([
      db.delete(roundQualifiers).where(eq(roundQualifiers.roundId, round.id)),
      db
        .update(rounds)
        .set({ qualifierLimit: null })
        .where(eq(rounds.id, round.id)),
    ]);
    refresh();
    return {
      status: "success",
      message: `Round ${round.number} is open to every participant again.`,
    };
  } catch (error) {
    console.error("clearQualifiers failed", error);
    return FAILED;
  }
}

/* --------------------------------------------------------------- questions */

type OptionInput = { id: string | null; text: string; isCorrect: boolean };

function readQuestionForm(formData: FormData) {
  const correct = text(formData, "correct");
  const options: OptionInput[] = Array.from(
    { length: MAX_OPTIONS },
    (_, i) => ({
      id: text(formData, `optionId${i}`) || null,
      text: text(formData, `option${i}`),
      isCorrect: correct === String(i),
    }),
  );
  const parsed = questionSchema.safeParse({
    type: text(formData, "type"),
    prompt: text(formData, "prompt"),
    code: text(formData, "code"),
    codeLanguage: text(formData, "codeLanguage"),
    points: text(formData, "points"),
    acceptedAnswers: text(formData, "acceptedAnswers")
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean),
    options: options.map(({ text, isCorrect }) => ({ text, isCorrect })),
  });
  // Options that survive validation keep their row ids, in form order.
  const filledIds = options
    .filter((o) => o.text.trim() !== "")
    .map((o) => o.id);
  return { parsed, filledIds };
}

/** Recomputes stored correctness after an answer key changed. */
async function rescoreQuestion(db: Db, questionId: string) {
  const [question] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId));
  if (!question) return;
  const [options, answers] = await Promise.all([
    db
      .select()
      .from(questionOptions)
      .where(eq(questionOptions.questionId, questionId)),
    db
      .select()
      .from(attemptAnswers)
      .where(eq(attemptAnswers.questionId, questionId)),
  ]);
  const updates = answers.flatMap((answer) => {
    const result = evaluateAnswer(
      {
        type: question.type,
        points: question.points,
        acceptedAnswers: question.acceptedAnswers,
        options,
      },
      answer.answer,
    );
    if (
      result.isCorrect === answer.isCorrect &&
      result.pointsAwarded === answer.pointsAwarded
    ) {
      return [];
    }
    return [
      db
        .update(attemptAnswers)
        .set(result)
        .where(eq(attemptAnswers.id, answer.id)),
    ];
  });
  for (let i = 0; i < updates.length; i += 100) {
    const [first, ...rest] = updates.slice(i, i + 100);
    await db.batch([first, ...rest]);
  }
}

export async function saveQuestion(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const { parsed, filledIds } = readQuestionForm(formData);
  if (!parsed.success) return invalid(parsed.error);
  const { options, code, codeLanguage, ...fields } = parsed.data;
  const values = {
    ...fields,
    code: code || null,
    codeLanguage: codeLanguage || null,
    // Only the field that matters for the type is kept.
    acceptedAnswers: fields.type === "short_text" ? fields.acceptedAnswers : [],
  };
  const optionRows = fields.type === "single_choice" ? options : [];
  const questionId = text(formData, "questionId");

  let round;
  try {
    round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };

    if (!questionId) {
      const [last] = await db
        .select({ position: questions.position })
        .from(questions)
        .where(eq(questions.roundId, round.id))
        .orderBy(desc(questions.position))
        .limit(1);
      const id = crypto.randomUUID();
      const statements: BatchItem<"pg">[] = [
        db.insert(questions).values({
          id,
          roundId: round.id,
          position: (last?.position ?? 0) + 1,
          ...values,
        }),
      ];
      if (optionRows.length) {
        statements.push(
          db.insert(questionOptions).values(
            optionRows.map((option, position) => ({
              questionId: id,
              position,
              ...option,
            })),
          ),
        );
      }
      await db.batch(statements as Batch);
    } else {
      const [existing] = await db
        .select({ id: questions.id })
        .from(questions)
        .where(
          and(eq(questions.id, questionId), eq(questions.roundId, round.id)),
        );
      if (!existing)
        return { status: "error", message: "That question no longer exists." };

      const current = await db
        .select({ id: questionOptions.id })
        .from(questionOptions)
        .where(eq(questionOptions.questionId, questionId));
      const currentIds = new Set(current.map((o) => o.id));
      // Existing options are updated in place, so saved answers (option ids)
      // stay valid when only the wording changes.
      const keptIds = filledIds
        .slice(0, optionRows.length)
        .filter((id): id is string => id !== null && currentIds.has(id));
      const optionWrites = optionRows.map((option, position) => {
        const id = filledIds[position];
        return id && currentIds.has(id)
          ? db
              .update(questionOptions)
              .set({ ...option, position })
              .where(eq(questionOptions.id, id))
          : db
              .insert(questionOptions)
              .values({ questionId, position, ...option });
      });
      await db.batch([
        db.update(questions).set(values).where(eq(questions.id, questionId)),
        // Remove options that were cleared, before new ones are inserted.
        db
          .delete(questionOptions)
          .where(
            keptIds.length
              ? and(
                  eq(questionOptions.questionId, questionId),
                  notInArray(questionOptions.id, keptIds),
                )
              : eq(questionOptions.questionId, questionId),
          ),
        ...optionWrites,
      ]);
      await rescoreQuestion(db, questionId);
    }
  } catch (error) {
    console.error("saveQuestion failed", error);
    return FAILED;
  }
  if (!questionId) redirect(`/admin/rounds/${round.number}#questions`);
  return {
    status: "success",
    message: "Question saved. Existing answers were re-scored.",
  };
}

export async function deleteQuestion(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = text(formData, "questionId");
  let round;
  try {
    round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };
    await db
      .delete(questions)
      .where(and(eq(questions.id, id), eq(questions.roundId, round.id)));
  } catch (error) {
    console.error("deleteQuestion failed", error);
    return FAILED;
  }
  redirect(`/admin/rounds/${round.number}#questions`);
}

/** Swaps a question with its neighbour. */
export async function moveQuestion(formData: FormData): Promise<void> {
  const { db } = await requireAdminDb();
  const id = text(formData, "questionId");
  const up = text(formData, "direction") === "up";
  const [question] = await db
    .select({
      id: questions.id,
      roundId: questions.roundId,
      position: questions.position,
      roundNumber: rounds.number,
    })
    .from(questions)
    .innerJoin(rounds, eq(rounds.id, questions.roundId))
    .where(eq(questions.id, id));
  if (!question) redirect("/admin/rounds");
  try {
    const [neighbour] = await db
      .select({ id: questions.id, position: questions.position })
      .from(questions)
      .where(
        and(
          eq(questions.roundId, question.roundId),
          up
            ? lt(questions.position, question.position)
            : gt(questions.position, question.position),
        ),
      )
      .orderBy(up ? desc(questions.position) : questions.position)
      .limit(1);
    if (neighbour) {
      await db.batch([
        db
          .update(questions)
          .set({ position: neighbour.position })
          .where(eq(questions.id, question.id)),
        db
          .update(questions)
          .set({ position: question.position })
          .where(eq(questions.id, neighbour.id)),
      ]);
    }
  } catch (error) {
    console.error("moveQuestion failed", error);
  }
  redirect(`/admin/rounds/${question.roundNumber}#questions`);
}

/* ------------------------------------------------------------- access keys */

/** Refuses a key already active on another round (it would unlock both). */
async function keyInUseElsewhere(db: Db, roundId: string, keyHash: string) {
  const [other] = await db
    .select({ number: rounds.number })
    .from(accessKeys)
    .innerJoin(rounds, eq(rounds.id, accessKeys.roundId))
    .where(
      and(
        eq(accessKeys.keyHash, keyHash),
        ne(accessKeys.roundId, roundId),
        isNull(accessKeys.revokedAt),
      ),
    )
    .limit(1);
  return other?.number ?? null;
}

export async function createAccessKey(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = accessKeySchema.safeParse({
    label: text(formData, "label"),
    customKey: text(formData, "customKey"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const key = parsed.data.customKey || generateAccessKey();
  const keyHash = hashAccessKey(key);

  try {
    const round = await findRound(db, formData.get("round"));
    if (!round) return { status: "error", message: "Unknown round." };
    const other = await keyInUseElsewhere(db, round.id, keyHash);
    if (other)
      return {
        status: "error",
        message: `That key is already active for round ${other}.`,
      };
    const [created] = await db
      .insert(accessKeys)
      .values({
        roundId: round.id,
        label: parsed.data.label,
        keyHash,
        keyHint: accessKeyHint(key),
      })
      .onConflictDoNothing()
      .returning({ id: accessKeys.id });
    if (!created)
      return {
        status: "error",
        message: "That key already exists for this round.",
      };
  } catch (error) {
    console.error("createAccessKey failed", error);
    return FAILED;
  }
  return {
    status: "success",
    message: `Key "${parsed.data.label}" created.`,
    secret: key,
  };
}

/** Replaces a key's value (and re-activates it). The old value stops working. */
export async function rotateAccessKey(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const id = text(formData, "keyId");
  const key = generateAccessKey();
  try {
    const [updated] = await db
      .update(accessKeys)
      .set({
        keyHash: hashAccessKey(key),
        keyHint: accessKeyHint(key),
        revokedAt: null,
      })
      .where(eq(accessKeys.id, id))
      .returning({ label: accessKeys.label });
    if (!updated)
      return { status: "error", message: "That key no longer exists." };
    return {
      status: "success",
      message: `New value for "${updated.label}".`,
      secret: key,
    };
  } catch (error) {
    console.error("rotateAccessKey failed", error);
    return FAILED;
  }
}

export async function renameAccessKey(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const parsed = accessKeySchema
    .pick({ label: true })
    .safeParse({ label: text(formData, "label") });
  if (!parsed.success) return invalid(parsed.error);
  try {
    await db
      .update(accessKeys)
      .set(parsed.data)
      .where(eq(accessKeys.id, text(formData, "keyId")));
    return { status: "success", message: "Label saved." };
  } catch (error) {
    console.error("renameAccessKey failed", error);
    return FAILED;
  }
}

/** Revoked keys stop unlocking the round. Rounds already unlocked stay unlocked. */
export async function setAccessKeyRevoked(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  const revoke = text(formData, "revoke") === "true";
  const id = text(formData, "keyId");
  try {
    const [key] = await db
      .select()
      .from(accessKeys)
      .where(eq(accessKeys.id, id));
    if (!key) return { status: "error", message: "That key no longer exists." };
    if (!revoke) {
      const other = await keyInUseElsewhere(db, key.roundId, key.keyHash);
      if (other)
        return {
          status: "error",
          message: `That key is active for round ${other}.`,
        };
    }
    await db
      .update(accessKeys)
      .set({ revokedAt: revoke ? new Date() : null })
      .where(eq(accessKeys.id, id));
    return {
      status: "success",
      message: revoke ? "Key revoked." : "Key restored.",
    };
  } catch (error) {
    console.error("setAccessKeyRevoked failed", error);
    return FAILED;
  }
}

export async function deleteAccessKey(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { db } = await requireAdminDb();
  try {
    await db
      .delete(accessKeys)
      .where(eq(accessKeys.id, text(formData, "keyId")));
    return { status: "success", message: "Key deleted." };
  } catch (error) {
    console.error("deleteAccessKey failed", error);
    return FAILED;
  }
}
