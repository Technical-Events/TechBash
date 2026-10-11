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

- **Status**: Accepted (2026-10-11)
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

- **Status**: Open
- **Context**: Progress tracking needs identity. The brief forbids a homemade
  authentication system and external providers at this stage.
- **Decision**: None. `users` and `quiz_attempts` are designed in `DATABASE.md` but not
  created.
- **To decide**: whether accounts are needed at all, and which library or provider.

## ADR-009 — Hosting target

- **Status**: Open
- **Context**: The code assumes a host that runs Next.js with serverless functions.
- **Decision**: None. Nothing in the scaffold is host-specific.
