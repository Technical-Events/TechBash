/**
 * Roster helpers shared by the participant login and the admin import.
 * Pure functions: tests import this file directly.
 */

const USN_PATTERN = /^[A-Z0-9]{5,20}$/;

/** Uppercases a USN and drops spaces and dashes: "4jk 22-cs001" -> "4JK22CS001". */
export function normalizeUsn(value: string): string {
  return value
    .normalize("NFKC")
    .toUpperCase()
    .replace(/[\s-]+/g, "");
}

export function isValidUsn(usn: string): boolean {
  return USN_PATTERN.test(usn);
}

/** Trims and collapses inner whitespace. Keeps the original casing. */
export function normalizeName(value: string): string {
  return value.normalize("NFKC").trim().replace(/\s+/g, " ");
}

/** Names match ignoring case, extra spaces and dots ("S. Kumar" = "s kumar"). */
export function namesMatch(a: string, b: string): boolean {
  const key = (name: string) =>
    normalizeName(name.replace(/\./g, " ")).toLocaleLowerCase("en");
  return key(a) === key(b);
}

export type RosterEntry = { usn: string; fullName: string };
export type RosterParseResult = {
  entries: RosterEntry[];
  errors: { line: number; message: string }[];
};

export const MAX_ROSTER_IMPORT = 2000;

/**
 * Parses pasted roster text: one participant per line, `USN,Full Name`
 * (comma or tab separated). Blank lines and a header row are skipped.
 * Duplicate USNs keep the first occurrence and report the rest.
 */
export function parseRoster(text: string): RosterParseResult {
  const entries: RosterEntry[] = [];
  const errors: RosterParseResult["errors"] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = index + 1;
    if (!raw.trim()) return;
    const separator = raw.includes("\t") ? "\t" : ",";
    const at = raw.indexOf(separator);
    if (at === -1) {
      errors.push({ line, message: "Expected `USN,Full Name`." });
      return;
    }
    const usn = normalizeUsn(raw.slice(0, at).replace(/^"|"$/g, ""));
    const fullName = normalizeName(
      raw.slice(at + 1).replace(/^\s*"|"\s*$/g, ""),
    );
    if (index === 0 && usn === "USN") return;
    if (!isValidUsn(usn)) {
      errors.push({ line, message: `"${usn}" is not a valid USN.` });
      return;
    }
    if (fullName.length < 2 || fullName.length > 100) {
      errors.push({ line, message: "Name must be 2 to 100 characters." });
      return;
    }
    if (seen.has(usn)) {
      errors.push({ line, message: `${usn} appears more than once.` });
      return;
    }
    seen.add(usn);
    entries.push({ usn, fullName });
  });

  if (entries.length > MAX_ROSTER_IMPORT) {
    errors.push({
      line: 0,
      message: `Import at most ${MAX_ROSTER_IMPORT} participants at a time.`,
    });
  }
  return { entries, errors };
}
