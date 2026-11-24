"use client";

import { useEffect, useId, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { formatDuration } from "@/lib/results/csv";
import type { RankedParticipant } from "@/lib/results/ranking";
import { cn } from "@/lib/utils";

// figlet "standard" font. Plain ASCII: the bundled font has no box glyphs.
const banner = [
  " _____ ___  ____     ____",
  "|_   _/ _ \\|  _ \\   | ___|",
  "  | || | | | |_) |  |___ \\",
  "  | || |_| |  __/    ___) |",
  "  |_| \\___/|_|      |____/",
].join("\n");

/** Seconds before the first (lowest) place is typed in, then between places. */
const START = 0.8;
const STEP = 0.9;
/** Extra pause before first place. */
const SUSPENSE = 0.8;

/**
 * Modal with the top 5 of a round that closed, that round alone. Places are typed in
 * from the lowest up to first place; under reduced motion all show at once.
 * Opens as soon as it mounts; remount it (new `key`) to play it again.
 */
export function TopFiveDialog({
  roundNumber,
  roundTitle,
  entries,
  onClose,
}: {
  roundNumber: number;
  roundTitle: string;
  /** Top places in rank order, ties on the last place included. */
  entries: RankedParticipant[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();

  useEffect(() => {
    const dialog = ref.current;
    // Guard: effects run twice in development (Strict Mode).
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  const close = () => ref.current?.close();

  return (
    <dialog
      ref={ref}
      aria-labelledby={headingId}
      onClose={onClose}
      // A click on the backdrop lands on the dialog element itself.
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
      className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-2xl overflow-y-auto bg-transparent p-3 text-fg backdrop:bg-bg/90"
    >
      <Panel title={`round ${roundNumber} closed`}>
        <pre
          aria-hidden="true"
          className="animate-reveal overflow-hidden text-[clamp(9px,3vw,16px)] leading-[1.1] text-accent"
        >
          {banner}
        </pre>
        <h2 id={headingId} className="mt-5 text-lg sm:text-xl">
          Top 5 of round {roundNumber}
        </h2>
        <p className="mt-1 text-sm text-muted">
          # {roundTitle}: this round alone, earlier rounds do not count.
        </p>

        {entries.length === 0 ? (
          <p className="mt-6 text-muted"># Nobody has scored yet.</p>
        ) : (
          <ol className="mt-6 space-y-3">
            {entries.map((entry, index) => {
              const first = entry.rank === 1;
              const fromBottom = entries.length - 1 - index;
              const delay = START + fromBottom * STEP + (first ? SUSPENSE : 0);
              const tied = entries.some(
                (other) => other !== entry && other.rank === entry.rank,
              );
              return (
                <li
                  key={entry.participantId}
                  className={cn(
                    "animate-reveal grid grid-cols-[5ch_1fr] items-baseline gap-x-3 border-b border-dashed border-line pb-3 sm:grid-cols-[5ch_1fr_auto]",
                    first && "text-accent",
                  )}
                  style={{ animationDelay: `${delay}s` }}
                >
                  <span
                    className={cn(
                      "font-bold tabular-nums",
                      first ? "text-2xl sm:text-3xl" : "text-xl",
                    )}
                  >
                    #{entry.rank}
                  </span>
                  <span className="min-w-0">
                    <span
                      className={cn(
                        "block font-bold uppercase",
                        first ? "text-lg sm:text-2xl" : "text-base sm:text-lg",
                      )}
                    >
                      {entry.fullName}
                      {first && (
                        <span aria-hidden="true" className="animate-blink">
                          _
                        </span>
                      )}
                    </span>
                    <span className="flex flex-wrap gap-x-3 text-sm text-muted">
                      <span>{entry.usn}</span>
                      {tied && <Badge tone="amber">tie</Badge>}
                    </span>
                  </span>
                  <span className="col-start-2 text-sm tabular-nums sm:col-start-auto sm:text-right">
                    <span className="block font-bold text-fg sm:text-lg">
                      {entry.totalScore} pts
                    </span>
                    <span className="text-muted">
                      {formatDuration(entry.timeTakenMs)}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        )}

        <div className="mt-6 flex justify-end">
          <Button variant="secondary" onClick={close}>
            Close
          </Button>
        </div>
      </Panel>
    </dialog>
  );
}
