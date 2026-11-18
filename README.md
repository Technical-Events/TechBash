# TechBash

```text
 _____         _     ____            _
|_   _|__  ___| |__ | __ )  __ _ ___| |__
  | |/ _ \/ __| '_ \|  _ \ / _` / __| '_ \
  | |  __/ (__| | | | |_) | (_| \__ \ | | |
  |_|\___|\___|_| |_|____/ \__,_|___/_| |_|
```

A technical event platform with a terminal-style interface. Participants log in with
their **full name and USN** and complete three rounds, each unlocked by its own access
key. Organizers run everything from an **admin panel**: rounds, questions, keys, the
roster, results, winners and site content.

**Quick links:** [Quick start](#quick-start) ·
[Environment variables](docs/DEPLOYMENT.md#1-environment-variables) ·
[Deploy to Vercel](docs/DEPLOYMENT.md#3-deploy-to-vercel) ·
[Admin accounts](docs/DEPLOYMENT.md#4-admin-accounts) ·
[Event day checklist](docs/DEPLOYMENT.md#5-event-day-checklist)

---

## Features

**Public site**

- **Home**: event introduction and details, the three rounds, faculty coordinators and
  the team with photos.
- **Contact Us**: technical lead, faculty with photos and contact details, and a contact
  form whose messages the admins read in the panel.

**User panel** (`/test`)

- Login with full name + USN, accepted only for USNs on the admin-approved roster. One
  active session per USN.
- Three rounds, each needing its own access key:

  | Round | Name               | Format                                                                   |
  | ----- | ------------------ | ------------------------------------------------------------------------ |
  | 1     | Quiz               | 30 questions from every engineering branch, 30 minutes, submit once      |
  | 2     | Tech Treasure Hunt | 15 clues one at a time; check an option, retry until right; fastest wins |
  | 3     | Bug Hunt           | Code snippets with line numbers; pick or type the answer                 |

- Optional time limit per round with a countdown; the server submits the round at the
  deadline.
- Answer keys never reach the browser.
- Rounds 2 and 3 can be limited to the previous round's top N (set by an admin).

**Admin panel** (`/admin`)

| Section      | What it does                                                                              |
| ------------ | ----------------------------------------------------------------------------------------- |
| Dashboard    | Live counts, first finisher, per-round statistics, interactive charts, top five           |
| Rounds       | Settings (draft / open / closed, time limit), top N who advance, questions, access keys   |
| Participants | Add, bulk import, edit, end sessions, reset a round, delete; every answer per participant |
| Results      | Full ranking with tie-breaks, winner list, first finisher, CSV exports                    |
| Content      | Event details, technical lead, faculty and team profiles with photo upload                |
| Messages     | Contact form submissions                                                                  |
| Admins       | Add admins (name, email, password), set a new password, remove                            |

**Ranking:** higher total score, then more rounds submitted, then less total time, then
earlier final submission. The **first finisher** is whoever submitted all three rounds
first.

## Tech stack

| Layer          | Technology                                       |
| -------------- | ------------------------------------------------ |
| Framework      | Next.js 16 (App Router), React 19, TypeScript    |
| Styling        | Tailwind CSS 4 with a custom ASCII design system |
| Database       | Neon serverless PostgreSQL, Drizzle ORM          |
| Authentication | Better Auth                                      |
| File storage   | Vercel Blob (photos)                             |
| Validation     | Zod                                              |
| Hosting        | Vercel                                           |

## Quick start

You need **Node.js 22.18+**, **pnpm 11** (`corepack enable`) and a free
[Neon](https://console.neon.tech) database.

```bash
# 1. Install dependencies
pnpm install

# 2. Configure the environment, then edit .env.local (see below)
cp .env.example .env.local

# 3. Create the tables and seed the rounds, event details and faculty
pnpm db:migrate

# 4. Create your admin account (asks for a password, 12+ characters)
pnpm admin:create you@ajiet.edu.in "Your Name"

# 5. Start the site
pnpm dev
```

Open <http://localhost:3000>. The admin panel is at <http://localhost:3000/admin/login>.

## Environment variables

| Variable                | Required            | What it is                                                      |
| ----------------------- | ------------------- | --------------------------------------------------------------- |
| `DATABASE_URL`          | Yes                 | Neon connection string                                          |
| `BETTER_AUTH_SECRET`    | Yes                 | Random secret: `openssl rand -base64 32`                        |
| `BETTER_AUTH_URL`       | Yes in production   | Site URL, e.g. `http://localhost:3000` or `https://your.domain` |
| `BLOB_READ_WRITE_TOKEN` | For photo uploads   | Vercel Blob token                                               |
| `NEON_FETCH_ENDPOINT`   | Never in production | Local database proxy for development only                       |

> **Do not change `BETTER_AUTH_SECRET` during the event:** it signs everyone out and
> invalidates every access key.

