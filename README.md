# TechBash

A technical event platform with an ASCII, terminal-inspired interface. Participants log in
with their full name and USN and complete three access-controlled rounds. Organizers run
the event from an admin panel.

```text
 _____         _     ____            _
|_   _|__  ___| |__ | __ )  __ _ ___| |__
  | |/ _ \/ __| '_ \|  _ \ / _` / __| '_ \
  | |  __/ (__| | | | |_) | (_| \__ \ | | |
  |_|\___|\___|_| |_|____/ \__,_|___/_| |_|
```

**Status: feature complete, verified end to end against a local PostgreSQL through the Neon
HTTP proxy. Not yet deployed; not yet run against a real Neon project.** See
[Current implementation status](#current-implementation-status).

## Features

### Public site

- **Home**: event introduction and details, the three rounds, faculty coordinators and the
  team (names, photos, roles). All editable by admins.
- **Contact Us**: technical lead (S. Mohammed Sharwan, sharwan@ajiet.edu.in), faculty
  members with photos and contact details, and a contact form stored for the organizers.

### User panel (`/test`)

- Login with **full name + USN**, checked against the admin-approved roster. One active
  session per USN: logging in elsewhere ends the earlier session.
- The three rounds appear with their names. **Each round needs its own access key.**
  - Round 1 **Quiz**: all questions visible, answers saved as you go, submit once.
  - Round 2 **Tech Treasure Hunt**: clues unlock one at a time on a correct answer.
  - Round 3 **Bug Hunt**: code snippets with line numbers; pick or type the answer.
- Optional time limit per round, fixed at unlock. A countdown shows; the round is
  submitted automatically at the deadline (server-enforced).
- Answer keys never reach the browser.

### Admin panel (`/admin`)

- Dashboard: live counts, first finisher, per-round statistics, interactive charts
  (progress, score distribution, per-question accuracy), top five.
- Rounds: title, description, instructions, status (draft / open / closed), time limit,
  sequential mode; question CRUD (single choice or short text, optional code snippet,
  points), reordering. Editing an answer key re-scores existing answers.
- Access keys: create (random or custom), rename, rotate (new value), revoke, restore,
  delete. Keys are shown once and stored as HMACs.
- Participants: add, bulk import (`USN,Full Name`, paste from a spreadsheet), edit, end
  sessions, reset a round attempt, delete. Detail view with every answer.
- Results: full ranking with tie-breaks, automatic winner list, first finisher, CSV
  exports (results, participants, every answer).
- Content: event details, technical lead, winner places, whether participants see their
  scores, faculty and team profiles with photo upload.
- Messages: contact form submissions.

### Ranking and tie-break rules

1. Higher total score. 2. More rounds submitted. 3. Less total time (unlock to submission,
   summed). 4. Earlier final submission. Equal on all four: shared rank. The **first
   finisher** is whoever submitted all three rounds earliest.

## Technology stack

| Area           | Choice                                                       |
| -------------- | ------------------------------------------------------------ |
| Framework      | Next.js 16 (App Router, Cache Components), React 19          |
| Language       | TypeScript 5                                                 |
| Styling        | Tailwind CSS 4, tokens in `app/globals.css`                  |
| Database       | Neon Serverless PostgreSQL (HTTP driver)                     |
| ORM            | Drizzle ORM, `drizzle-kit` for migrations                    |
| Authentication | Better Auth (admin email + password; participant name + USN) |
| File storage   | Vercel Blob (team and faculty photos)                        |
| Validation     | Zod 4                                                        |
| Charts         | Hand-built ASCII-style components (no chart library)         |
| Tests          | Node built-in test runner                                    |
| Hosting        | Vercel                                                       |

## Prerequisites

- Node.js 22.18 or newer (tests and `scripts/` rely on native TypeScript type stripping).
- pnpm 11 (`corepack enable` picks up the version pinned in `package.json`).
- A Neon database and `BETTER_AUTH_SECRET` for sign-in. Without them the public pages
  still render with default content, and sign-in reports that it is unavailable.

## Environment configuration

| Variable                | Required               | Purpose                                                                |
| ----------------------- | ---------------------- | ---------------------------------------------------------------------- |
| `DATABASE_URL`          | Yes (for the event)    | Neon pooled connection string.                                         |
| `BETTER_AUTH_SECRET`    | Yes (for the event)    | 32+ random characters. Signs sessions and keys the access-key HMAC.    |
| `BETTER_AUTH_URL`       | Recommended            | Public site URL, e.g. `https://techbash.example.com`.                  |
| `BLOB_READ_WRITE_TOKEN` | For photo uploads      | Vercel Blob token. Without it the photo field is disabled.             |
| `NEON_FETCH_ENDPOINT`   | Local development only | Points the Neon HTTP driver at a local proxy. Never set in production. |

Put local values in `.env.local` (ignored by Git). Generate a secret with
`openssl rand -base64 32`. **Changing `BETTER_AUTH_SECRET` signs everyone out and
invalidates every access key** (create new ones).

## Setup

```bash
pnpm install
cp .env.example .env.local        # fill in DATABASE_URL and BETTER_AUTH_SECRET
pnpm db:migrate                   # creates tables, seeds the 3 rounds, event info, faculty
pnpm admin:create you@ajiet.edu.in "Your Name"   # prompts for a 12+ character password
pnpm dev
```

`pnpm admin:create` on an existing admin email resets the password and ends that admin's
sessions. There is no admin sign-up page by design.

## Running the event

