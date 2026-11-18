import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import {
  createAccessKey,
  deleteAccessKey,
  moveQuestion,
  renameAccessKey,
  rotateAccessKey,
  setAccessKeyRevoked,
  updateRound,
} from "@/app/admin/(panel)/rounds/actions";
import { QualificationSection } from "@/components/admin/qualification-section";
import { RoundStatusBadge } from "@/components/rounds/round-badges";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Checkbox, Field } from "@/components/ui/field";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import { requireAdminDb } from "@/lib/auth/session";
import { getRoundQuestions } from "@/lib/db/queries/attempts";
import { getResultsData } from "@/lib/db/queries/results";
import { accessKeys, roundQualifiers, rounds } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { rankRound } from "@/lib/results/ranking";
import { roundStatuses } from "@/lib/rounds/constants";
import { roundNumberSchema } from "@/lib/validations/rounds";

export const metadata: Metadata = { title: "Round" };

const statusOptions = roundStatuses.map((status) => ({
  value: status,
  label: {
    draft: "Draft (hidden, cannot unlock)",
    open: "Open (keys work)",
    closed: "Closed (submits all attempts)",
  }[status],
}));

function answerKey(
  question: Awaited<ReturnType<typeof getRoundQuestions>>[number],
) {
  if (question.type === "single_choice") {
    return (
      question.options.find((o) => o.isCorrect)?.text ?? "! no correct option"
    );
  }
  return question.acceptedAnswers.join(" | ");
}

