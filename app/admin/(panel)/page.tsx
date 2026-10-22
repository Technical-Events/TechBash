import type { Metadata } from "next";
import { type ChartDataset, BarChart } from "@/components/admin/bar-chart";
import { RoundStatusBadge } from "@/components/rounds/round-badges";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { Stat } from "@/components/ui/stat";
import { EmptyRow, Table } from "@/components/ui/table";
import { requireAdminDb } from "@/lib/auth/session";
import { getQuestionStats, getResultsData } from "@/lib/db/queries/results";
import { formatDateTime } from "@/lib/format";
import { formatDuration } from "@/lib/results/csv";
import { firstFinisher } from "@/lib/results/ranking";
import { percent, scoreHistogram } from "@/lib/results/stats";

export const metadata: Metadata = { title: "Dashboard" };

export default async function AdminDashboardPage() {
  const { db } = await requireAdminDb();
  const data = await getResultsData(db);
  const questionStats = await Promise.all(
    data.rounds.map((round) => getQuestionStats(db, round.id)),
  );

  const total = data.participants.length;
  const loggedIn = data.participants.filter((p) => p.lastLoginAt).length;
  const completedAll = data.ranked.filter((r) => r.finishedAt).length;
  const first = firstFinisher(data.ranked);
  const leader = data.ranked[0];

  const perRound = data.rounds.map((round, index) => {
    const attempts = data.attempts.filter((a) => a.roundId === round.id);
    const submitted = attempts.filter((a) => a.submittedAt);
    const scores = submitted.map((a) => a.score);
    const times = submitted.map(
      (a) => (a.submittedAt?.getTime() ?? 0) - a.startedAt.getTime(),
    );
    return {
      round,
      unlocked: attempts.length,
      inProgress: attempts.length - submitted.length,
      submitted: submitted.length,
      scores,
      average: scores.length
        ? scores.reduce((sum, s) => sum + s, 0) / scores.length
        : 0,
      best: scores.length ? Math.max(...scores) : 0,
      averageTime: times.length
        ? times.reduce((sum, t) => sum + t, 0) / times.length
        : 0,
      questions: questionStats[index],
    };
  });

  const progressCharts: ChartDataset[] = perRound.map(
    ({ round, unlocked, inProgress, submitted }) => ({
      id: round.id,
      label: `R${round.number}`,
      max: Math.max(1, total),
      bars: [
        {
          label: "Submitted",
          value: submitted,
          detail: `${submitted} of ${total} participants (${percent(submitted, total)}%)`,
        },
        {
          label: "Working",
          value: inProgress,
          tone: "amber",
          detail: `${inProgress} unlocked and still answering`,
        },
        {
          label: "Not started",
          value: total - unlocked,
          tone: "muted",
          detail: `${total - unlocked} have not unlocked round ${round.number}`,
        },
      ],
    }),
  );

  const scoreCharts: ChartDataset[] = perRound.map(({ round, scores }) => ({
    id: round.id,
    label: `R${round.number}`,
    bars: scoreHistogram(scores, round.maxScore).map((bucket) => ({
      label: bucket.label,
      value: bucket.count,
      detail: `${bucket.count} submitted attempt${bucket.count === 1 ? "" : "s"} scored ${bucket.label} of ${round.maxScore}`,
    })),
  }));

  const accuracyCharts: ChartDataset[] = perRound.map(
    ({ round, questions }) => ({
      id: round.id,
      label: `R${round.number}`,
      max: 100,
      bars: questions.map((q, i) => ({
        label: `Q${i + 1}`,
        value: percent(q.correct, q.answered),
        display: `${percent(q.correct, q.answered)}%`,
        tone: percent(q.correct, q.answered) < 30 ? "amber" : "accent",
        detail: `${q.correct}/${q.answered} correct, ${q.tries} total tries. ${q.prompt.slice(0, 80)}${q.prompt.length > 80 ? "..." : ""}`,
      })),
    }),
  );

  return (
    <>
      <PageHeading command="./admin --status" title="Dashboard">
        Live overview of the event. Refresh the page for the latest numbers.
      </PageHeading>

      <div className="space-y-16">
        <dl className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
          <Stat label="Registered" value={total} />
          <Stat
            label="Logged in"
            value={loggedIn}
            detail={`${percent(loggedIn, total)}% of roster`}
          />
          <Stat label="Finished all" value={completedAll} tone="accent" />
          <Stat
            label="Rounds open"
            value={data.rounds.filter((r) => r.status === "open").length}
            tone="amber"
          />
          <Stat
            label="Top score"
            value={leader && leader.totalScore > 0 ? leader.totalScore : "-"}
            detail={leader && leader.totalScore > 0 ? leader.usn : undefined}
          />
          <Stat
            label="First finisher"
            value={first ? first.usn : "-"}
            detail={first ? formatDateTime(first.finishedAt) : "nobody yet"}
            tone="accent"
          />
        </dl>

        <section aria-labelledby="rounds-heading">
          <SectionHeading id="rounds-heading">Rounds</SectionHeading>
          <Table
            caption="Round statistics"
            head={[
              "Round",
              "Status",
              "Unlocked",
              "Working",
              "Submitted",
              "Avg score",
              "Best",
              "Avg time",
            ]}
          >
            {perRound.map(
              ({
                round,
                unlocked,
                inProgress,
                submitted,
                average,
                best,
                averageTime,
              }) => (
                <tr key={round.id}>
                  <td className="min-w-[14ch]">
                    {round.number}. {round.title}
                  </td>
                  <td>
                    <RoundStatusBadge status={round.status} />
                  </td>
                  <td className="tabular-nums">{unlocked}</td>
                  <td className="tabular-nums">{inProgress}</td>
                  <td className="tabular-nums">{submitted}</td>
                  <td className="tabular-nums">
                    {average.toFixed(1)} / {round.maxScore}
                  </td>
                  <td className="tabular-nums">{best}</td>
                  <td className="tabular-nums whitespace-nowrap">
                    {submitted ? formatDuration(averageTime) : "-"}
                  </td>
                </tr>
              ),
            )}
          </Table>
        </section>

        <section aria-labelledby="charts-heading">
          <SectionHeading id="charts-heading">Analytics</SectionHeading>
          <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
            <Panel title="progress">
              <BarChart
                caption="Participants by round"
                datasets={progressCharts}
                empty="No participants yet."
              />
            </Panel>
            <Panel title="scores">
              <BarChart
                caption="Score distribution (submitted)"
                datasets={scoreCharts}
                empty="No submitted attempts yet."
              />
            </Panel>
            <Panel title="accuracy" className="lg:col-span-2">
              <BarChart
                caption="Correct answers per question"
                datasets={accuracyCharts}
                empty="No answers yet."
              />
            </Panel>
          </div>
        </section>

        <section aria-labelledby="top-heading">
          <SectionHeading id="top-heading">Leaderboard (top 5)</SectionHeading>
          <Table
            caption="Top five participants"
            head={["Rank", "USN", "Name", "Score", "Rounds", "Time"]}
          >
            {data.ranked.length === 0 && (
              <EmptyRow colSpan={6}>No participants yet.</EmptyRow>
            )}
            {data.ranked.slice(0, 5).map((entry) => (
              <tr key={entry.participantId}>
                <td className="tabular-nums font-bold">{entry.rank}</td>
                <td className="whitespace-nowrap">{entry.usn}</td>
                <td>{entry.fullName}</td>
                <td className="tabular-nums text-accent">{entry.totalScore}</td>
                <td className="tabular-nums">
                  {entry.roundsSubmitted}/{data.rounds.length}
                </td>
                <td className="tabular-nums whitespace-nowrap">
                  {formatDuration(entry.timeTakenMs)}
                </td>
              </tr>
            ))}
          </Table>
          <ButtonLink
            href="/admin/results"
            variant="secondary"
            className="mt-6"
          >
            Full results
          </ButtonLink>
        </section>
      </div>
    </>
  );
}
