import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Shared = {
  /** Defaults to `field-<name>`. Set it when a page repeats a form. */
  id?: string;
  label: string;
  name: string;
  error?: string;
  hint?: string;
  className?: string;
};

type InputFieldProps = Shared & {
  multiline?: false;
  options?: undefined;
} & Omit<ComponentProps<"input">, "name" | "id" | "className">;

type TextareaFieldProps = Shared & {
  /** Renders a textarea instead of an input. */
  multiline: true;
  options?: undefined;
} & Omit<ComponentProps<"textarea">, "name" | "id" | "className">;

type SelectFieldProps = Shared & {
  multiline?: false;
  /** Renders a select with these options. */
  options: readonly { value: string; label: string }[];
} & Omit<ComponentProps<"select">, "name" | "id" | "className">;

type FieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

const control =
  "w-full border border-line bg-surface px-3 py-2.5 text-fg placeholder:text-muted/60 aria-invalid:border-danger";

function Label({
  htmlFor,
  children,
}: {
  htmlFor: string;
  children: ReactNode;
}) {
  return (
    <label
      htmlFor={htmlFor}
      className="mb-1.5 block text-sm font-bold tracking-[0.08em] uppercase"
    >
      <span aria-hidden="true" className="text-accent">
        &gt;{" "}
      </span>
      {children}
    </label>
  );
}

/** The props that belong on the control element itself. */
function controlProps<
  T extends Shared & { multiline?: boolean; options?: unknown },
>(props: T) {
  const rest: Record<string, unknown> = { ...props };
  for (const key of [
    "label",
    "name",
    "error",
    "hint",
    "className",
    "multiline",
    "options",
  ]) {
    delete rest[key];
  }
  return rest as Omit<T, keyof Shared | "multiline" | "options">;
}

export function Field(props: FieldProps) {
  const { label, name, error, hint, className } = props;
  const id = props.id ?? `field-${name}`;
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const shared = {
    id,
    name,
    "aria-invalid": error ? true : undefined,
    "aria-describedby":
      [hintId, errorId].filter(Boolean).join(" ") || undefined,
  };

  let controlElement: ReactNode;
  if (props.multiline) {
    controlElement = (
      <textarea
        rows={6}
        {...controlProps(props)}
        {...shared}
        className={cn(control, "resize-y")}
      />
    );
  } else if (props.options) {
    controlElement = (
      <select
        {...controlProps(props)}
        {...shared}
        className={cn(control, "min-h-11")}
      >
        {props.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    );
  } else {
    controlElement = (
      <input {...controlProps(props)} {...shared} className={control} />
    );
  }

  return (
    <div className={className}>
      <Label htmlFor={id}>{label}</Label>
      {controlElement}
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

/** Native checkbox drawn as `[x]` / `[ ]`. */
export function Checkbox({
  label,
  name,
  hint,
  defaultChecked,
  value,
}: {
  label: string;
  name: string;
  hint?: string;
  defaultChecked?: boolean;
  value?: string;
}) {
  return (
    <label className="group flex min-h-11 cursor-pointer items-start gap-3 py-2 has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent">
      <input
        type="checkbox"
        name={name}
        value={value}
        defaultChecked={defaultChecked}
        className="peer sr-only"
      />
      <span
        aria-hidden="true"
        className="shrink-0 text-muted peer-checked:hidden"
      >
        [ ]
      </span>
      <span
        aria-hidden="true"
        className="hidden shrink-0 text-accent peer-checked:inline"
      >
        [x]
      </span>
      <span>
        <span className="text-sm font-bold tracking-[0.08em] uppercase">
          {label}
        </span>
        {hint && <span className="block text-sm text-muted"># {hint}</span>}
      </span>
    </label>
  );
}
