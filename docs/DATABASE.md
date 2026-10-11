# Database

PostgreSQL on Neon, accessed with Drizzle ORM.

> **Status**: the schema and the first SQL migration exist in the repository. No Neon
> database has been connected and no migration has been applied or verified against a
> real database. The application runs without one.

## Neon setup

1. Create a project at <https://console.neon.tech>.
2. Copy the **pooled** connection string for the default branch
   (`postgresql://USER:PASSWORD@HOST/DB?sslmode=require`).
3. Put it in `.env.local` at the repository root:

   ```env
   DATABASE_URL=postgresql://...
   ```

4. Apply the migrations: `pnpm db:migrate`.

Use a separate Neon branch (or project) for production and for development.

## Drizzle setup

| File | Purpose |
|---|---|
| `lib/db/schema.ts` | Table and enum definitions. Source of truth. |
| `lib/db/index.ts` | `getDb()`: lazy Drizzle client over the Neon HTTP driver. Returns `null` without `DATABASE_URL`. Server-only. |
| `drizzle.config.ts` | `drizzle-kit` configuration. Loads `.env.local` with `process.loadEnvFile`. |
| `drizzle/` | Generated SQL migrations and snapshots. Committed. |

Usage on the server:

```ts
import { getDb } from "@/lib/db";
import { quizzes } from "@/lib/db/schema";

const db = getDb();
if (!db) {
  // demo mode: no database configured
}
const rows = await db.select().from(quizzes);
```

## Environment variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | Only for database features and `db:migrate` / `db:studio` | Neon connection string. Never commit it. `db:generate` does not need it. |

## Entities

```mermaid
erDiagram
  quizzes ||--o{ questions : has
  questions ||--o{ answer_options : has
  users ||--o{ quiz_attempts : makes
  quizzes ||--o{ quiz_attempts : receives

  quizzes {
    uuid id PK
    text slug UK
    text title
    text description
    text category
    quiz_difficulty difficulty
    quiz_status status
    timestamptz created_at
    timestamptz updated_at
  }
  questions {
    uuid id PK
    uuid quiz_id FK
    text prompt
    question_type type
    int position
    timestamptz created_at
    timestamptz updated_at
  }
  answer_options {
    uuid id PK
    uuid question_id FK
    text text
    boolean is_correct
    int position
    timestamptz created_at
  }
  contact_submissions {
    uuid id PK
    text name
    text email
    text subject
    text message
    timestamptz created_at
  }
  users {
    uuid id PK
    text email UK
    text display_name
    timestamptz created_at
  }
  quiz_attempts {
    uuid id PK
    uuid quiz_id FK
    uuid user_id FK
    int score
    int total
    timestamptz started_at
    timestamptz completed_at
  }
```

`users` and `quiz_attempts` appear in the diagram as a design only. They are not in the
schema file.

## Implemented and planned tables

| Table | State | Used by application code |
|---|---|---|
| `quizzes` | Implemented in schema and migration | No (Phase 2) |
| `questions` | Implemented in schema and migration | No (Phase 2) |
| `answer_options` | Implemented in schema and migration | No (Phase 2) |
| `contact_submissions` | Implemented in schema and migration | Yes, `submitContact` when `DATABASE_URL` is set |
| `users` | Planned | — |
| `quiz_attempts` | Planned | — |

### Enums

| Enum | Values |
|---|---|
| `quiz_difficulty` | `beginner`, `intermediate`, `advanced` |
| `quiz_status` | `draft`, `published`, `archived` |
| `question_type` | `single_choice`, `multiple_choice`, `true_false` |

Only `single_choice` is supported by the demo scoring code.

### Constraints and indexes

- `quizzes.slug` is unique.
- Index on `quizzes (status, category)` for the published catalog query.
- `questions.quiz_id` → `quizzes.id`, `ON DELETE CASCADE`. Unique `(quiz_id, position)`.
- `answer_options.question_id` → `questions.id`, `ON DELETE CASCADE`. Unique
  `(question_id, position)`.
- All primary keys are `uuid` with `gen_random_uuid()`.
- Timestamps are `timestamptz`, default `now()`.

### Notes for the planned tables

- `users`: no password column. If accounts are approved, an authentication library or
  provider owns credentials (see ADR-008).
- `quiz_attempts.user_id` should be nullable so anonymous attempts stay possible.
  Per-question answers would need an `attempt_answers` table; decide when Phase 3 starts.

## Migration workflow

```bash
pnpm db:generate   # diff lib/db/schema.ts against drizzle/ and write a new SQL file
pnpm db:migrate    # apply pending migrations to DATABASE_URL
pnpm db:studio     # browse the database (needs DATABASE_URL)
```

1. Edit `lib/db/schema.ts`.
2. Run `pnpm db:generate`.
3. Read the generated SQL in `drizzle/`. Fix the schema and regenerate if it is wrong.
4. Commit the schema change and the migration together.
5. Run `pnpm db:migrate` against the development database, then production on deploy.

## Schema evolution conventions

- Never edit a migration that has been applied anywhere shared. Add a new one.
- Do not use `drizzle-kit push` on shared databases; it skips the migration history.
- Table and column names are `snake_case`; TypeScript fields are `camelCase`.
- Destructive changes (drop or rename of a column) ship in two steps: stop using the
  column, then drop it in a later migration.
- Add an index only with a query that needs it, and name the query in the commit message.
- Update this file and the ER diagram in the same change as the schema.

## Security and credential handling

- `DATABASE_URL` lives in `.env.local` locally and in the host's secret store in
  production. `.env*` files are ignored by Git except `.env.example`.
- `lib/db/**` imports `server-only`; a client import fails the build.
- Queries go through Drizzle's parameterized builders. No string-built SQL.
- Connection strings and raw database errors are never logged to the client or returned
  from an endpoint.
- Use a database role with the least privileges the application needs once production is
  set up. Not done yet.
