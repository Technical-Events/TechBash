import type { AttemptRow } from "@/lib/db/queries/results";

/** Compact per-round status for tables: `-`, `... 3`, `OK 7`. */
export function AttemptCell({ attempt }: { attempt: AttemptRow | undefined }) {
  if (!attempt) return <span className="text-muted">-</span>;
  if (!attempt.submittedAt) {
    return (
      <span className="text-amber" title="In progress">
        ... {attempt.score}
      </span>
    );
  }
  return (
    <span
      className={attempt.autoSubmitted ? "text-fg" : "text-accent"}
      title={attempt.autoSubmitted ? "Submitted automatically" : "Submitted"}
    >
      OK {attempt.score}
      {attempt.autoSubmitted ? "*" : ""}
    </span>
  );
}
