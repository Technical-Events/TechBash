/** Value lists shared by the database enums and the application code. */

export const userRoles = ["admin", "participant"] as const;
export type UserRole = (typeof userRoles)[number];

export const roundStatuses = ["draft", "open", "closed"] as const;
export type RoundStatus = (typeof roundStatuses)[number];

export const questionTypes = ["single_choice", "short_text"] as const;
export type QuestionType = (typeof questionTypes)[number];

export const personKinds = ["faculty", "team"] as const;
export type PersonKind = (typeof personKinds)[number];

/** The event always has exactly these three rounds. */
export const roundNumbers = [1, 2, 3] as const;
export type RoundNumber = (typeof roundNumbers)[number];
