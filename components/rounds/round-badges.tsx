import { Badge } from "@/components/ui/badge";
import type { RoundStatus } from "@/lib/rounds/constants";

const statusLabel: Record<
  RoundStatus,
  { text: string; tone: "accent" | "amber" | "muted" }
> = {
  open: { text: "open", tone: "accent" },
  draft: { text: "upcoming", tone: "amber" },
  closed: { text: "closed", tone: "muted" },
};

export function RoundStatusBadge({ status }: { status: RoundStatus }) {
  const { text, tone } = statusLabel[status];
  return <Badge tone={tone}>{text}</Badge>;
}

/** Status, time limit and format badges for a round. */
export function RoundBadges({
  status,
  durationMinutes,
  sequential,
}: {
  status: RoundStatus;
  durationMinutes: number | null;
  sequential: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1">
      <RoundStatusBadge status={status} />
      <Badge tone="fg">
        {durationMinutes ? `${durationMinutes} min` : "no time limit"}
      </Badge>
      {sequential && <Badge>clue by clue</Badge>}
    </div>
  );
}
