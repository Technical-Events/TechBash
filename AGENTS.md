<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# TechBash — instructions for coding agents

## Purpose

TechBash is a technical event platform: participants log in with full name and USN and
take three access-key-gated rounds (Quiz, Tech Treasure Hunt, Bug Hunt); admins manage
rounds, questions, keys, the roster, site content and results. Its identity is an ASCII,
terminal-style interface. It is one Next.js application backed by Neon PostgreSQL, with
Better Auth for sessions, deployed to Vercel. Read `README.md` for status and
`docs/ROADMAP.md` for what is confirmed versus only suggested.

## Before you change anything

1. Read the files you are about to touch and the components they use.
2. Read the matching doc: `docs/ARCHITECTURE.md`, `docs/DESIGN_SYSTEM.md`,
   `docs/DATABASE.md` or `docs/API.md`.
3. For framework APIs, read `node_modules/next/dist/docs/` first. Cache Components is
   enabled; older Next.js habits (`export const dynamic`, `revalidate`) do not apply.
4. Check `git status`. Do not overwrite work you did not make.

## Stack

Next.js 16 App Router, React 19, TypeScript, Tailwind CSS 4, Drizzle ORM, Neon
(`@neondatabase/serverless`), Better Auth, Vercel Blob (`@vercel/blob`), Zod 4, Lucide
React, pnpm. Tests use `node --test`.

Do not add: another backend framework, Redis, queues, another auth provider, an email
service, a state library, a chart library, shadcn/ui wholesale, or a CSS-in-JS library. A
new dependency needs a reason written in `docs/DECISIONS.md`.

## Folder structure

```text
app/                       routes; each route's Server Actions live in its own actions.ts
  page.tsx contact/          public pages (Home, Contact Us)
  test/                      participant login, round dashboard; test/round/[number]
  admin/login/               admin sign-in
  admin/(panel)/             admin pages behind requireAdmin(): dashboard, rounds,
                             participants, results, content, messages, admins
  admin/export/[kind]/       CSV exports (Route Handler)
  api/health/route.ts        liveness Route Handler
components/
  ui/                        design-system primitives (Button, Panel, Badge, Field,
                             Checkbox, ActionForm, Table, Stat, Loading, headings)
  layout/ home/ people/ test/ rounds/ admin/ contact/   feature components
lib/
  site.ts                    site name, nav items, event time zone
  auth/                      Better Auth instance, participant plugin, session DAL
  db/                        schema.ts, index.ts (getDb), queries/   (server-only)
  rounds/ participants/ results/ content/   pure logic (tests import these)
  security/                  access-key HMAC, throttling (server-only)
  validations/               Zod schemas and the ActionState type
scripts/create-admin.ts      creates or resets an admin
scripts/import-questions.ts  loads a question bank from private/ (gitignored) account
drizzle/                     SQL migrations (generated; 0003 is a custom seed)
tests/                       node:test unit tests
docs/                        project documentation
```

## Naming

- Files: `kebab-case.tsx`. Components: `PascalCase` named exports. No default exports
  except where Next.js requires one (`page.tsx`, `layout.tsx`).
- Database: `snake_case` tables and columns, `camelCase` fields in TypeScript.
- Server Actions: verb first (`submitContact`). Zod schemas: `somethingSchema`.
- Import with the `@/` alias. Exceptions: `lib/db/schema.ts`, `scripts/` and `tests/` use
  relative paths with `.ts` extensions, because `drizzle-kit` and Node's type stripping do
  not resolve the alias. Files they import (`lib/rounds/constants.ts`, the pure modules
  under `lib/`) must not use the alias either.

## Navigation

The primary navbar has exactly three items: Home, Test, Contact Us. They are defined once
in `lib/site.ts`. The footer adds an Admin link. Do not add items without an explicit
request. The admin panel has its own section nav (`components/admin/admin-nav.tsx`).

## Components

- Server Components by default. Add `"use client"` only for state, effects or browser
  APIs, and keep the client part as small as possible.
- Client Components today: `layout/nav-links.tsx`, `admin/admin-nav.tsx`,
  `admin/bar-chart.tsx`, `ui/action-form.tsx`, `ui/table-scroller.tsx`, `rounds/round-runner.tsx`,
  `contact/contact-form.tsx`, `app/error.tsx`.
- Keep pages thin; put sections in `components/<feature>/`.
- Reuse `components/ui/`. Add a variant to an existing component before creating a new one.
- No abstraction without a second caller.

## ASCII design system

Follow `docs/DESIGN_SYSTEM.md`. The rules that get broken most often:

