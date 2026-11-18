# Architecture Decision Records

Lightweight ADRs. Status is one of **Accepted**, **Provisional** (works now, needs
confirmation) or **Open** (not decided). Add a new record instead of rewriting an old one
when a decision changes.

---

## ADR-001 — Next.js as the unified application framework

- **Status**: Accepted (2026-10-11)
- **Context**: TechBash needs pages, a small backend and server-side validation. A second
  backend service would double deployment and typing work.
- **Decision**: Next.js with the App Router serves both frontend and backend. Pages are
  Server Components. Mutations that come from our own UI use Server Actions. Route
  Handlers are used for endpoints that other clients call (`/api/health` today).
- **Consequences**: One deployment and shared types. No Express or FastAPI. Public REST
  endpoints are added only when a non-browser client needs them.

## ADR-002 — Neon PostgreSQL as the database

- **Status**: Accepted (2026-10-11). Not yet connected: no connection string has been
  configured and no migration has been applied to a real database.
- **Context**: Quizzes, questions, options and attempts are relational. Hosting is
  expected to be serverless.
- **Decision**: Neon Serverless PostgreSQL, reached through the `@neondatabase/serverless`
  HTTP driver.
- **Consequences**: No connection pool to manage in serverless functions. The HTTP driver
  does not support interactive transactions; if a later feature needs one, switch that
  code path to the Neon WebSocket driver (`drizzle-orm/neon-serverless`).

## ADR-003 — Drizzle ORM

- **Status**: Accepted (2026-10-11)
- **Context**: We want typed queries and reviewable SQL migrations without a heavy runtime.
- **Decision**: Drizzle ORM for queries and `drizzle-kit` for migrations. The schema lives
  in `lib/db/schema.ts`; generated SQL lives in `drizzle/` and is committed.
- **Consequences**: Schema changes go through `pnpm db:generate` and are reviewed as SQL.
  `drizzle-kit push` is not used against shared databases.

## ADR-004 — Tailwind CSS and a custom ASCII design system

- **Status**: Accepted (2026-10-11). Palette is **Provisional**.
- **Context**: The ASCII look is the product identity. Component libraries bring rounded,
  shadowed defaults that fight it.
- **Decision**: Tailwind CSS v4 with tokens declared in `app/globals.css` (`@theme`).
  A handful of custom utilities draw ASCII details. UI components are written by hand in
  `components/ui/`. shadcn/ui is not installed.
- **Consequences**: No Radix, `class-variance-authority` or `tailwind-merge`. If a complex
  accessible widget is needed later (dialog, combobox), add that single shadcn/Radix
  component and restyle it rather than building it from scratch.
- **Needs confirmation**: green primary with amber secondary was chosen from the three
  accents the brief offered (green, amber, cyan).

## ADR-005 — Demo quiz is local data, scored on the server

- **Status**: Superseded by ADR-011 (2026-10-22). The demo quiz was removed.
- **Context**: The scaffold needs a working quiz before the database-backed catalog
  exists. A purely client-side quiz would ship the answer key to the browser.
- **Decision**: Demo questions and their answers live in `lib/quiz/demo-quiz.ts`, a
  `server-only` module. The page passes questions without answer keys to the client. The
  `submitDemoQuiz` Server Action validates the submission and returns the score and a
  review.
- **Consequences**: The demo proves the real flow. It is still a demo: no attempt is
  stored, there is no identity and nothing stops repeat submissions, so it is not suitable
  for assessments. Phase 2 and 3 replace the data source, not the flow.

## ADR-006 — Contact form stores to the database or says it did nothing

- **Status**: Provisional (2026-10-11)
- **Context**: No email provider was requested. A form that shows "sent" without sending
  is dishonest.
- **Decision**: `submitContact` validates with Zod. If `DATABASE_URL` is set it inserts a
  row into `contact_submissions` and reports that the message was stored. If not, it
  reports demo mode and that nothing was stored or sent.
- **Consequences**: Nobody is notified of new messages; someone has to read the table.
  There is no rate limiting.
- **Needs confirmation**: whether messages should be emailed, and to whom.

## ADR-007 — Node built-in test runner

- **Status**: Accepted (2026-10-11)
- **Context**: Only two pure modules need tests now (quiz scoring, contact validation).
- **Decision**: `node --test` with Node's native TypeScript type stripping. Requires
  Node 22.18 or newer.
- **Consequences**: No test dependency. Test files import with explicit `.ts` extensions
  and relative paths, and cannot import modules that use the `@/` alias or `server-only`.
  Adopt Vitest (and Playwright for end-to-end) when component or route tests are needed.

## ADR-008 — User accounts and authentication

- **Status**: Superseded by ADR-010 (2026-10-22)
- **Context**: Progress tracking needs identity. The brief forbids a homemade
  authentication system and external providers at this stage.
- **Decision**: None. `users` and `quiz_attempts` are designed in `DATABASE.md` but not
  created.
- **To decide**: whether accounts are needed at all, and which library or provider.

## ADR-009 — Hosting target

- **Status**: Superseded by ADR-014 (2026-10-22)
- **Context**: The code assumes a host that runs Next.js with serverless functions.
- **Decision**: None. Nothing in the scaffold is host-specific.

## ADR-010 — Better Auth, with a roster-checked participant sign-in

- **Status**: Accepted (2026-10-22)
- **Context**: The event needs an admin login and a participant login by full name and
  USN only. The brief names Better Auth. A homemade session system is forbidden.
