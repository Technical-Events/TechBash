import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Bordered data table. Scrolls inside its own box so wide tables never
 * scroll the page. `caption` names the table for screen readers.
 */
export function Table({
  caption,
  head,
  children,
  className,
}: {
  caption: string;
  head: ReactNode[];
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("overflow-x-auto border border-line", className)}
      tabIndex={0}
      role="region"
      aria-label={caption}
    >
      <table className="w-full border-collapse text-left text-sm">
        <caption className="sr-only">{caption}</caption>
        <thead className="bg-surface text-xs tracking-[0.08em] text-muted uppercase">
          <tr>
            {head.map((cell, index) => (
              <th
                key={index}
                scope="col"
                className="border-b border-line px-3 py-2 font-bold whitespace-nowrap"
              >
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_td]:border-b [&_td]:border-line [&_td]:px-3 [&_td]:py-2 [&_td]:align-top [&_tr:last-child_td]:border-b-0">
          {children}
        </tbody>
      </table>
    </div>
  );
}

/** Message row for a table with no data. */
export function EmptyRow({
  colSpan,
  children,
}: {
  colSpan: number;
  children: ReactNode;
}) {
  return (
    <tr>
      <td colSpan={colSpan} className="text-muted">
        # {children}
      </td>
    </tr>
  );
}
