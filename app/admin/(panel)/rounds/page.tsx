import type { Metadata } from "next";
import { count, isNull } from "drizzle-orm";
import { RoundBadges } from "@/components/rounds/round-badges";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { requireAdminDb } from "@/lib/auth/session";
import { getResultsData } from "@/lib/db/queries/results";
import { accessKeys, rounds } from "@/lib/db/schema";

export const metadata: Metadata = { title: "Rounds" };

export default async function AdminRoundsPage() {
  const { db } = await requireAdminDb();
  const [data, roundRows, activeKeys] = await Promise.all([
    getResultsData(db),
    db.select().from(rounds).orderBy(rounds.number),
    db
      .select({ roundId: accessKeys.roundId, keys: count() })
      .from(accessKeys)
      .where(isNull(accessKeys.revokedAt))
      .groupBy(accessKeys.roundId),
  ]);

  return (
    <>
      <PageHeading command="./admin --rounds" title="Rounds">
        Settings, questions and access keys for the three rounds.
      </PageHeading>
      <ol className="grid gap-x-6 gap-y-10 lg:grid-cols-3">
        {roundRows.map((round) => {
          const info = data.rounds.find((r) => r.id === round.id);
          const attempts = data.attempts.filter((a) => a.roundId === round.id);
          const keys =
            activeKeys.find((k) => k.roundId === round.id)?.keys ?? 0;
          return (
            <li key={round.id}>
              <Panel
                title={`round ${round.number}`}
                className="flex h-full flex-col"
              >
                <RoundBadges
                  status={round.status}
                  durationMinutes={round.durationMinutes}
                  sequential={round.sequential}
                />
                <h2 className="mt-3 text-lg">{round.title}</h2>
                <dl className="mt-3 flex-1 space-y-1 text-sm">
                  {[
                    ["Questions", info?.questionCount ?? 0],
                    ["Max score", info?.maxScore ?? 0],
                    ["Active keys", keys],
                    ["Unlocked", attempts.length],
                    ["Submitted", attempts.filter((a) => a.submittedAt).length],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                      <dt className="text-muted">{label}</dt>
                      <dd className="tabular-nums">{value}</dd>
                    </div>
                  ))}
                </dl>
                {keys === 0 && round.status === "open" && (
                  <p className="mt-3 text-sm text-danger">
                    ! Open, but no active access key.
                  </p>
                )}
                <ButtonLink
                  href={`/admin/rounds/${round.number}`}
                  className="mt-5"
                >
                  Manage
                </ButtonLink>
              </Panel>
            </li>
          );
        })}
      </ol>
      {roundRows.length === 0 && (
        <p className="text-danger">
          ! No rounds found. Run the database migrations (pnpm db:migrate).
        </p>
      )}
    </>
  );
}
