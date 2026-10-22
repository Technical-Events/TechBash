"use client";

import { Button, ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";

/** Unexpected errors. Details stay in the server log; only the digest shows. */
export default function ErrorPage({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  return (
    <Panel title="error">
      <h1 className="text-2xl text-danger">! Something went wrong</h1>
      <p className="mt-3 max-w-[60ch] text-muted">
        The page could not be loaded. Your saved answers are safe on the server.
        Try again, or tell an organizer if it keeps happening.
      </p>
      {error.digest && (
        <p className="mt-3 text-sm text-muted"># ref: {error.digest}</p>
      )}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <Button onClick={() => retry()}>Try again</Button>
        <ButtonLink href="/" variant="secondary">
          Home
        </ButtonLink>
      </div>
    </Panel>
  );
}