Where to find each value, examples and pitfalls:
[docs/DEPLOYMENT.md, section 1](docs/DEPLOYMENT.md#1-environment-variables).

## Deploy

In short:

1. Create a Neon database and run `DATABASE_URL="<prod url>" pnpm db:migrate`.
2. Import the GitHub repository on Vercel (Next.js preset).
3. Create the app's restricted database role
   ([DEPLOYMENT.md 3.5](docs/DEPLOYMENT.md#35-create-the-apps-database-role)), then set
   `DATABASE_URL` (that role), `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL`. Optionally connect a
   public Vercel Blob store for photos.
4. Deploy, then create the first admin:
   `DATABASE_URL="<prod url>" pnpm admin:create you@ajiet.edu.in "Your Name"`.

Step-by-step guide with checks and a custom-domain setup:
[docs/DEPLOYMENT.md, section 3](docs/DEPLOYMENT.md#3-deploy-to-vercel).

## Admin accounts

There is **no default admin and no sign-up page**. The first admin is created from the
terminal; after that, admins add each other in the panel (**Admins**).

| Task                   | Command / action                                                   |
| ---------------------- | ------------------------------------------------------------------ |
| Create the first admin | `pnpm admin:create you@ajiet.edu.in "Your Name"`                   |
| Add another admin      | Panel: **Admins > Add admin** (name, email, a password you choose) |
| Reset a panel admin    | Panel: **Admins > Set password** (signs them out everywhere)       |
| Remove a panel admin   | Panel: **Admins > Remove admin**                                   |
| Reset a terminal admin | `pnpm admin:create` with the same email                            |
| Target production      | Prefix the command with `DATABASE_URL="<prod url>"`                |

Admins created with `pnpm admin:create` cannot be changed or removed from the panel, and
nobody can change or remove their own account there.

Details: [docs/DEPLOYMENT.md, section 4](docs/DEPLOYMENT.md#4-admin-accounts).

## Commands

| Command                 | What it does                                                                             |
| ----------------------- | ---------------------------------------------------------------------------------------- |
| `pnpm dev`              | Development server                                                                       |
| `pnpm build`            | Production build                                                                         |
| `pnpm start`            | Serve the production build                                                               |
| `pnpm typecheck`        | Type check                                                                               |
| `pnpm lint`             | ESLint                                                                                   |
| `pnpm test`             | Unit tests                                                                               |
| `pnpm format`           | Prettier                                                                                 |
| `pnpm db:generate`      | Create a migration from `lib/db/schema.ts`                                               |
| `pnpm db:migrate`       | Apply migrations to `DATABASE_URL`                                                       |
| `pnpm db:studio`        | Browse the database                                                                      |
| `pnpm admin:create`     | Create an admin or reset an admin's password                                             |
| `pnpm questions:import` | Load questions from `private/question-bank.json` (`--round=N`, `--dry-run`, `--replace`) |

Before committing: `pnpm typecheck && pnpm lint && pnpm test && pnpm build`.

## Project structure

```text
app/              pages and routes
  test/             participant login, rounds
  admin/            admin login and panel
components/       UI (ui/ holds the design-system primitives)
lib/
  auth/             Better Auth setup and session helpers
  db/               schema, client, queries
  rounds/ results/ participants/   scoring, ranking, roster logic
  security/         access-key hashing, throttling
  validations/      Zod schemas
drizzle/          SQL migrations
scripts/          create-admin.ts, import-questions.ts
private/          gitignored: question-bank.json + .xlsx (answer keys), access-keys.xlsx
tests/            unit tests
docs/             documentation
```

## Routes

| Route                  | Access      | Purpose                                                             |
| ---------------------- | ----------- | ------------------------------------------------------------------- |
| `/`                    | Public      | Home                                                                |
| `/contact`             | Public      | Contact Us                                                          |
| `/test`                | Public      | Participant login and round dashboard                               |
| `/test/round/[number]` | Participant | Take a round                                                        |
| `/admin/login`         | Public      | Admin sign-in                                                       |
| `/admin/...`           | Admin       | Dashboard, rounds, participants, results, content, messages, admins |
| `/admin/export/[kind]` | Admin       | CSV: `results`, `participants`, `answers`                           |
| `/api/health`          | Public      | Health check                                                        |

## Status

- Verified end to end on a local PostgreSQL database: login, rounds, timers, throttling,
  admin panel, results and exports.
- Not yet deployed to Vercel or run against a real Neon project.
- Added 2026-11-18 and not yet run against any database: qualification (top N), the
  Admins page, `pnpm questions:import`, migrations `0004` and `0005`.
- Photo upload is implemented but untested (needs a Blob token).

## Known limitations

- Participant login uses name + USN without a password. Anyone who knows a registered
  pair can log in as that person; one-session-per-USN, roster-only login, venue-issued
  keys and throttling limit the risk. Fine on site, not for remote events.
- Admin login: someone on the same network as an admin (the venue NAT) can lock that
  admin's email out for 15 minutes by failing 5 times.
- Times display in Asia/Kolkata.

## Documentation

| File                                           | Contents                                     |
| ---------------------------------------------- | -------------------------------------------- |
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)       | Env variables, deployment, admins, event day |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)   | Structure, security, data flow               |
| [docs/DATABASE.md](docs/DATABASE.md)           | Schema, migrations, local database           |
| [docs/API.md](docs/API.md)                     | Route Handlers and Server Actions            |
| [docs/DESIGN_SYSTEM.md](docs/DESIGN_SYSTEM.md) | Design tokens and components                 |
| [docs/DECISIONS.md](docs/DECISIONS.md)         | Architecture decisions                       |
| [docs/ROADMAP.md](docs/ROADMAP.md)             | What is next                                 |
| [AGENTS.md](AGENTS.md)                         | Rules for AI coding agents                   |
