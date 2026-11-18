import {
  clearQualifiers,
  setQualifiers,
} from "@/app/admin/(panel)/rounds/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import type { RoundStatus } from "@/lib/rounds/constants";
import { formatDuration } from "@/lib/results/csv";
import type { RankedParticipant } from "@/lib/results/ranking";

type QualificationSectionProps = {
  round: { number: number; qualifierLimit: number | null };
  previousStatus: RoundStatus | undefined;
  /** The previous round ranked on its own (rankRound). */
  ranking: RankedParticipant[];
  /** Participants currently allowed into this round. */
  qualifiedIds: Set<string>;
  /** Attempts at this round by participants outside the selection. */
  outsiders: number;
};

/** Admin control for "top N of the previous round advance to this one". */
export function QualificationSection({
  round,
  previousStatus,
  ranking,
  qualifiedIds,
  outsiders,
}: QualificationSectionProps) {
  const from = round.number - 1;
  const gated = round.qualifierLimit !== null;
  return (
    <section aria-labelledby="qualification-heading">
      <SectionHeading
        id="qualification-heading"
        intro={`Choose how many of round ${from}'s top participants may take round ${round.number}. Ranked by round ${from} score, then less time taken, then earlier submission. Everyone tied on the last place advances.`}
      >
        Qualification
      </SectionHeading>

      <Panel title="advance.conf">
        <p className="text-sm">
          {gated ? (
            <>
              <Badge tone="amber">gated</Badge>{" "}
              <span className="text-muted">
                Top {round.qualifierLimit} of round {from}:{" "}
              </span>
              <span className="font-bold">{qualifiedIds.size}</span> participant
              {qualifiedIds.size === 1 ? "" : "s"} may unlock this round.
            </>
          ) : (
            <>
              <Badge tone="accent">open</Badge>{" "}
              <span className="text-muted">
                Every participant may unlock this round.
              </span>
            </>
          )}
        </p>
        {previousStatus !== "closed" && (
          <p className="mt-3 text-sm text-amber">
            ! Close round {from} before selecting, so its ranking is final.
          </p>
        )}
        {outsiders > 0 && (
          <p className="mt-3 text-sm text-amber">
            ! {outsiders} participant{outsiders === 1 ? " who is" : "s who are"}{" "}
            not in the selection already started this round. They can no longer
            save answers.
          </p>
        )}
        <div className="mt-5 flex flex-wrap items-end gap-x-6 gap-y-4">
          <ActionForm
            action={setQualifiers}
            submitLabel={gated ? "Update selection" : "Select top N"}
            pendingLabel="... Selecting"
            confirmLabel="Confirm selection"
            inline
          >
            <input type="hidden" name="round" value={round.number} />
            <Field
              id={`qualifier-count-${round.number}`}
              label="How many advance"
              name="count"
              type="number"
              inputMode="numeric"
              min={1}
              required
              defaultValue={round.qualifierLimit ?? ""}
              hint={`${ranking.length} submitted round ${from}.`}
              className="w-48"
            />
          </ActionForm>
          {gated && (
            <ActionForm
              action={clearQualifiers}
              submitLabel="Open to everyone"
              variant="secondary"
              confirmLabel="Confirm open to everyone"
            >
              <input type="hidden" name="round" value={round.number} />
            </ActionForm>
          )}
        </div>
      </Panel>

      <div className="mt-8">
        <Table
          caption={`Round ${from} ranking`}
          head={["Rank", "USN", "Name", "Score", "Time", "Advances"]}
        >
          {ranking.length === 0 && (
            <EmptyRow colSpan={6}>Nobody has submitted round {from}.</EmptyRow>
          )}
          {ranking.map((entry) => (
            <tr key={entry.participantId}>
              <td className="font-bold tabular-nums">{entry.rank}</td>
              <td className="whitespace-nowrap">{entry.usn}</td>
              <td className="min-w-[16ch]">{entry.fullName}</td>
              <td className="tabular-nums">{entry.totalScore}</td>
              <td className="whitespace-nowrap tabular-nums">
                {formatDuration(entry.timeTakenMs)}
              </td>
              <td>
                {!gated ? (
                  <span className="text-muted">-</span>
                ) : qualifiedIds.has(entry.participantId) ? (
                  <Badge tone="accent">yes</Badge>
                ) : (
                  <Badge tone="muted">no</Badge>
                )}
              </td>
            </tr>
          ))}
        </Table>
      </div>
    </section>
  );
}
