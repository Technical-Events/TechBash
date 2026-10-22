import type { Metadata } from "next";
import { connection } from "next/server";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { RoundRunner } from "@/components/rounds/round-runner";
import { RoundStatusBadge } from "@/components/rounds/round-badges";
import { ButtonLink } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { requireParticipant } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getParticipantRound } from "@/lib/db/queries/attempts";
import { formatDateTime } from "@/lib/format";
import { roundNumberSchema } from "@/lib/validations/rounds";

export const metadata: Metadata = {
  title: "Round",
  robots: { index: false },
};

async function RoundView({
  params,
}: {
  params: PageProps<"/test/round/[number]">["params"];
}) {
  const parsed = roundNumberSchema.safeParse((await params).number);
  if (!parsed.success) notFound();
  const viewer = await requireParticipant();
  const db = getDb();
  if (!db) redirect("/test");

  await connection();
  const view = await getParticipantRound(db, viewer.participantId, parsed.data);
  if (!view) redirect("/test");
  const { round, attempt } = view;

  const heading = (
    <PageHeading
      command={`./techbash --round ${round.number}`}
      title={round.title}
    >
      {round.description}
    </PageHeading>
  );

  if (attempt.submittedAt || round.status !== "open") {
    return (
      <>
        {heading}
        <Panel title="status">
          {attempt.submittedAt ? (
            <>
              <p className="text-lg font-bold text-accent">
                OK Round submitted
              </p>
              <p className="mt-2 text-muted">
                At {formatDateTime(attempt.submittedAt)}
                {attempt.autoSubmitted ? " (submitted automatically)" : ""}.
                Your answers are recorded.
              </p>
            </>
          ) : (
            <p className="flex items-center gap-3">
              <RoundStatusBadge status={round.status} /> This round is not open
              right now.
            </p>
          )}
          <ButtonLink href="/test" className="mt-6">
            Back to rounds
          </ButtonLink>
        </Panel>
      </>
    );
  }

  return (
    <>
      {heading}
      {round.instructions && (
        <p className="-mt-4 mb-10 max-w-[70ch] text-sm whitespace-pre-line text-muted">
          # {round.instructions}
        </p>
      )}
      <RoundRunner
        roundNumber={round.number}
        sequential={round.sequential}
        questions={view.questions}
        initialAnswers={view.answers}
        totalQuestions={view.totalQuestions}
        solvedCount={view.solvedCount}
        deadlineAt={attempt.deadlineAt?.toISOString() ?? null}
        serverNow={new Date().toISOString()}
      />
      <p className="mt-10 text-sm">
        <ButtonLink href="/test" variant="secondary">
          All rounds
        </ButtonLink>
      </p>
    </>
  );
}

export default function RoundPage(props: PageProps<"/test/round/[number]">) {
  return (
    <Suspense fallback={<Loading label="Loading round" />}>
      <RoundView params={props.params} />
    </Suspense>
  );
}
