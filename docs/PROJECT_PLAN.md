# TechBash — Project Plan

Status: event platform built (Phase 2). Last updated 2026-10-22.

> Sections 3 to 11 describe the original scaffold and are kept for history. The current
> scope is in section 13; the architecture is in `ARCHITECTURE.md`.

## 1. Problem statement and goals

Most quiz sites look like generic SaaS dashboards. TechBash is a quiz platform for
technical topics whose whole interface is built on an ASCII and terminal visual language:
monospaced type, box borders, prompts and status lines.

Goals for the project:

1. Let people take short technical quizzes and see their results.
2. Give the site a recognizable ASCII identity that stays readable and accessible.
3. Keep one deployable application (Next.js) with a PostgreSQL database (Neon).

Goal for this pass: a documented, working scaffold that later phases can extend without
restructuring.

## 2. Target audience

- Students and developers who want to check their technical knowledge.
- Organizers of technical events who need a quiz round (the repository belongs to a
  technical-events organization). This use is an assumption and is not confirmed.

## 3. Scope of the initial scaffold

- Next.js App Router project with TypeScript, Tailwind CSS, ESLint and Prettier.
- ASCII design system: tokens, utilities and five reusable UI components.
- Pages: `/` (Home), `/test` (Test), `/test/demo` (demo quiz), `/about` (About),
  `/contact` (Contact Us).
- Navbar with exactly four items: Home, Test, About, Contact Us. Footer with the same links.
- A five-question demo quiz scored on the server from local sample data.
- Contact form with client and server validation. It stores the message only when a
  database is configured, and says so plainly when it is not.
- `GET /api/health`.
- Drizzle schema and a generated SQL migration for `quizzes`, `questions`,
  `answer_options` and `contact_submissions`.
- Documentation: this file, `ARCHITECTURE.md`, `DATABASE.md`, `DESIGN_SYSTEM.md`,
  `ROADMAP.md`, `DECISIONS.md`, `API.md`, plus `README.md` and `AGENTS.md` at the root.

## 4. Intentionally excluded

| Excluded                                 | Reason                                                                                   |
| ---------------------------------------- | ---------------------------------------------------------------------------------------- |
| User accounts, login, sessions           | No requirement yet. No homemade authentication.                                          |
| `users` and `quiz_attempts` tables       | Depend on the account decision. Documented as planned.                                   |
| Quiz catalog read from the database      | Phase 2. The demo uses local data.                                                       |
| REST endpoints for quizzes and contact   | Server Actions cover the scaffold. Contracts are documented in `API.md` as planned.      |
| Email delivery for the contact form      | No provider or configuration was requested.                                              |
| Rate limiting and spam protection        | Needs infrastructure (or a provider) that is out of scope. Listed as a known limitation. |
| Leaderboard, dashboard, admin UI, timers | Not in the confirmed scope.                                                              |
| Redis, microservices, a separate backend | Explicitly ruled out.                                                                    |
| CI and deployment                        | Not requested for this pass.                                                             |

## 5. Functional requirements

| ID  | Requirement                                                                            |
| --- | -------------------------------------------------------------------------------------- |
| F1  | The primary navbar shows Home, Test, About, Contact Us and nothing else.               |
| F2  | Home introduces TechBash and links to `/test` (primary) and `/about` (secondary).      |
| F3  | Home shows a preview of the quiz experience and the kinds of quizzes planned.          |
| F4  | Test explains how quizzes work and lists sample categories with difficulty labels.     |
| F5  | Test offers one clearly marked demo quiz that can be started.                          |
| F6  | The demo quiz supports answer selection, submission and a results view.                |
| F7  | Correct answers are not sent to the browser before the quiz is submitted.              |
| F8  | About explains what TechBash is, why it exists and its ASCII identity.                 |
| F9  | Contact has name, email, subject and message fields with accessible validation errors. |
| F10 | Contact never reports a message as sent or stored unless it was stored.                |
| F11 | `GET /api/health` returns structured JSON without infrastructure details.              |
| F12 | The application runs without `DATABASE_URL` (demo mode).                               |

## 6. Non-functional requirements

- **Accessibility**: keyboard reachable controls, visible focus, labelled form fields,
  text contrast of at least 4.5:1, decorative ASCII art hidden from assistive technology,
  motion disabled under `prefers-reduced-motion`.
- **Responsive**: usable from 320px wide. Mobile layouts are designed, not shrunk.
- **Security**: database access only on the server, secrets only in environment variables,
  all external input validated with Zod on the server.
- **Maintainability**: Server Components by default, small feature folders, no
  abstractions without a second user.
- **Performance**: static rendering for every page that has no per-request data.

## 7. Design direction

Dark terminal surface, phosphor green as the primary accent, amber as the secondary
accent. One monospaced typeface. Square corners. Panels with corner glyphs and bracketed
title bars. Buttons written as `[ LABEL ]`. Section headings written as shell prompts.
Details are in `DESIGN_SYSTEM.md`.

## 8. Technical decisions

Summarized here; each has a record in `DECISIONS.md`.

