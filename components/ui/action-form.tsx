"use client";

import {
  type ReactNode,
  startTransition,
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { type ActionState, idleState } from "@/lib/validations/form";
import { cn } from "@/lib/utils";
import { Button } from "./button";

type ActionFormProps = {
  /** Server Action with the `useActionState` signature. */
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
  pendingLabel?: string;
  variant?: "primary" | "secondary" | "danger";
  /** Asks for a second click before submitting (destructive actions). */
  confirmLabel?: string;
  /** Clears the fields after a successful submit. */
  resetOnSuccess?: boolean;
  className?: string;
  /** Lay fields and button out in one row (small inline forms). */
  inline?: boolean;
  children?: ReactNode;
};

/**
 * Form wrapper for Server Actions: pending state, a live result region,
 * validation issues and a one-time secret (new access keys).
 */
export function ActionForm({
  action,
  submitLabel,
  pendingLabel = "... Working",
  variant = "primary",
  confirmLabel,
  resetOnSuccess,
  className,
  inline,
  children,
}: ActionFormProps) {
  const [state, formAction, pending] = useActionState(action, idleState);
  const [armed, setArmed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success" && resetOnSuccess) formRef.current?.reset();
  }, [state, resetOnSuccess]);

  return (
    <form
      ref={formRef}
      action={formAction}
      onSubmit={(event) => {
        // Submit by hand: React resets uncontrolled fields after a form
        // action, which would wipe input when the server rejects it.
        event.preventDefault();
        if (confirmLabel && !armed) {
          setArmed(true);
          return;
        }
        setArmed(false);
        const formData = new FormData(event.currentTarget);
        startTransition(() => formAction(formData));
      }}
      className={cn(
        inline ? "flex flex-wrap items-end gap-3" : "space-y-5",
        className,
      )}
    >
      {children}
      <div
        className={cn("flex flex-wrap items-center gap-3", !inline && "pt-1")}
      >
        <Button
          type="submit"
          variant={armed ? "danger" : variant}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? pendingLabel : armed ? confirmLabel : submitLabel}
        </Button>
        {armed && !pending && (
          <Button variant="secondary" onClick={() => setArmed(false)}>
            Cancel
          </Button>
        )}
      </div>
      <div aria-live="polite" className="empty:hidden">
        {state.status === "success" && (
          <div className="border border-accent px-3 py-2 text-sm">
            <p className="text-accent">OK {state.message}</p>
            {state.secret && (
              <p className="mt-2">
                <span className="text-muted"># Shown once. Copy it now: </span>
                <code className="text-base font-bold tracking-[0.12em] text-amber select-all">
                  {state.secret}
                </code>
              </p>
            )}
          </div>
        )}
        {state.status === "error" && (
          <div
            role="alert"
            className="border border-danger px-3 py-2 text-sm text-danger"
          >
            <p>! {state.message}</p>
            {state.issues && state.issues.length > 0 && (
              <ul className="mt-1 space-y-0.5">
                {state.issues.map((issue) => (
                  <li key={issue}>&gt; {issue}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </form>
  );
}
