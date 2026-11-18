"use client";

import { useId, useState } from "react";
import { cn } from "@/lib/utils";

export type ChartBar = {
  label: string;
  value: number;
  /** Text after the bar; defaults to the value. */
  display?: string;
  /** Shown in the readout when the bar is hovered or focused. */
  detail?: string;
  tone?: "accent" | "amber" | "muted";
};

export type ChartDataset = {
  id: string;
  label: string;
  bars: ChartBar[];
  /** Scale maximum; defaults to the largest value. */
  max?: number;
};

const fills = {
  accent: "bg-accent",
  amber: "bg-amber",
  muted: "bg-muted",
} as const;

/**
 * Horizontal bar chart in the ASCII style. Datasets switch with tabs; each
 * bar is a button that shows its details in a live readout, so the chart
 * works with a mouse, a keyboard and a screen reader.
 */
export function BarChart({
  caption,
  datasets,
  empty = "No data yet.",
}: {
  caption: string;
  datasets: ChartDataset[];
  empty?: string;
}) {
  const id = useId();
  const [active, setActive] = useState(datasets[0]?.id);
  const [focused, setFocused] = useState<ChartBar | null>(null);
  const dataset = datasets.find((d) => d.id === active) ?? datasets[0];
  if (!dataset) return <p className="text-sm text-muted"># {empty}</p>;

  const max = dataset.max ?? Math.max(1, ...dataset.bars.map((b) => b.value));
  const hasData = dataset.bars.some((b) => b.value > 0);

  return (
    <figure aria-labelledby={`${id}-caption`}>
      <figcaption
        id={`${id}-caption`}
        className="text-sm font-bold tracking-[0.08em] uppercase"
      >
        {caption}
      </figcaption>
      {datasets.length > 1 && (
        <div
          role="group"
          aria-label={`${caption}: dataset`}
          className="mt-3 flex flex-wrap gap-2"
        >
          {datasets.map((d) => (
            <button
              key={d.id}
              type="button"
              aria-pressed={d.id === dataset.id}
              onClick={() => {
                setActive(d.id);
                setFocused(null);
              }}
              className={cn(
                "min-h-11 border px-3 text-xs font-bold tracking-[0.08em] uppercase transition-colors duration-100",
                d.id === dataset.id
                  ? "border-accent bg-accent text-bg"
                  : "border-line hover:border-accent hover:text-accent",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      )}
      {hasData ? (
        <ul className="mt-4 lg:space-y-1.5">
          {dataset.bars.map((bar) => (
            <li key={bar.label}>
              <button
                type="button"
                onMouseEnter={() => setFocused(bar)}
                onFocus={() => setFocused(bar)}
                onClick={() => setFocused(bar)}
                className="grid min-h-11 w-full grid-cols-[minmax(4ch,12ch)_1fr_auto] items-center gap-3 text-left text-sm hover:text-accent lg:min-h-6"
              >
                <span className="truncate text-muted">{bar.label}</span>
                <span aria-hidden="true" className="h-4 border border-line">
                  <span
                    className={cn(
                      "block h-full transition-colors duration-100",
                      fills[bar.tone ?? "accent"],
                    )}
                    style={{
                      width: `${Math.min(100, (bar.value / max) * 100)}%`,
                    }}
                  />
                </span>
                <span className="tabular-nums">{bar.display ?? bar.value}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-muted"># {empty}</p>
      )}
      <p aria-live="polite" className="mt-3 min-h-6 text-sm text-muted">
        {focused
          ? `> ${focused.label}: ${focused.detail ?? focused.display ?? focused.value}`
          : "# Hover or focus a bar for details."}
      </p>
    </figure>
  );
}