1. In **Content**, fill in the date, venue, faculty details and photos, and team members.
2. In **Participants**, import the roster (`USN,Full Name` per line).
3. In **Rounds**, add questions to each round and create an access key per round. Keep
   rounds in **Draft** until they start.
4. When a round starts: set it to **Open** and announce its key.
5. When it ends: set it to **Closed**. Every unfinished attempt is submitted at that moment.
6. **Results** shows the ranking, the winner list and the first finisher. Export CSVs.
7. Optionally turn on "Show participants their scores" in Content.

A participant who loses their device can log in again on another one. If an attempt needs
to start over, open the participant and use **Reset this round**.

## Deploying to Vercel

1. Import the repository in Vercel. Framework preset: Next.js.
2. Add the Neon integration (or set `DATABASE_URL`), `BETTER_AUTH_SECRET`,
   `BETTER_AUTH_URL` (the production URL) and a Vercel Blob store (sets
   `BLOB_READ_WRITE_TOKEN`). Use a separate Neon branch for preview deployments.
3. Run `pnpm db:migrate` against the production database, then `pnpm admin:create`.
4. Deploy.

Nobody has deployed this repository yet; the steps above are untested on Vercel itself.

## Commands

| Command             | What it does                                   |
| ------------------- | ---------------------------------------------- |
| `pnpm dev`          | Dev server at <http://localhost:3000>          |
| `pnpm build`        | Production build                               |
| `pnpm start`        | Serve the production build                     |
| `pnpm typecheck`    | Generate route types, then `tsc --noEmit`      |
| `pnpm lint`         | ESLint                                         |
| `pnpm test`         | Unit tests (`tests/*.test.ts`)                 |
| `pnpm format`       | Prettier                                       |
| `pnpm db:generate`  | Create a SQL migration from `lib/db/schema.ts` |
| `pnpm db:migrate`   | Apply migrations to `DATABASE_URL`             |
| `pnpm db:studio`    | Drizzle Studio                                 |
| `pnpm admin:create` | Create an admin or reset an admin's password   |

## Available routes

| Route                                           | Access      | Description                                 |
| ----------------------------------------------- | ----------- | ------------------------------------------- |
| `/`                                             | Public      | Home                                        |
| `/contact`                                      | Public      | Contact Us                                  |
| `/test`                                         | Public      | Participant login, then the round dashboard |
| `/test/round/[number]`                          | Participant | Take round 1, 2 or 3 (after unlocking)      |
| `/admin/login`                                  | Public      | Admin sign-in                               |
| `/admin`                                        | Admin       | Dashboard and analytics                     |
| `/admin/rounds`, `/[number]`                    | Admin       | Round settings, access keys, questions      |
| `/admin/rounds/[number]/questions/new`, `/[id]` | Admin       | Add or edit a question                      |
| `/admin/participants`, `/[id]`                  | Admin       | Roster and per-participant detail           |
| `/admin/results`                                | Admin       | Ranking, winners, exports                   |
| `/admin/content`                                | Admin       | Event details, faculty and team             |
| `/admin/messages`                               | Admin       | Contact form submissions                    |
| `GET /admin/export/[kind]`                      | Admin       | CSV: `results`, `participants`, `answers`   |
| `GET /api/health`                               | Public      | Liveness JSON                               |

## Testing

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`pnpm test` runs 21 unit tests: roster parsing, answer checking, access keys, ranking and
tie-breaks, winner selection, CSV escaping, histograms and image sniffing. Browser
end-to-end runs were done by hand against a local database (see `docs/DATABASE.md`,
"Local database"); they are not committed as an automated suite.

## Current implementation status

| Area                              | State                                                                                            |
| --------------------------------- | ------------------------------------------------------------------------------------------------ |
| Public pages, design system       | Working                                                                                          |
| Participant login, rounds, timers | Working, verified end to end on a local database                                                 |
| Admin panel (all sections)        | Working, verified end to end on a local database                                                 |
| CSV exports                       | Working, verified                                                                                |
| Photo upload (Vercel Blob)        | Implemented, **not verified** (needs a Blob token)                                               |
| Migrations                        | Applied and verified on local PostgreSQL 17; **not yet applied to Neon**                         |
| `pnpm db:migrate` itself          | **Not run** locally (drizzle-kit needs a Neon WebSocket endpoint); SQL files applied with `psql` |
| Contact email delivery            | Not implemented (messages are read in the admin panel)                                           |
| Automated end-to-end tests        | Not in the repository                                                                            |

## Known limitations

- Participant login has no secret: anyone who knows a registered name and USN pair can
  log in as that person. Mitigations: roster-only login, one session per USN (a hijack
  logs the real participant out, which they will notice), per-round keys given out at
  the venue, per-USN throttling. Use password login if the event is remote.
- The contact form has no rate limiting.
- Admin accounts are created only with `pnpm admin:create`.
- Times are shown in Asia/Kolkata (`EVENT_TIME_ZONE` in `lib/site.ts`).

## Documentation

| File                                           | Contents                          |
| ---------------------------------------------- | --------------------------------- |
| [AGENTS.md](AGENTS.md)                         | Rules for AI coding agents        |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)   | Goals, scope, requirements, risks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Structure, boundaries, data flow  |
| [docs/DATABASE.md](docs/DATABASE.md)           | Neon, Drizzle, schema, migrations |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, components, states        |
| [docs/API.md](docs/API.md)                     | Route Handlers and Server Actions |
| [docs/DECISIONS.md](docs/DECISIONS.md)         | Architecture decision records     |
| [docs/ROADMAP.md](docs/ROADMAP.md)             | Roadmap                           |
