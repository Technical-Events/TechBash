import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type PanelProps = {
  /** Shown as `[ title ]` on the top border, like a fieldset legend. */
  title?: string;
  /** Dashed border: planned or unavailable content. */
  dashed?: boolean;
  className?: string;
  children: ReactNode;
};

const corners = [
  "-top-[0.5em] -left-[0.5ch]",
  "-top-[0.5em] -right-[0.5ch]",
  "-bottom-[0.5em] -left-[0.5ch]",
  "-bottom-[0.5em] -right-[0.5ch]",
];

export function Panel({ title, dashed, className, children }: PanelProps) {
  return (
    <div
      className={cn(
        "relative border border-line bg-bg p-5 sm:p-6",
        dashed && "border-dashed",
        className,
      )}
    >
      {corners.map((position) => (
        <span
          key={position}
          aria-hidden="true"
          className={cn("ascii-corner", position)}
        >
          +
        </span>
      ))}
      {title && (
        <p className="absolute -top-[0.8em] left-4 max-w-[calc(100%-2rem)] truncate bg-bg px-2 text-sm leading-normal text-muted">
          [ {title} ]
        </p>
      )}
      {children}
    </div>
  );
}
