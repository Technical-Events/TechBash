# Roadmap

Phases 1 to 3 and 6 follow from the confirmed brief. Phases 4 and 5 are **suggestions**
and need a decision before work starts. Items marked _(suggested)_ inside a confirmed
phase are optional.

## Phase 1 — Project foundation and scaffold

**Status**: done in this pass.

- **Goals**: documented architecture, ASCII design system, working pages, safe database
  foundation.
- **Deliverables**: Next.js project; `/`, `/test`, `/test/demo`, `/about`, `/contact`;
  navbar and footer; UI components; server-scored demo quiz; contact form with honest
  submission; `GET /api/health`; Drizzle schema and first migration; documentation set.
- **Dependencies**: none.
- **Completion criteria**: the Definition of Done in `PROJECT_PLAN.md` section 11;
  typecheck, lint, tests and production build pass.

## Phase 2 — Database-backed quiz catalog

**Status**: confirmed, not started.

- **Goals**: `/test` lists real quizzes from Neon.
- **Deliverables**:
  - Neon project connected, migrations applied.
  - Seed script with a few real quizzes.
  - `getPublishedQuizzes()` and `getQuizBySlug()` in `lib/db/queries/`.
  - `/test` reads from the database, with the current placeholders as the fallback when
    no database is configured.
  - `/test/[slug]` detail route.
  - _(suggested)_ `GET /api/quizzes` and `GET /api/quizzes/[slug]` if a non-browser
    client needs them.
- **Dependencies**: a Neon connection string; a decision on who writes quiz content.
- **Completion criteria**: a quiz inserted with status `published` appears on `/test`;
  `draft` quizzes do not; pages still render without `DATABASE_URL`.

## Phase 3 — Complete quiz-taking and scoring workflow

**Status**: confirmed, not started.

- **Goals**: take any published quiz and get a server-scored result.
- **Deliverables**:
  - `submitQuiz(slug, answers)` replacing `submitDemoQuiz`, reusing `scoreQuiz()`.
  - Results view shared with the demo.
  - _(suggested)_ `quiz_attempts` table so a result has a URL and can be revisited.
  - _(suggested)_ support for `multiple_choice` and `true_false` question types.
  - _(suggested)_ timers.
- **Dependencies**: Phase 2. For stored attempts: a decision on anonymous versus
  account-bound attempts.
- **Completion criteria**: answer keys never appear in a client payload before
  submission; scoring is covered by tests for every supported question type.

## Phase 4 — User accounts and progress tracking (suggested)

**Status**: not confirmed. See ADR-008.

- **Goals**: a user can sign in and see past attempts.
- **Deliverables**: an authentication library or provider (not homemade); `users` table;
  attempts linked to users; a progress view.
- **Dependencies**: Phase 3 with stored attempts; a decision on the provider; a privacy
  position on stored personal data.
- **Completion criteria**: no credentials stored by our own code; attempts are visible
  only to their owner.

## Phase 5 — Administration and quiz creation (suggested)

**Status**: not confirmed.

- **Goals**: create and publish quizzes without editing seed files.
- **Deliverables**: protected admin area; quiz, question and option editing; draft and
  publish flow; a view of contact submissions.
- **Dependencies**: Phase 4 (roles).
- **Completion criteria**: only authorized users reach admin routes and actions; every
  admin mutation is validated on the server.

## Phase 6 — Testing, security review, performance and deployment

**Status**: confirmed. Parts can run alongside earlier phases.

- **Goals**: safe to put in front of the public.
- **Deliverables**:
  - Component and end-to-end tests (Vitest and Playwright) for the quiz and contact flows.
  - Rate limiting and spam protection on contact and quiz submission.
  - Security headers and a dependency audit.
  - Accessibility audit of every page.
  - CI running typecheck, lint, tests and build.
  - Deployment with separate development and production databases.
  - Custom 404 and error pages in the ASCII style.
- **Dependencies**: a hosting decision (ADR-009).
- **Completion criteria**: CI is green on the main branch; no critical findings open from
  the security and accessibility reviews; production deploy documented in `README.md`.
