# TechBash

A quiz platform for technical topics with an ASCII, terminal-inspired interface.

```text
 _____         _     ____            _
|_   _|__  ___| |__ | __ )  __ _ ___| |__
  | |/ _ \/ __| '_ \|  _ \ / _` / __| '_ \
  | |  __/ (__| | | | |_) | (_| \__ \ | | |
  |_|\___|\___|_| |_|____/ \__,_|___/_| |_|
```

**Status: initial scaffold.** The site, the design system and one demo quiz work. The
database-backed quiz catalog does not exist yet. See
[Current implementation status](#current-implementation-status).

## Core features

- Four pages behind a four-item navbar: Home, Test, About, Contact Us.
- An ASCII design system: monospaced type, bracketed buttons, panels with `+` corners.
- A five-question demo quiz scored on the server. Answer keys are not sent to the browser
  before submission.
- A contact form validated in the browser and on the server. It stores messages only when
  a database is configured and says so plainly when it is not.
- `GET /api/health` liveness endpoint.
- Drizzle schema and SQL migration for Neon PostgreSQL.

## Technology stack

| Area       | Choice                                              |
| ---------- | --------------------------------------------------- |
| Framework  | Next.js 16 (App Router, Cache Components), React 19 |
| Language   | TypeScript 5                                        |
| Styling    | Tailwind CSS 4, tokens in `app/globals.css`         |
| Database   | Neon Serverless PostgreSQL                          |
| ORM        | Drizzle ORM, `drizzle-kit` for migrations           |
| Validation | Zod 4                                               |
| Icons      | Lucide React (menu toggle and result marks only)    |
| Tests      | Node built-in test runner                           |
| Tooling    | pnpm, ESLint 9 (`eslint-config-next`), Prettier     |

## Prerequisites

- Node.js 22.18 or newer (the test script relies on native TypeScript type stripping).
- pnpm 11 (`corepack enable` picks up the version pinned in `package.json`).
- A Neon database is optional. Without one the app runs in demo mode.

## Installation

```bash
pnpm install
cp .env.example .env.local   # optional: only needed for database features
```

## Local development

| Command             | What it does                                    |
| ------------------- | ----------------------------------------------- |
| `pnpm dev`          | Start the dev server at <http://localhost:3000> |
| `pnpm build`        | Production build                                |
| `pnpm start`        | Serve the production build                      |
| `pnpm typecheck`    | Generate route types, then `tsc --noEmit`       |
| `pnpm lint`         | ESLint                                          |
| `pnpm test`         | Unit tests (`tests/*.test.ts`)                  |
| `pnpm format`       | Format everything with Prettier                 |
| `pnpm format:check` | Check formatting without writing                |
| `pnpm db:generate`  | Create a SQL migration from `lib/db/schema.ts`  |
| `pnpm db:migrate`   | Apply migrations to `DATABASE_URL`              |
| `pnpm db:studio`    | Open Drizzle Studio                             |

## Environment configuration

| Variable       | Required | Purpose                                                  |
| -------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL` | No       | Neon connection string. Enables contact message storage. |

Put local values in `.env.local`. It is ignored by Git. Never commit real credentials.

## Neon database setup

1. Create a project at <https://console.neon.tech>.
2. Copy the pooled connection string into `.env.local` as `DATABASE_URL`.
3. Run `pnpm db:migrate`.

Nobody has done these steps for this repository yet: the schema and the first migration
(`drizzle/0000_init.sql`) are committed, but no database has been connected and the
migration has not been applied or tested against a real database.

## Database migrations

```bash
pnpm db:generate   # after editing lib/db/schema.ts; needs no database
pnpm db:migrate    # needs DATABASE_URL
```

Commit the schema change and the generated SQL together. Full workflow and conventions:
[docs/DATABASE.md](docs/DATABASE.md).

## Available routes

| Route             | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `/`               | Home: hero, quiz preview, topics                         |
| `/test`           | Test: how quizzes work, catalog of sample entries        |
| `/test/demo`      | The demo quiz                                            |
| `/about`          | About TechBash                                           |
| `/contact`        | Contact Us form                                          |
| `GET /api/health` | `{ "status": "ok", "service": "techbash", "timestamp" }` |

## Testing and linting

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

`pnpm test` covers quiz scoring and contact validation (7 tests). There are no component
or end-to-end tests in the repository yet.

## Current implementation status

| Area                          | State                                                    |
| ----------------------------- | -------------------------------------------------------- |
| Pages, navbar, footer         | Working                                                  |
| Design system                 | Working, documented in `docs/DESIGN_SYSTEM.md`           |
| Demo quiz                     | Working. Local sample data, scored by a Server Action    |
| Quiz catalog on `/test`       | **Mocked.** Static placeholders in `lib/quiz/catalog.ts` |
| Contact form validation       | Working (client and server)                              |
| Contact message storage       | Implemented, **untested against a real database**        |
| Contact email delivery        | Not implemented                                          |
| Health endpoint               | Working                                                  |
| Database schema and migration | Written and generated, **not applied anywhere**          |
| Users, attempts, admin        | Not implemented (planned, unconfirmed)                   |

## Known limitations

- The demo quiz stores nothing and can be resubmitted freely. It is not suitable for real
  assessments.
- Only single-choice questions are supported.
- The contact form has no rate limiting or spam protection, and nobody is notified of new
  messages.
- No authentication exists.
- The default Next.js 404 page is used.
- No CI and no deployment configuration.

## Planned next steps

Phase 2: connect Neon, apply the migration, seed real quizzes and make `/test` read from
the database. The full plan is in [docs/ROADMAP.md](docs/ROADMAP.md).

## Documentation

| File                                           | Contents                          |
| ---------------------------------------------- | --------------------------------- |
| [AGENTS.md](AGENTS.md)                         | Rules for AI coding agents        |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)   | Goals, scope, requirements, risks |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Structure, boundaries, data flow  |
| [docs/DATABASE.md](docs/DATABASE.md)           | Neon, Drizzle, schema, migrations |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Tokens, components, states        |
| [docs/API.md](docs/API.md)                     | Implemented and planned endpoints |
| [docs/DECISIONS.md](docs/DECISIONS.md)         | Architecture decision records     |
| [docs/ROADMAP.md](docs/ROADMAP.md)             | Phased roadmap                    |
