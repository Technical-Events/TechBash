"use client";

import { useState } from "react";
import { AttemptCell } from "@/components/admin/attempt-cell";
import { TopFiveDialog } from "@/components/admin/top-five-dialog";
import { RoundStatusBadge } from "@/components/rounds/round-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import type { AttemptRow, RoundInfo } from "@/lib/db/queries/results";
import { formatDuration } from "@/lib/results/csv";
import type { RankedParticipant } from "@/lib/results/ranking";

export type Podium = {
  roundNumber: number;
  /** Overall top 5 counting rounds 1 to `roundNumber` (rankThroughRound). */
  entries: RankedParticipant[];
};

type Showing = { roundNumber: number; take: number };

/** Places moved since the previous refresh that changed this rank. */
function Move({ places }: { places: number | undefined }) {
  if (!places) return <span className="text-muted">=</span>;
  const up = places > 0;
  return (
    <span className={up ? "text-accent" : "text-amber"}>
      <span aria-hidden="true">
        {up ? "+" : "-"}
        {Math.abs(places)}
      </span>
      <span className="sr-only">
        {up ? "up" : "down"} {Math.abs(places)}
      </span>
    </span>
  );
}

/**
 * The live part of the leaderboard. The page re-renders every few seconds
 * (AutoRefresh); this compares each render with the one before to mark rank
 * moves and to open the top 5 when a round changes to closed.
 */
export function LiveLeaderboard({
  rounds,
  ranked,
  attempts,
  podiums,
}: {
  rounds: RoundInfo[];
  /** Participants who unlocked at least one round, in rank order. */
  ranked: RankedParticipant[];
  attempts: AttemptRow[];
  /** One per closed round. */
  podiums: Podium[];
}) {
  const [seen, setSeen] = useState({ rounds, ranked });
  const [moves, setMoves] = useState<Record<string, number>>({});
  const [showing, setShowing] = useState<Showing | null>(null);

  // New data from the server: compare with the previous render. Adjusting
  // state during render is React's pattern for reacting to changed props.
  if (seen.rounds !== rounds || seen.ranked !== ranked) {
    const before = new Map(seen.ranked.map((e) => [e.participantId, e.rank]));
    const nextMoves = { ...moves };
    for (const entry of ranked) {
      const previous = before.get(entry.participantId);
      if (previous !== undefined && previous !== entry.rank) {
        nextMoves[entry.participantId] = previous - entry.rank;
      }
    }
    const justClosed = rounds.filter(
      (round) =>
        round.status === "closed" &&
        seen.rounds.find((r) => r.id === round.id)?.status !== "closed",
    );
    const latest = justClosed.at(-1);
    if (latest) {
      setShowing({
        roundNumber: latest.number,
        take: (showing?.take ?? 0) + 1,
      });
    }
    setMoves(nextMoves);
    setSeen({ rounds, ranked });
  }

  const show = (roundNumber: number) =>
    setShowing({ roundNumber, take: (showing?.take ?? 0) + 1 });
  const podium = showing
    ? podiums.find((p) => p.roundNumber === showing.roundNumber)
    : undefined;
  const podiumRound = rounds.find((r) => r.number === podium?.roundNumber);
  const attemptOf = new Map(
    attempts.map((a) => [`${a.participantId}:${a.roundId}`, a]),
  );

  return (
    <div className="space-y-16">
      <section aria-labelledby="leaderboard-rounds-heading">
        <SectionHeading
          id="leaderboard-rounds-heading"
          intro="When a round is closed, its top 5 opens here by itself. Show it again with the button."
        >
          Rounds
        </SectionHeading>
        <ul className="grid gap-4 lg:grid-cols-3">
          {rounds.map((round) => {
            const own = attempts.filter((a) => a.roundId === round.id);
            const submitted = own.filter((a) => a.submittedAt).length;
            return (
              <li
                key={round.id}
                className="flex flex-col gap-3 border border-line bg-surface px-4 py-3"
              >
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                  <p className="min-w-0 font-bold">
                    R{round.number}. {round.title}
                  </p>
                  <RoundStatusBadge status={round.status} />
                </div>
                <p className="text-sm text-muted tabular-nums">
                  {submitted} submitted, {own.length - submitted} working
                </p>
                {round.status === "closed" && (
                  <Button
                    variant="secondary"
                    className="self-start"
                    onClick={() => show(round.number)}
                  >
                    Show top 5
                  </Button>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      <section aria-labelledby="standings-heading">
        <SectionHeading
          id="standings-heading"
          intro="OK = submitted, ... = in progress with its score so far, * = submitted automatically, - = not unlocked. Move: places gained or lost at the last change."
        >
          Standings
        </SectionHeading>
        <Table
          caption="Live standings"
          head={[
            "Rank",
            "Move",
            "USN",
            "Name",
            ...rounds.map((r) => `R${r.number}`),
            "Total",
            "Rounds",
            "Time",
          ]}
        >
          {ranked.length === 0 && (
            <EmptyRow colSpan={7 + rounds.length}>
              Nobody has unlocked a round yet.
            </EmptyRow>
          )}
          {ranked.map((entry) => (
            <tr key={entry.participantId}>
              <td className="font-bold tabular-nums">
                {entry.rank}
                {entry.rank <= 3 && entry.totalScore > 0 && (
                  <span className="ml-2">
                    <Badge tone="accent">top {entry.rank}</Badge>
                  </span>
                )}
              </td>
              <td className="tabular-nums">
                <Move places={moves[entry.participantId]} />
              </td>
              <td className="whitespace-nowrap">{entry.usn}</td>
              <td className="min-w-[16ch]">{entry.fullName}</td>
              {rounds.map((round) => (
                <td key={round.id} className="whitespace-nowrap tabular-nums">
                  <AttemptCell
                    attempt={attemptOf.get(
                      `${entry.participantId}:${round.id}`,
                    )}
                  />
                </td>
              ))}
              <td className="font-bold text-accent tabular-nums">
                {entry.totalScore}
              </td>
              <td className="tabular-nums">
                {entry.roundsSubmitted}/{rounds.length}
              </td>
              <td className="whitespace-nowrap tabular-nums">
                {formatDuration(entry.timeTakenMs)}
              </td>
            </tr>
          ))}
        </Table>
      </section>

      {showing && podium && podiumRound && (
        <TopFiveDialog
          key={showing.take}
          roundNumber={podium.roundNumber}
          roundTitle={podiumRound.title}
          entries={podium.entries}
          onClose={() => setShowing(null)}
        />
      )}
    </div>
  );
}
