import { logout, unlockRound } from "@/app/test/actions";
import { ProgressBar } from "@/components/rounds/progress-bar";
import { RoundBadges } from "@/components/rounds/round-badges";
import { ActionForm } from "@/components/ui/action-form";
import { Button, ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import type { ParticipantViewer } from "@/lib/auth/session";
import type { ParticipantRoundCard } from "@/lib/db/queries/attempts";
import { formatDateTime } from "@/lib/format";

function RoundState({
  round,
  resultsPublished,
}: {
  round: ParticipantRoundCard;
  resultsPublished: boolean;
}) {
  const { attempt } = round;

  if (attempt?.submittedAt) {
    return (
      <div className="space-y-2 text-sm">
        <p className="font-bold text-accent">OK Submitted</p>
        <p className="text-muted">
          At {formatDateTime(attempt.submittedAt)}
          {attempt.autoSubmitted ? " (submitted automatically)" : ""}
        </p>
        {resultsPublished && (
          <>
            <p>
              Score: {round.score}/{round.maxScore}
            </p>
            <ProgressBar value={round.score} max={round.maxScore} />
          </>
        )}
      </div>
    );
  }

  if (!round.qualified) {
    return (
      <p className="text-sm text-muted">
        # Open only to the top {round.qualifierLimit} of round{" "}
        {round.number - 1}. You did not qualify for this round.
      </p>
    );
  }

  if (attempt && round.status === "open") {
    return (
      <div className="space-y-3 text-sm">
        <p className="font-bold text-amber">... In progress</p>
        {attempt.deadlineAt && (
          <p className="text-muted">
            Submit by {formatDateTime(attempt.deadlineAt)}
          </p>
        )}
        <ButtonLink href={`/test/round/${round.number}`}>
          Continue round
        </ButtonLink>
      </div>
    );
  }

  if (round.status === "draft") {
    return (
      <p className="text-sm text-muted">
        # Not open yet. Wait for the announcement.
      </p>
    );
  }
  if (round.status === "closed") {
    return <p className="text-sm text-muted"># This round is closed.</p>;
  }

  return (
    <ActionForm
      action={unlockRound}
      submitLabel="Unlock round"
      pendingLabel="... Checking"
    >
      <input type="hidden" name="round" value={round.number} />
      <Field
        id={`key-${round.number}`}
        label="Access key"
        name="key"
        autoComplete="off"
        autoCapitalize="characters"
        spellCheck={false}
        required
        maxLength={100}
        hint="Announced at the venue. The timer starts when you unlock."
      />
    </ActionForm>
  );
}

export function ParticipantDashboard({
  viewer,
  rounds,
  resultsPublished,
}: {
  viewer: ParticipantViewer;
  rounds: ParticipantRoundCard[];
  resultsPublished: boolean;
}) {
  const submitted = rounds.filter((round) => round.attempt?.submittedAt).length;
  return (
    <div className="space-y-12">
      <Panel title="session">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm text-muted">Logged in as</p>
            <p className="text-lg font-bold">{viewer.fullName}</p>
            <p className="text-sm tracking-[0.08em] text-accent">
              {viewer.usn}
            </p>
          </div>
          <form action={logout}>
            <Button type="submit" variant="secondary">
              Log out
            </Button>
          </form>
        </div>
        <p className="mt-4 border-t border-dashed border-line pt-3 text-sm text-muted">
          Rounds submitted: {submitted}/{rounds.length}
        </p>
      </Panel>

      <ol className="grid gap-x-6 gap-y-10 lg:grid-cols-3">
        {rounds.map((round) => (
          <li key={round.id}>
            <Panel
              title={`round ${round.number}`}
              dashed={round.status === "draft"}
              className="flex h-full flex-col"
            >
              <RoundBadges
                status={round.status}
                durationMinutes={round.durationMinutes}
                sequential={round.sequential}
              />
              <h2 className="mt-3 text-lg">{round.title}</h2>
              <p className="mt-2 text-sm text-muted">{round.description}</p>
              {round.instructions && (
                <p className="mt-3 text-sm whitespace-pre-line">
                  # {round.instructions}
                </p>
              )}
              <p className="mt-3 text-sm text-muted">
                &gt; {round.questionCount}{" "}
                {round.sequential ? "clues" : "questions"}
              </p>
              {round.qualifierLimit !== null && round.qualified && (
                <p className="mt-1 text-sm text-accent">
                  OK You qualified (top {round.qualifierLimit} of round{" "}
                  {round.number - 1})
                </p>
              )}
              <div className="mt-5 flex-1 border-t border-dashed border-line pt-4">
                <RoundState round={round} resultsPublished={resultsPublished} />
              </div>
            </Panel>
          </li>
        ))}
      </ol>
    </div>
  );
}
