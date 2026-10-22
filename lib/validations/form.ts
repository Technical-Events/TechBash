import type { z } from "zod";

/** Result of an admin or participant form Server Action. */
export type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; secret?: string }
  | { status: "error"; message: string; issues?: string[] };

export const idleState: ActionState = { status: "idle" };

/** "durationMinutes" -> "Duration minutes". */
function humanize(path: PropertyKey[]): string {
  const words = path
    .filter((part) => typeof part === "string")
    .join(" ")
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** First message per field, as `Field: message` lines for a form summary. */
export function issuesOf(error: z.ZodError): string[] {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const issue of error.issues) {
    const field = humanize(issue.path);
    if (seen.has(field)) continue;
    seen.add(field);
    lines.push(field ? `${field}: ${issue.message}` : issue.message);
  }
  return lines;
}

export function invalid(error: z.ZodError): ActionState {
  return {
    status: "error",
    message: "Fix the highlighted problems and try again.",
    issues: issuesOf(error),
  };
}

/** Reads a checkbox: present means on. */
export function checkbox(formData: FormData, name: string): boolean {
  return formData.get(name) !== null;
}