- Colors come only from the tokens in `app/globals.css` (`bg`, `surface`, `line`, `fg`,
  `muted`, `accent`, `amber`, `danger`). Tailwind's default palette is disabled.
- One monospaced font. Square corners. No shadows, gradients, blur or rounded cards.
- Plain ASCII characters only. No Unicode box-drawing characters and no emoji: the bundled
  font subset lacks them.
- Buttons read `[ LABEL ]`, badges read `[LABEL]`, headings use a `$` or `#` prefix.
- Decorative ASCII is `aria-hidden` and has a real text equivalent.
- Every interactive element keeps a visible focus outline and works with the keyboard.
- Animation is limited to the cursor blink and color transitions, and both stop under
  `prefers-reduced-motion`.
- Check new UI at 320px and 1280px wide. No horizontal page scroll.

## TypeScript

- `strict` is on. No `any`; no `@ts-ignore` without a comment explaining why.
- Derive types from Zod schemas (`z.infer`) and Drizzle tables instead of repeating them.
- Shared quiz types live in `lib/quiz/types.ts`.
- Use erasable syntax only (no `enum`, no parameter properties) in code that tests import;
  Node runs those files with type stripping.

## Database

- Access the database only on the server, through `getDb()` from `@/lib/db`. It returns
  `null` when `DATABASE_URL` is unset; handle that case and keep the app usable.
- Never import `lib/db`, `lib/auth` or `lib/security` from a Client Component. They
  import `server-only`. (`import type` from them is fine.)
- Change the schema in `lib/db/schema.ts`, run `pnpm db:generate`, review the SQL, commit
  both. Never edit an applied migration. Never use `drizzle-kit push` on a shared database.
- Use Drizzle's query builders. No string-concatenated SQL.
- Update `docs/DATABASE.md` in the same change.

## Environment and secrets

- Secrets live in `.env.local` (ignored by Git) or the host's secret store.
- Do not read, print, log or commit `.env*` contents. `.env.example` holds names only.
- No `NEXT_PUBLIC_` variable may contain a secret.
- Add a variable to `.env.example`, `README.md` and `docs/ARCHITECTURE.md` when you
  introduce one.

## Validation and errors

- Validate every Server Action and Route Handler input with a Zod schema from
  `lib/validations/`. Client validation is for feedback only.
- Server Actions return typed result objects for expected failures. Do not throw them.
- Catch unexpected errors, `console.error` them on the server and return a generic message.
  Never send stack traces, SQL errors or connection details to the client.
- Never tell the user something happened when it did not. The contact form reports
  "stored" only after a successful insert.
- Answer keys (`is_correct`, `accepted_answers`) never reach the browser. Only
  `toPublicQuestion()` output crosses to the client. Correctness is revealed only in
  sequential rounds, and only for the participant's own answer.
- Every admin page and admin Server Action calls `requireAdmin()` / `requireAdminDb()`
  itself. The `(panel)` layout check is not a security boundary.
- Participant actions call `requireParticipant()` and re-check round status, attempt
  state and the deadline on the server.

## Testing

Before you call a change done, run all of these and report real results:

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build
```

- Add or update a test in `tests/` for new logic in `lib/` (scoring, validation, parsing).
- Test files import with relative paths and explicit `.ts` extensions.
- If a check cannot run, say exactly why. Do not claim it passed.
- Do not claim database connectivity or applied migrations unless you ran them.
- End-to-end checks against a local database: see `docs/DATABASE.md`, "Local database".

## Scope discipline

- Build what was asked. Items in `docs/ROADMAP.md` marked as suggestions are not approved.
- Do not implement planned endpoints from `docs/API.md` unless the task requires them.
- No homemade authentication: Better Auth owns users, sessions and cookies. Participant
  sign-in is a Better Auth plugin (`lib/auth/participant-plugin.ts`). No plaintext
  passwords; access keys are stored only as HMACs.
- Prefer deleting code to adding it.

## Documentation

Update the docs in the same change when you alter behavior or structure:

| You changed                         | Update                                      |
| ----------------------------------- | ------------------------------------------- |
| A route, endpoint or Server Action  | `docs/API.md`, `README.md` routes table     |
| Schema or migrations                | `docs/DATABASE.md`                          |
| A token, component or UI convention | `docs/DESIGN_SYSTEM.md`                     |
| Boundaries, data flow, env vars     | `docs/ARCHITECTURE.md`                      |
| A technical choice or dependency    | `docs/DECISIONS.md` (new ADR)               |
| What works versus what is mocked    | `README.md` status table, `docs/ROADMAP.md` |

Do not commit, push or deploy unless asked.
