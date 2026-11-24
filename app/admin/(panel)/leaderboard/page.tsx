import type { Metadata } from "next";
import {
  LiveLeaderboard,
  type Podium,
} from "@/components/admin/live-leaderboard";
import { AutoRefresh } from "@/components/ui/auto-refresh";
import { PageHeading } from "@/components/ui/page-heading";
import { Stat } from "@/components/ui/stat";
import { requireAdminDb } from "@/lib/auth/session";
import { getResultsData } from "@/lib/db/queries/results";
import { formatTime } from "@/lib/format";
import { rankThroughRound, selectWinners } from "@/lib/results/ranking";

export const metadata: Metadata = { title: "Leaderboard" };

/** How often the open page re-reads the standings. */
const REFRESH_SECONDS = 5;
const PODIUM_PLACES = 5;

export default async function LeaderboardPage() {
  const { db } = await requireAdminDb();
  const data = await getResultsData(db);
  const updatedAt = new Date();

  // Ranks come from the whole roster; only those who started are listed.
  const ranked = data.ranked.filter((entry) => entry.rounds.length > 0);
  const podiums: Podium[] = data.rounds
    .filter((round) => round.status === "closed")
    .map((round) => ({
      roundNumber: round.number,
      entries: selectWinners(
        rankThroughRound(data.outcomes, round.number),
        PODIUM_PLACES,
      ),
    }));
  const working = data.attempts.filter((a) => !a.submittedAt).length;
  const leader = ranked[0];

  return (
    <>
      <AutoRefresh seconds={REFRESH_SECONDS} />
      <PageHeading command="./admin --leaderboard" title="Leaderboard">
        Overall standings, re-read every {REFRESH_SECONDS} seconds while this
        tab is visible. Scores of rounds in progress are provisional.
      </PageHeading>

      <div className="space-y-16">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          <Stat
            label="Started"
            value={ranked.length}
            detail={`of ${data.participants.length} registered`}
          />
          <Stat label="Working now" value={working} tone="amber" />
          <Stat
            label="Rounds closed"
            value={`${podiums.length}/${data.rounds.length}`}
          />
          <Stat
            label="Leader"
            value={leader && leader.totalScore > 0 ? leader.totalScore : "-"}
            detail={leader && leader.totalScore > 0 ? leader.usn : "nobody yet"}
            tone="accent"
          />
          <Stat
            label="Updated"
            value={formatTime(updatedAt)}
            detail={`refreshes every ${REFRESH_SECONDS} s`}
          />
        </dl>

        <LiveLeaderboard
          rounds={data.rounds}
          ranked={ranked}
          attempts={data.attempts}
          podiums={podiums}
        />
      </div>
    </>
  );
}
