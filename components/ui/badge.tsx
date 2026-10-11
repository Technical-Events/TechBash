import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type BadgeTone = "accent" | "amber" | "fg" | "muted" | "danger";

const tones: Record<BadgeTone, string> = {
  accent: "text-accent",
  amber: "text-amber",
  fg: "text-fg",
  muted: "text-muted",
  danger: "text-danger",
};

export function Badge({
  tone = "muted",
  children,
}: {
  tone?: BadgeTone;
  children: ReactNode;
}) {
  return (
    <span
      className={cn(
        "text-xs font-bold tracking-[0.08em] whitespace-nowrap uppercase",
        tones[tone],
      )}
    >
      [{children}]
    </span>
  );
}