export default async function AdminRoundPage(
  props: PageProps<"/admin/rounds/[number]">,
) {
  const { db } = await requireAdminDb();
  const number = roundNumberSchema.safeParse((await props.params).number);
  if (!number.success) notFound();
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.number, number.data));
  if (!round) notFound();
  const [list, keys, results, qualifierRows] = await Promise.all([
    getRoundQuestions(db, round.id),
    db
      .select()
      .from(accessKeys)
      .where(eq(accessKeys.roundId, round.id))
      .orderBy(asc(accessKeys.createdAt)),
    // Round 1 has no previous round to qualify from.
    round.number > 1 ? getResultsData(db) : null,
    db
      .select({ participantId: roundQualifiers.participantId })
      .from(roundQualifiers)
      .where(eq(roundQualifiers.roundId, round.id)),
  ]);
  const qualifiedIds = new Set(qualifierRows.map((row) => row.participantId));

  return (
    <>
      <PageHeading
        command={`./admin --round ${round.number}`}
        title={round.title}
      >
        Round {round.number}. Changes apply immediately for participants.
      </PageHeading>

      <div className="space-y-16">
        <section aria-labelledby="settings-heading">
          <SectionHeading id="settings-heading">Settings</SectionHeading>
          <Panel title="round.conf">
            <ActionForm
              action={updateRound}
              submitLabel="Save settings"
              pendingLabel="... Saving"
            >
              <input type="hidden" name="round" value={round.number} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Title"
                  name="title"
                  required
                  maxLength={80}
                  defaultValue={round.title}
                />
                <Field
                  label="Status"
                  name="status"
                  options={statusOptions}
                  defaultValue={round.status}
                />
              </div>
              <Field
                label="Description"
                name="description"
                multiline
                rows={3}
                maxLength={600}
                defaultValue={round.description}
              />
              <Field
                label="Instructions"
                name="instructions"
                multiline
                rows={4}
                maxLength={2000}
                defaultValue={round.instructions}
              />
              <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
                <Field
                  label="Time limit (minutes)"
                  name="durationMinutes"
                  type="number"
                  min={1}
                  max={600}
                  defaultValue={round.durationMinutes ?? ""}
                  hint="Empty means no limit. Applies to attempts unlocked after saving."
                />
                <Checkbox
                  label="Sequential (clue by clue)"
                  name="sequential"
                  defaultChecked={round.sequential}
                  hint="Next question unlocks on a correct answer."
                />
              </div>
            </ActionForm>
          </Panel>
        </section>

        {results && (
          <QualificationSection
            round={round}
            previousStatus={
              results.rounds.find((r) => r.number === round.number - 1)?.status
            }
            ranking={rankRound(results.outcomes, round.number - 1)}
            qualifiedIds={qualifiedIds}
            outsiders={
              round.qualifierLimit === null
                ? 0
                : results.attempts.filter(
                    (a) =>
                      a.roundId === round.id &&
                      !qualifiedIds.has(a.participantId),
                  ).length
            }
          />
        )}

        <section aria-labelledby="keys-heading">
          <SectionHeading
            id="keys-heading"
            intro="Keys are stored hashed and shown once, when created or rotated. Revoking a key stops new unlocks; rounds already unlocked stay unlocked."
          >
            Access keys
          </SectionHeading>
          {keys.length === 0 && (
            <p className="mb-6 text-sm text-amber">
              ! No keys yet. Participants cannot unlock this round.
            </p>
          )}
          <ul className="space-y-6">
            {keys.map((key) => (
              <li key={key.id}>
                <Panel
                  title={key.revokedAt ? "revoked" : "active"}
                  dashed={Boolean(key.revokedAt)}
                >
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                    <p className="font-bold">{key.label}</p>
                    <Badge tone={key.revokedAt ? "muted" : "accent"}>
                      {key.revokedAt ? "revoked" : "active"}
                    </Badge>
                    <p className="text-sm text-muted">
                      ends in{" "}
                      <span className="text-fg tracking-[0.12em]">
                        ...{key.keyHint}
                      </span>
                    </p>
                    <p className="text-sm text-muted">
                      {key.revokedAt
                        ? `revoked ${formatDateTime(key.revokedAt)}`
                        : `updated ${formatDateTime(key.updatedAt)}`}
                    </p>
                  </div>
                  <div className="mt-4 grid gap-4 md:grid-cols-2">
                    <ActionForm
                      action={renameAccessKey}
                      submitLabel="Rename"
                      variant="secondary"
                      inline
                    >
                      <input type="hidden" name="keyId" value={key.id} />
                      <Field
                        id={`label-${key.id}`}
                        label="Label"
                        name="label"
                        required
                        maxLength={60}
                        defaultValue={key.label}
                        className="min-w-0 flex-1"
                      />
                    </ActionForm>
                    <div className="flex flex-wrap items-start gap-3">
                      <ActionForm
                        action={rotateAccessKey}
                        submitLabel="New value"
                        variant="secondary"
                        confirmLabel="Confirm new value"
                      >
                        <input type="hidden" name="keyId" value={key.id} />
                      </ActionForm>
                      <ActionForm
                        action={setAccessKeyRevoked}
                        submitLabel={key.revokedAt ? "Restore" : "Revoke"}
                        variant="secondary"
                        confirmLabel={
                          key.revokedAt ? undefined : "Confirm revoke"
                        }
                      >
                        <input type="hidden" name="keyId" value={key.id} />
                        <input
                          type="hidden"
                          name="revoke"
                          value={key.revokedAt ? "false" : "true"}
                        />
                      </ActionForm>
                      <ActionForm
                        action={deleteAccessKey}
                        submitLabel="Delete"
                        variant="danger"
                        confirmLabel="Confirm delete"
                      >
                        <input type="hidden" name="keyId" value={key.id} />
                      </ActionForm>
                    </div>
                  </div>
                </Panel>
              </li>
            ))}
          </ul>
          <Panel title="new key" className="mt-8">
            <ActionForm
              action={createAccessKey}
              submitLabel="Create key"
              resetOnSuccess
            >
              <input type="hidden" name="round" value={round.number} />
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Label"
                  name="label"
                  required
                  maxLength={60}
                  placeholder="Main hall"
                />
                <Field
                  label="Custom key (optional)"
                  name="customKey"
                  maxLength={64}
                  autoComplete="off"
                  spellCheck={false}
                  hint="Leave empty for a random key. Case, spaces and dashes are ignored."
                />
              </div>
            </ActionForm>
          </Panel>
        </section>

        <section
          aria-labelledby="questions-heading"
          id="questions"
          className="scroll-mt-6"
        >
          <SectionHeading
            id="questions-heading"
            intro={`${list.length} ${round.sequential ? "clues, shown in this order" : "questions"}. Max score ${list.reduce((total, q) => total + q.points, 0)}.`}
          >
            Questions
          </SectionHeading>
          <Table
            caption={`Questions of round ${round.number}`}
            head={["#", "Question", "Type", "Pts", "Answer", "Order", ""]}
          >
            {list.length === 0 && (
              <EmptyRow colSpan={7}>No questions yet.</EmptyRow>
            )}
            {list.map((question, index) => (
              <tr key={question.id}>
                <td className="tabular-nums text-muted">{index + 1}</td>
                <td className="max-w-[40ch] min-w-[24ch]">
                  <span className="line-clamp-3 whitespace-pre-wrap">
                    {question.prompt}
                  </span>
                  {question.code && (
                    <span className="text-xs text-muted"># has code</span>
                  )}
                </td>
                <td className="whitespace-nowrap">
                  {question.type === "single_choice" ? "choice" : "text"}
                </td>
                <td className="tabular-nums">{question.points}</td>
                <td className="max-w-[24ch] text-accent">
                  {answerKey(question)}
                </td>
                <td>
                  <div className="flex gap-1">
                    {(["up", "down"] as const).map((direction) => (
                      <form key={direction} action={moveQuestion}>
                        <input
                          type="hidden"
                          name="questionId"
                          value={question.id}
                        />
                        <input
                          type="hidden"
                          name="direction"
                          value={direction}
                        />
                        <button
                          type="submit"
                          disabled={
                            direction === "up"
                              ? index === 0
                              : index === list.length - 1
                          }
                          aria-label={`Move question ${index + 1} ${direction}`}
                          className="min-h-11 min-w-11 border border-line hover:border-accent hover:text-accent disabled:opacity-30"
                        >
                          {direction === "up" ? "^" : "v"}
                        </button>
                      </form>
                    ))}
                  </div>
                </td>
                <td>
                  <ButtonLink
                    href={`/admin/rounds/${round.number}/questions/${question.id}`}
                    variant="secondary"
                  >
                    Edit
                  </ButtonLink>
                </td>
              </tr>
            ))}
          </Table>
          <div className="mt-6 flex flex-wrap items-center gap-4">
            <ButtonLink href={`/admin/rounds/${round.number}/questions/new`}>
              Add question
            </ButtonLink>
            <span className="flex items-center gap-2 text-sm text-muted">
              Status: <RoundStatusBadge status={round.status} />
            </span>
          </div>
        </section>
      </div>
    </>
  );
}
