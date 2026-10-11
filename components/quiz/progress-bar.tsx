import { cn } from "@/lib/utils";

const CELLS = 10;

/** ASCII progress bar: `[###-------] 3/10`. Decorative; pair it with text. */
export function ProgressBar({
  value,
  max,
  className,
}: {
  value: number;
  max: number;
  className?: string;
}) {
  const filled = max === 0 ? 0 : Math.round((value / max) * CELLS);
  return (
    <p aria-hidden="true" className={cn("text-sm text-muted", className)}>
      [<span className="text-accent">{"#".repeat(filled)}</span>
      {"-".repeat(CELLS - filled)}] {value}/{max}
    </p>
  );
}
