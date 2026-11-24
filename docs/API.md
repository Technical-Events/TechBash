# API

Two Route Handlers and a set of Server Actions. Server Actions are called by our own
components and are **not** a public HTTP contract; they are listed because they are the
backend surface. The Better Auth HTTP handler is deliberately not mounted.

Common rules for every Server Action:

- Input validated with Zod (`lib/validations/`).
- Protected actions re-check the session themselves (`requireAdmin*` /
  `requireParticipant`); without one they redirect to the matching login page.
- Expected failures return a typed result; nothing is thrown to the client.
- Unexpected errors are logged on the server and reported generically.

Form actions return `ActionState` (`lib/validations/form.ts`):

```ts
type ActionState =
  | { status: "idle" }
  | { status: "success"; message: string; secret?: string } // secret: new access key, shown once
  | { status: "error"; message: string; issues?: string[] };
```

## Route Handlers

### `GET /api/health`

Liveness: `200 { "status": "ok", "service": "techbash", "timestamp" }`, `no-store`.
Reports nothing about the database or environment.

### `GET /admin/export/[kind]`

- `kind`: `results`, `participants` or `answers`.
- Auth: admin session cookie. Otherwise `401 { "error": { "code": "unauthorized", ... } }`.
- `200 text/csv; charset=utf-8` with a BOM, `Content-Disposition: attachment`,
  `no-store`. Cells starting with `= + - @` get a leading apostrophe.
- `404` unknown kind, `503` no database, `500` on failure (logged).

| Kind           | Columns                                                                                                                                                                                                                                                                                       |
| -------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `results`      | rank (current round), ranked_round, usn, full_name, per round: score, status, started_at, submitted_at; score, time_taken, time_taken_seconds, submitted_at, first_to_submit (current round). Participants who have not unlocked the current round come last, unranked, with those five blank |
| `participants` | usn, full_name, registered_at, last_login_at                                                                                                                                                                                                                                                  |
| `answers`      | usn, full_name, round, question_position, question, answer (option text), correct, points, tries, answered_at                                                                                                                                                                                 |

## Participant actions (`app/test/actions.ts`)

| Action             | Input                           | Result / effect                                               |
| ------------------ | ------------------------------- | ------------------------------------------------------------- |
| `loginParticipant` | FormData `fullName`, `usn`      | Redirect to `/test`, or `ActionState` error. Throttled.       |
| `logout`           | none                            | Ends the session, redirects to `/test`.                       |
| `unlockRound`      | FormData `round`, `key`         | Creates the attempt, redirects to `/test/round/n`. Throttled. |
| `saveAnswer`       | `{ round, questionId, answer }` | `SaveAnswerResult`                                            |
| `submitRound`      | round number                    | `{ ok: true }` or `{ ok: false, error }`. Idempotent.         |

```ts
type SaveAnswerResult =
  | { ok: true; savedAt: string; correct?: boolean; roundComplete?: boolean } // correct: sequential rounds only
  | { ok: false; error: string; expired?: boolean }; // expired: refresh the page
```

`saveAnswer` rejects: round not open, no attempt, already submitted, past deadline + 15 s
(and finalizes), unknown question, option not in the question, text over 300 characters,
in sequential rounds any question other than the current clue, and (when the round is
limited to the previous round's top N) a participant outside the selection. `unlockRound`
refuses such a participant too.

## Admin actions

All require an admin session.

| File                                        | Actions                                                                                                                                                                                                                                                                                                                                          |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `app/admin/login/actions.ts`                | `adminLogin` (throttled; non-admin accounts refused)                                                                                                                                                                                                                                                                                             |
| `app/admin/(panel)/actions.ts`              | `adminLogout`                                                                                                                                                                                                                                                                                                                                    |
| `app/admin/(panel)/rounds/actions.ts`       | `updateRound` (closing submits open attempts), `setQualifiers` (top N of the previous round, which must be closed; ties on place N included), `clearQualifiers`, `saveQuestion` (create or edit, re-scores), `deleteQuestion`, `moveQuestion`, `createAccessKey`, `rotateAccessKey`, `renameAccessKey`, `setAccessKeyRevoked`, `deleteAccessKey` |
| `app/admin/(panel)/participants/actions.ts` | `addParticipant`, `importParticipants` (all-or-nothing on format errors; existing USNs skipped), `updateParticipant`, `endParticipantSessions`, `resetAttempt`, `deleteParticipant`                                                                                                                                                              |
| `app/admin/(panel)/content/actions.ts`      | `updateEventInfo`, `savePerson` (optional photo upload), `deletePerson`                                                                                                                                                                                                                                                                          |
| `app/admin/(panel)/messages/actions.ts`     | `deleteMessage`                                                                                                                                                                                                                                                                                                                                  |
| `app/admin/(panel)/admins/actions.ts`       | `addAdmin` (name, email, password typed twice), `setAdminPassword` (ends their sessions), `removeAdmin`. The last two refuse the signed-in admin and admins created with `pnpm admin:create`.                                                                                                                                                    |

## Public action

`submitContact` (`app/contact/actions.ts`): unchanged. Stores the message when a database
is configured (`stored`), reports `demo` otherwise, and `throttled` after 10 stored
messages from one IP in an hour. No email.
