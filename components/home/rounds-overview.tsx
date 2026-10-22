import { RoundBadges } from "@/components/rounds/round-badges";
import { Panel } from "@/components/ui/panel";
import type { RoundSummary } from "@/lib/content/defaults";

export function RoundsOverview({ rounds }: { rounds: RoundSummary[] }) {
  return (
    <ol className="grid gap-x-6 gap-y-8 md:grid-cols-3">
      {rounds.map((round) => (
        <li key={round.number}>
          <Panel
            title={`round ${round.number}`}
            className="flex h-full flex-col"
          >
            <RoundBadges
              status={round.status}
              durationMinutes={round.durationMinutes}
              sequential={round.sequential}
            />
            <h3 className="mt-3 text-base">{round.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted">
              {round.description}
            </p>
          </Panel>
        </li>
      ))}
    </ol>
  );
}