| Decision                         | Rationale                                                                                     |
| -------------------------------- | --------------------------------------------------------------------------------------------- |
| Next.js for frontend and backend | One codebase, one deployment, Server Components and Server Actions remove most API plumbing.  |
| Neon PostgreSQL                  | Serverless Postgres over HTTP fits serverless Next.js hosting; relational data suits quizzes. |
| Drizzle ORM                      | Typed schema in TypeScript, SQL migrations in the repository, small runtime.                  |
| Tailwind CSS with custom tokens  | Tokens in one CSS file; utilities for layout; a few custom ASCII utilities.                   |
| No shadcn/ui                     | Five small components do not justify Radix and helper dependencies.                           |
| Server-scored demo quiz          | Keeps answer keys off the client and matches the future database flow.                        |
| Node built-in test runner        | No test dependency for two small pure modules.                                                |

## 9. Initial architecture

Browser → Next.js (Server Components render pages; Client Components handle the navbar
toggle, the quiz runner and the contact form) → Server Actions and Route Handlers →
Drizzle → Neon. See `ARCHITECTURE.md` for diagrams and boundaries.

## 10. Development phases

1. Foundation and scaffold (this pass).
2. Database-backed quiz catalog.
3. Complete quiz-taking and scoring workflow.
4. User accounts and progress tracking (unconfirmed).
5. Administration and quiz creation (unconfirmed).
6. Testing, security review, performance and deployment.

`ROADMAP.md` lists goals, deliverables, dependencies and completion criteria per phase.

## 11. Milestones and acceptance criteria (Phase 1)

| Milestone        | Acceptance criteria                                                                                       |
| ---------------- | --------------------------------------------------------------------------------------------------------- |
| M1 Documentation | All nine Markdown files exist and describe the real codebase.                                             |
| M2 Foundation    | `pnpm dev` starts; layout, navbar and footer render on every page.                                        |
| M3 Pages         | `/`, `/test`, `/test/demo`, `/about`, `/contact` return 200 and share the design system.                  |
| M4 Demo quiz     | A user can answer five questions, submit and read a scored review. The page payload holds no answer key.  |
| M5 Contact       | Empty submit shows field errors; valid submit shows the demo-mode or stored message that matches reality. |
| M6 Backend       | `/api/health` returns `{ status, service, timestamp }`. Schema compiles and a migration is generated.     |
| M7 Quality       | `pnpm typecheck`, `pnpm lint`, `pnpm test` and `pnpm build` pass. Met on 2026-10-11.                      |

## 12. Risks, assumptions and open decisions

**Risks**

- The contact form accepts anonymous input. Without rate limiting, a configured database
  can be filled with spam. Mitigation now: strict length limits. Proper fix: Phase 6.
- ASCII art breaks if the font lacks a glyph or wraps. Mitigation: one bundled monospaced
  font, `white-space: pre`, and scaled or alternate art on narrow screens.
- Fast-moving dependencies (Next.js 16, Tailwind 4). Mitigation: keep the versions the
  official generator pins and read the bundled Next.js docs before changing framework code.

**Assumptions**

- English only.
- Quizzes are multiple choice with one correct answer until told otherwise.
- Hosting will be a platform that runs Next.js with serverless functions (for example
  Vercel). Not confirmed.

**Open decisions**

- Are user accounts required, and with which provider?
- Should contact messages also be emailed to someone?
- Who creates quizzes: developers through seed files, or admins through a UI?
- Is the green and amber palette final?
- Do quizzes need timers, negative marking or multiple-answer questions?

## 13. Event platform scope (2026-10-22)

Requested by the organizers:

| ID  | Requirement                                                                                                                | Where                                   |
| --- | -------------------------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| E1  | Sections Home, Test, Contact Us in the navbar; user panel and admin panel.                                                 | `lib/site.ts`, `/test`, `/admin`        |
| E2  | Home: event details and introduction, team names and photos, faculty (Devika Ma'am, Anusha Ma'am) with photos and details. | `/`, admin Content                      |
| E3  | Participants log in with full name and USN before the test.                                                                | `/test`, ADR-010                        |
| E4  | Three named rounds, each unlocked by its own access key.                                                                   | `/test`, admin Rounds                   |
| E5  | Track scores, completion status and submission times.                                                                      | `round_attempts`, `attempt_answers`     |
| E6  | Admin: manage rounds, questions and answers.                                                                               | admin Rounds                            |
| E7  | Admin: create, update and revoke access keys.                                                                              | admin Rounds                            |
| E8  | Admin: participant details (names, USNs).                                                                                  | admin Participants                      |
| E9  | Admin: completion times and first finisher.                                                                                | admin Dashboard, Results                |
| E10 | Automatic winner list with tie-break rules.                                                                                | admin Results, `lib/results/ranking.ts` |
| E11 | Admin: all test data, analytics and statistics, exports.                                                                   | Dashboard, participant detail, exports  |
| E12 | Admin: event information and website content.                                                                              | admin Content                           |
| E13 | Contact Us: technical lead S. Mohammed Sharwan (sharwan@ajiet.edu.in), faculty with photos, profiles and contact details.  | `/contact`                              |
| E14 | Next.js, Neon, Better Auth, Vercel. Responsive. Server-side key validation.                                                | whole codebase                          |

Decisions taken with the organizers: roster-approved USN login; per-question types
(choice or text, optional code); photos uploaded by admins (Vercel Blob); ASCII design
identity kept; About page removed (Home carries the event introduction).