- **Decision**: Better Auth 1.7 with the Drizzle adapter. Admins use email and password
  (sign-up disabled; accounts come from `scripts/create-admin.ts`). Participants sign in
  through a small Better Auth plugin that checks the admin-approved roster, creates the
  user on first login, ends the user's other sessions and lets Better Auth create the
  session and signed cookie. The HTTP handler is not mounted; Server Actions call
  `auth.api` with `nextCookies()`. Sessions last 12 hours with no refresh and no cookie
  cache.
- **Consequences**: No passwords for participants, so knowing a name and USN is enough to
  log in. Accepted for an on-site event because of the roster, single-session rule,
  per-round keys handed out at the venue, and throttling. Better Auth's own rate limiter
  only covers its HTTP handler, so throttling lives in our actions (ADR-013).

## ADR-011 — Rounds, questions and answers in the database, scored on write

- **Status**: Accepted (2026-10-22)
- **Context**: Three fixed rounds with admin-managed questions; quiz, treasure hunt (one
  clue at a time) and bug hunt (code snippets).
- **Decision**: One question model for all rounds: `single_choice` or `short_text`, an
  optional code snippet, points. Rounds can be `sequential`. Each answer is evaluated
  when saved and the result stored; scores are sums. Editing an answer key re-scores
  stored answers. Time limits are fixed per attempt at unlock and enforced on the server.
- **Consequences**: Results are cheap to compute and exportable. Multiple-answer questions
  are not supported.

## ADR-012 — Access keys stored as HMACs

- **Status**: Accepted (2026-10-22)
- **Decision**: Keys are normalized (case, spaces, dashes ignored) and stored as
  HMAC-SHA256 keyed with `BETTER_AUTH_SECRET`, plus a two-character hint. The admin sees
  the key once and can rotate it. Generated keys are 6 digits (100000 to 999999, changed
  2026-11-18 so they are easy to announce); custom keys may still use 6 to 64 letters,
  digits, spaces or dashes.
- **Consequences**: A database leak does not reveal keys. Rotating the secret invalidates
  every key. A 6-digit key has 900,000 values; the per-participant throttle (8 wrong keys
  per 10 minutes) is what keeps guessing impractical.

## ADR-013 — Database-backed throttling

- **Status**: Accepted (2026-10-22)
- **Context**: Name+USN login and short access keys need brute-force protection. Redis is
  ruled out.
- **Decision**: Failures are rows in `throttle_events`, counted in a sliding window per
  bucket. Per-account limits are tight; per-IP limits are loose because a venue shares one
  public IP.
- **Consequences**: One extra query per attempt. Adequate for one event's traffic.

## ADR-014 — Vercel hosting and Vercel Blob for photos

- **Status**: Accepted (2026-10-22). Not yet deployed.
- **Decision**: Deploy on Vercel. Team and faculty photos upload through a Server Action
  to Vercel Blob (`@vercel/blob`), type-checked from the file bytes, max 2 MB. Server
  Action body limit raised to 3 MB.
- **Consequences**: One new dependency and one environment variable. Without the token,
  the site works and the photo field is disabled.

## ADR-015 — Charts without a chart library

- **Status**: Accepted (2026-10-22)
- **Decision**: Dashboard charts are a small client component of horizontal bars drawn
  with design tokens, with dataset tabs and a hover/focus readout.
- **Consequences**: Charts match the ASCII identity, stay accessible and add no
  dependency. Only bar charts exist.

## ADR-016 — Qualification as a stored snapshot of the previous round's top N

- **Status**: Accepted (2026-11-18)
- **Context**: The number of registrations is unknown until the event, so the number who
  advance must be chosen on the day.
- **Decision**: An admin enters N on round 2 or 3 once the previous round is closed. The
  previous round is ranked on its own (score, time taken, submission time) and places
  1..N are written to `round_qualifiers`; a tie on place N advances everyone sharing it.
  `rounds.qualifier_limit` holds N; null keeps the round open to all. Unlock, answer saves
  and the round page check membership.
- **Consequences**: The list does not move after selection, even if answers are re-scored;
  selecting again replaces it. Overall ranking and winners still sum every round.

## ADR-017 — Question bank kept out of Git

- **Status**: Accepted (2026-11-18)
- **Context**: Anyone with repository access could read answer keys committed in a seed
  migration.
- **Decision**: Questions live in a JSON file under the gitignored `private/` folder.
  `pnpm questions:import` validates it with the same `questionSchema` as the admin form and
  writes each round in one batch. It refuses rounds that already have questions unless
  `--replace`, and refuses `--replace` once a round is out of Draft or has attempts. The
  access-key sheet (`private/access-keys.xlsx`) and a readable answer-key sheet
  (`private/question-bank.xlsx`, generated from the JSON) are kept there too.
- **Consequences**: The bank must be shared and backed up outside Git by the tech team.
  `lib/validations/rounds.ts` imports constants by relative path so the script can use it.

## ADR-018 — Admins manage admins in the panel

- **Status**: Accepted (2026-11-18)
- **Decision**: The Admins page adds an admin with a name, email and a password the adding
  admin types (no email service exists). `auth_users.added_by` records who added them.
  Admins can set a new password for, or remove, other panel-added admins. Admins created
  with `pnpm admin:create` (null `added_by`) and the signed-in admin's own account cannot
  be changed from the panel.
- **Consequences**: The terminal-created owner cannot be locked out by another admin. The
  password travels from admin to admin by hand.
