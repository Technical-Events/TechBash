/** Suspense fallback: `... loading_` with a live region. */
export function Loading({ label = "Loading" }: { label?: string }) {
  return (
    <p role="status" className="text-muted">
      ... {label}
      <span aria-hidden="true" className="animate-blink text-accent">
        _
      </span>
    </p>
  );
}
