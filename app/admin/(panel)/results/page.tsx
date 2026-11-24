import type { Metadata } from "next";
import { AttemptCell } from "@/components/admin/attempt-cell";
import { Badge } from "@/components/ui/badge";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import { requireAdminDb } from "@/lib/auth/session";
import { getEventInfo } from "@/lib/db/queries/content";
import { getResultsData } from "@/lib/db/queries/results";
import { formatDateTime } from "@/lib/format";
import { formatDuration } from "@/lib/results/csv";
import { firstFinisher, selectWinners } from "@/lib/results/ranking";

export const metadata: Metadata = { title: "Results" };

const exports = [
  { kind: "results", label: "Results and ranking" },
  { kind: "participants", label: "Participants" },
  { kind: "answers", label: "Every answer" },
] as const;

const tieBreaks = [
  "Higher score in the current round. Earlier rounds do not count.",
  "Submitted ranks above still in progress.",
  "Less time taken (unlock to submission).",
  "Earlier submission.",
  "Still equal: shared rank.",
];

export default async function ResultsPage() {
  const { db } = await requireAdminDb();
  const [data, info] = await Promise.all([getResultsData(db), getEventInfo()]);
  const winners = selectWinners(data.ranked, info.winnerCount);
  const first = firstFinisher(data.ranked);
  const stillWorking = data.attempts.filter((a) => !a.submittedAt).length;
  const current = data.currentRound;
  const roundLabel = current === null ? "" : ` (round ${current})`;

  return (
    <>
      <PageHeading command="./admin --results" title="Results">
        {current === null
          ? "No round has started yet."
          : `Ranked by round ${current} alone, the latest round that is open or closed; earlier rounds do not count. Winners update live and are final once round ${current} is closed.`}
      </PageHeading>

      <div className="space-y-16">
        {stillWorking > 0 && (
          <p className="border border-amber px-3 py-2 text-sm text-amber">
            ! {stillWorking} attempt{stillWorking === 1 ? " is" : "s are"} still
            in progress. Results are provisional.
          </p>
        )}

        <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-8">
          <Panel title="winners">
            <h2 className="text-lg">
              Winner list (top {info.winnerCount}
              {roundLabel})
            </h2>
            {winners.length === 0 ? (
              <p className="mt-3 text-sm text-muted">
                # Nobody has scored yet.
              </p>
            ) : (
              <ol className="mt-4 space-y-3">
                {winners.map((entry) => (
                  <li
                    key={entry.participantId}
                    className="flex flex-wrap items-baseline gap-x-3 gap-y-1"
                  >
                    <span className="font-bold text-accent tabular-nums">
                      #{entry.rank}
                    </span>
                    <span className="font-bold">{entry.fullName}</span>
                    <span className="text-sm text-muted">{entry.usn}</span>
                    <span className="text-sm tabular-nums">
                      {entry.totalScore} pts,{" "}
                      {formatDuration(entry.timeTakenMs)}
                    </span>
                    {winners.some(
                      (w) => w !== entry && w.rank === entry.rank,
                    ) && <Badge tone="amber">tie</Badge>}
                  </li>
                ))}
              </ol>
            )}
            <p className="mt-5 border-t border-dashed border-line pt-3 text-sm">
              <span className="text-muted">First to submit{roundLabel}: </span>
              {first ? (
                <>
                  <span className="font-bold">{first.fullName}</span> (
                  {first.usn}) at {formatDateTime(first.finishedAt)}
                </>
              ) : (
                <span className="text-muted">nobody has submitted yet</span>
              )}
            </p>
          </Panel>
          <Panel title="tie-break" className="self-start">
            <ol className="space-y-1 text-sm text-muted">
              {tieBreaks.map((rule, i) => (
                <li key={rule}>
                  {i + 1}. {rule}
                </li>
              ))}
            </ol>
            <p className="mt-3 text-sm text-muted">
              # Winner count is set on the Content page.
            </p>
          </Panel>
        </div>

        <section aria-labelledby="export-heading">
          <SectionHeading
            id="export-heading"
            intro="CSV files, UTF-8, open in any spreadsheet."
          >
            Export
          </SectionHeading>
          <ul className="flex flex-wrap gap-3">
            {exports.map(({ kind, label }) => (
              <li key={kind}>
                {/* Plain anchor: a file download, not a client navigation. */}
                <a
                  href={`/admin/export/${kind}`}
                  download
                  className="inline-flex min-h-11 items-center border border-line px-4 text-sm font-bold tracking-[0.08em] uppercase transition-colors duration-100 hover:border-accent hover:bg-accent hover:text-bg"
                >
                  <span aria-hidden="true">[&nbsp;</span>
                  {label}
                  <span aria-hidden="true">&nbsp;]</span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section aria-labelledby="ranking-heading">
          <SectionHeading
            id="ranking-heading"
            intro="OK = submitted, ... = in progress, * = submitted automatically, - = not unlocked."
          >
            Full ranking{roundLabel}
          </SectionHeading>
          <Table
            caption={`Full ranking${roundLabel}`}
            head={[
              "Rank",
              "USN",
              "Name",
              ...data.rounds.map((r) => `R${r.number}`),
              "Score",
              "Time",
              "Submitted",
            ]}
          >
            {data.ranked.length === 0 && (
              <EmptyRow colSpan={6 + data.rounds.length}>
                {current === null
                  ? "No round has started yet."
                  : `Nobody has unlocked round ${current} yet.`}
              </EmptyRow>
            )}
            {data.ranked.map((entry) => (
              <tr key={entry.participantId}>
                <td className="font-bold tabular-nums">
                  {entry.rank}
                  {first?.participantId === entry.participantId && (
                    <span className="ml-2">
                      <Badge tone="accent">first</Badge>
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap">{entry.usn}</td>
                <td className="min-w-[16ch]">{entry.fullName}</td>
                {data.rounds.map((round) => (
                  <td key={round.id} className="whitespace-nowrap tabular-nums">
                    <AttemptCell
                      attempt={data.attempts.find(
                        (a) =>
                          a.participantId === entry.participantId &&
                          a.roundId === round.id,
                      )}
                    />
                  </td>
                ))}
                <td className="font-bold text-accent tabular-nums">
                  {entry.totalScore}
                </td>
                <td className="whitespace-nowrap tabular-nums">
                  {formatDuration(entry.timeTakenMs)}
                </td>
                <td className="whitespace-nowrap text-muted">
                  {entry.finishedAt ? formatDateTime(entry.finishedAt) : "-"}
                </td>
              </tr>
            ))}
          </Table>
        </section>
      </div>
    </>
  );
}
