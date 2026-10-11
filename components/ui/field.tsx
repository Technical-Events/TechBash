import type { ComponentProps } from "react";
import { cn } from "@/lib/utils";

type FieldProps = {
  label: string;
  name: string;
  error?: string;
  hint?: string;
  /** Renders a textarea instead of an input. */
  multiline?: boolean;
} & Omit<ComponentProps<"input">, "name" | "id">;

const control =
  "w-full border border-line bg-surface px-3 py-2.5 text-fg placeholder:text-muted/60 aria-invalid:border-danger";

export function Field({
  label,
  name,
  error,
  hint,
  multiline,
  className,
  ...props
}: FieldProps) {
  const id = `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const shared = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby":
      [hintId, errorId].filter(Boolean).join(" ") || undefined,
  };

  return (
    <div className={className}>
      <label
        htmlFor={id}
        className="mb-1.5 block text-sm font-bold tracking-[0.08em] uppercase"
      >
        <span aria-hidden="true" className="text-accent">
          &gt;{" "}
        </span>
        {label}
      </label>
      {multiline ? (
        <textarea
          {...shared}
          rows={6}
          required={props.required}
          maxLength={props.maxLength}
          placeholder={props.placeholder}
          className={cn(control, "resize-y")}
        />
      ) : (
        <input {...shared} {...props} className={control} />
      )}
      {hint && (
        <p id={hintId} className="mt-1.5 text-sm text-muted">
          # {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="mt-1.5 text-sm text-danger">
          ! {error}
        </p>
      )}
    </div>
  );
}
