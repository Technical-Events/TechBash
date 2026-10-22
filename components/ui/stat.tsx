import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A labelled number for dashboards: `> PARTICIPANTS  42`. */
export function Stat({
  label,
  value,
  detail,
  tone = "fg",
}: {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: "fg" | "accent" | "amber";
}) {
  return (
    <div className="border border-line bg-surface px-4 py-3">
      <dt className="text-xs tracking-[0.08em] text-muted uppercase">
        {label}
      </dt>
      <dd
        className={cn(
          "mt-1 text-2xl font-bold tabular-nums",
          tone === "accent" && "text-accent",
          tone === "amber" && "text-amber",
        )}
      >
        {value}
      </dd>
      {detail && <dd className="mt-1 text-xs text-muted">{detail}</dd>}
    </div>
  );
}
