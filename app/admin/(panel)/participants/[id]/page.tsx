import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import {
  deleteParticipant,
  endParticipantSessions,
  resetAttempt,
  updateParticipant,
} from "@/app/admin/(panel)/participants/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import { requireAdminDb } from "@/lib/auth/session";
import {
  getAttemptAnswers,
  getRoundQuestions,
} from "@/lib/db/queries/attempts";
import { getResultsData } from "@/lib/db/queries/results";
import { accessKeys, authSessions, rounds } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";
import { formatDuration } from "@/lib/results/csv";

export const metadata: Metadata = { title: "Participant" };

export default async function ParticipantPage(
  props: PageProps<"/admin/participants/[id]">,
) {
  const { db } = await requireAdminDb();
  const id = z.uuid().safeParse((await props.params).id);
  if (!id.success) notFound();

  const data = await getResultsData(db);
  const participant = data.participants.find((p) => p.id === id.data);
  if (!participant) notFound();
  const ranked = data.ranked.find((r) => r.participantId === participant.id);
  const attempts = data.attempts.filter(
    (a) => a.participantId === participant.id,
  );
  const [roundRows, keys, sessions] = await Promise.all([
    db.select().from(rounds).orderBy(asc(rounds.number)),
    db.select({ id: accessKeys.id, label: accessKeys.label }).from(accessKeys),
    participant.userId
      ? db
          .select({ expiresAt: authSessions.expiresAt })
          .from(authSessions)
          .where(eq(authSessions.userId, participant.userId))
      : Promise.resolve([]),
  ]);
  const activeSessions = sessions.filter(
    (s) => s.expiresAt > new Date(),
  ).length;

  const details = await Promise.all(
    roundRows.map(async (round) => {
      const attempt = attempts.find((a) => a.roundId === round.id);
      if (!attempt) return { round, attempt, rows: [] };
      const [list, answers] = await Promise.all([
        getRoundQuestions(db, round.id),
        getAttemptAnswers(db, attempt.attemptId),
      ]);
      const rows = list.map((question, index) => {
        const answer = answers.find((a) => a.questionId === question.id);
        const shown =
          answer && question.type === "single_choice"
            ? (question.options.find((o) => o.id === answer.answer)?.text ??
              "(removed option)")
            : answer?.answer;
        return { index, question, answer, shown };
      });
      return { round, attempt, rows };
    }),
  );

  return (
    <>
      <PageHeading
        command={`./admin --participant ${participant.usn}`}
        title={participant.fullName}
      >
        {participant.usn}
        {ranked ? ` | rank ${ranked.rank} | ${ranked.totalScore} points` : ""}
      </PageHeading>

      <div className="space-y-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          <Panel title="profile">
            <ActionForm action={updateParticipant} submitLabel="Save">
              <input
                type="hidden"
                name="participantId"
                value={participant.id}
              />
              <Field
                label="USN"
                name="usn"
                required
                maxLength={40}
                defaultValue={participant.usn}
              />
              <Field
                label="Full name"
                name="fullName"
                required
                maxLength={100}
                defaultValue={participant.fullName}
              />
            </ActionForm>
          </Panel>
          <Panel title="access">
            <dl className="space-y-1 text-sm">
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Registered</dt>
                <dd>{formatDateTime(participant.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Last login</dt>
                <dd>
                  {participant.lastLoginAt
                    ? formatDateTime(participant.lastLoginAt)
                    : "never"}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-muted">Active sessions</dt>
                <dd>{activeSessions}</dd>
              </div>
            </dl>
            <div className="mt-6 flex flex-wrap gap-3">
              <ActionForm
                action={endParticipantSessions}
                submitLabel="End sessions"
                variant="secondary"
              >
                <input
                  type="hidden"
                  name="participantId"
                  value={participant.id}
                />
              </ActionForm>
              <ActionForm
                action={deleteParticipant}
                submitLabel="Delete participant"
                variant="danger"
                confirmLabel="Confirm: delete all data"
              >
                <input
                  type="hidden"
                  name="participantId"
                  value={participant.id}
                />
              </ActionForm>
            </div>
          </Panel>
        </div>

        {details.map(({ round, attempt, rows }) => (
          <section
            key={round.id}
            aria-labelledby={`round-${round.number}-heading`}
          >
            <SectionHeading id={`round-${round.number}-heading`}>
              Round {round.number}: {round.title}
            </SectionHeading>
            {!attempt ? (
              <p className="text-sm text-muted"># Not unlocked.</p>
            ) : (
              <div className="space-y-6">
                <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
                  {[
                    ["Unlocked", formatDateTime(attempt.startedAt)],
                    [
                      "Key used",
                      keys.find((k) => k.id === attempt.accessKeyId)?.label ??
                        "(deleted)",
                    ],
                    [
                      "Deadline",
                      attempt.deadlineAt
                        ? formatDateTime(attempt.deadlineAt)
                        : "none",
                    ],
                    [
                      "Submitted",
                      attempt.submittedAt
                        ? `${formatDateTime(attempt.submittedAt)}${attempt.autoSubmitted ? " (auto)" : ""}`
                        : "in progress",
                    ],
                    [
                      "Time taken",
                      attempt.submittedAt
                        ? formatDuration(
                            attempt.submittedAt.getTime() -
                              attempt.startedAt.getTime(),
                          )
                        : "-",
                    ],
                    [
                      "Score",
                      `${attempt.score} / ${data.rounds.find((r) => r.id === round.id)?.maxScore ?? 0}`,
                    ],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-xs tracking-[0.08em] text-muted uppercase">
                        {label}
                      </dt>
                      <dd>{value}</dd>
                    </div>
                  ))}
                </dl>
                <Table
                  caption={`Answers in round ${round.number}`}
                  head={[
                    "#",
                    "Question",
                    "Answer",
                    "Result",
                    "Pts",
                    "Tries",
                    "Answered",
                  ]}
                >
                  {rows.length === 0 && (
                    <EmptyRow colSpan={7}>No questions.</EmptyRow>
                  )}
                  {rows.map(({ index, question, answer, shown }) => (
                    <tr key={question.id}>
                      <td className="tabular-nums text-muted">{index + 1}</td>
                      <td className="max-w-[36ch] min-w-[20ch]">
                        <span className="line-clamp-2 whitespace-pre-wrap">
                          {question.prompt}
                        </span>
                      </td>
                      <td className="max-w-[24ch] break-words">
                        {shown ?? <span className="text-muted">-</span>}
                      </td>
                      <td>
                        {answer ? (
                          <Badge tone={answer.isCorrect ? "accent" : "danger"}>
                            {answer.isCorrect ? "correct" : "wrong"}
                          </Badge>
                        ) : (
                          <Badge>skipped</Badge>
                        )}
                      </td>
                      <td className="tabular-nums">
                        {answer?.pointsAwarded ?? 0}
                      </td>
                      <td className="tabular-nums">{answer?.tries ?? 0}</td>
                      <td className="whitespace-nowrap text-muted">
                        {answer ? formatDateTime(answer.answeredAt) : "-"}
                      </td>
                    </tr>
                  ))}
                </Table>
                <ActionForm
                  action={resetAttempt}
                  submitLabel="Reset this round"
                  variant="danger"
                  confirmLabel="Confirm: erase answers"
                >
                  <input
                    type="hidden"
                    name="attemptId"
                    value={attempt.attemptId}
                  />
                  <input
                    type="hidden"
                    name="participantId"
                    value={participant.id}
                  />
                </ActionForm>
              </div>
            )}
          </section>
        ))}

        <ButtonLink href="/admin/participants" variant="secondary">
          All participants
        </ButtonLink>
      </div>
    </>
  );
}
