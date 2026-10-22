# Deployment and operations

Everything needed to run TechBash locally, deploy it to Vercel, and manage admin accounts.

- [1. Environment variables](#1-environment-variables)
- [2. Run locally](#2-run-locally)
- [3. Deploy to Vercel](#3-deploy-to-vercel)
- [4. Admin accounts](#4-admin-accounts)
- [5. Event day checklist](#5-event-day-checklist)
- [6. Troubleshooting](#6-troubleshooting)

---

## 1. Environment variables

Locally they live in `.env.local` (ignored by Git; copy it from `.env.example`). On Vercel
they live in **Project > Settings > Environment Variables**. Never commit real values.

| Variable                | Required               | Where it comes from                            |
| ----------------------- | ---------------------- | ---------------------------------------------- |
| `DATABASE_URL`          | Yes                    | Neon dashboard, or the Neon Vercel integration |
| `BETTER_AUTH_SECRET`    | Yes                    | You generate it                                |
| `BETTER_AUTH_URL`       | Yes in production      | Your site's public URL                         |
| `BLOB_READ_WRITE_TOKEN` | Only for photo uploads | Vercel Blob store                              |
| `NEON_FETCH_ENDPOINT`   | Never in production    | Local Neon proxy only                          |

### `DATABASE_URL`

The PostgreSQL connection string of your Neon database. Example:

```env
DATABASE_URL=postgresql://neondb_owner:abc123@ep-cool-name-123456-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
```

- Get it from **Neon > your project > Dashboard > Connect**. Use the **pooled** string
  (host contains `-pooler`) for the app.
- For migrations you may use the **direct** string (same, without `-pooler`). See
  [3.4](#34-create-the-tables).
- Without it, public pages still render with default content, but login, rounds and the
  admin panel are unavailable.
- Used by: the app (`lib/db/index.ts`), `pnpm db:migrate`, `pnpm admin:create`.

### `BETTER_AUTH_SECRET`

A long random string. It signs session cookies and is the key for hashing round access
keys. Generate one:

```bash
openssl rand -base64 32
```

```env
BETTER_AUTH_SECRET=q8V3x...44 characters...Zk=
```

- At least 32 characters. Keep it secret.
- Use a **different** secret for production and for local development.
- **Do not change it during the event.** Changing it signs everyone out and makes every
  existing access key invalid. If you change it, create new access keys for each round.

### `BETTER_AUTH_URL`

The public base URL of the site, without a trailing slash.

```env
BETTER_AUTH_URL=http://localhost:3000            # local
BETTER_AUTH_URL=https://techbash.vercel.app      # production (use your real domain)
```

- If you add a custom domain later, update this value and redeploy.
- On Vercel, preview deployment URLs are trusted automatically (`VERCEL_URL`,
  `VERCEL_BRANCH_URL`), so you only set the production URL.

### `BLOB_READ_WRITE_TOKEN`

Token for Vercel Blob, where team and faculty photos are stored.

- On Vercel it is added automatically when you connect a Blob store to the project
  ([3.3](#33-create-the-photo-store-optional)).
- Locally, copy it from **Vercel > Storage > your Blob store > .env.local** tab if you
  want to test uploads.
- Without it, everything works except photo upload; the admin form says so.

### `NEON_FETCH_ENDPOINT`

Development only: points the database driver at a local Neon HTTP proxy so you can test
without a Neon account. See `docs/DATABASE.md`, "Local database". **Never set it on
Vercel.**

### Example `.env.local` for local development

```env
DATABASE_URL=postgresql://neondb_owner:...@ep-...-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
BETTER_AUTH_SECRET=<output of openssl rand -base64 32>
BETTER_AUTH_URL=http://localhost:3000
BLOB_READ_WRITE_TOKEN=
```

---

## 2. Run locally

Requirements: Node.js 22.18 or newer, pnpm 11 (`corepack enable`), a Neon project (a free
one is enough; create a `dev` branch for local work).

```bash
pnpm install
cp .env.example .env.local      # then fill in the values from section 1
pnpm db:migrate                 # creates tables and seeds rounds, event info, faculty
pnpm admin:create you@ajiet.edu.in "Your Name"
pnpm dev
```

- Site: <http://localhost:3000>
- Admin: <http://localhost:3000/admin/login>

Before pushing changes, run the checks:

```bash
pnpm typecheck && pnpm lint && pnpm test && pnpm build
```

---

## 3. Deploy to Vercel

### 3.1 Push the code

Push the repository to GitHub (for example `git push -u origin main`).

### 3.2 Create the database

1. Sign in at <https://console.neon.tech> and create a project. Pick the region closest to
   the venue (for India: `AWS Asia Pacific (Singapore)` or `(Mumbai)` if offered).
2. Keep the default `main` branch for production. Optionally create a `preview` branch
   for Vercel preview deployments and a `dev` branch for local work.

Alternative: in Vercel, **Storage > Create Database > Neon** creates the project and adds
`DATABASE_URL` to Vercel for you.

### 3.3 Create the photo store (optional)

In Vercel: **Storage > Create > Blob**, choose **public** access, then **Connect to
project**. This adds `BLOB_READ_WRITE_TOKEN` to the project.

### 3.4 Create the tables

Run the migrations once against the **production** database, from your machine. A
variable set on the command line wins over `.env.local`:

```bash
DATABASE_URL="<production connection string>" pnpm db:migrate
```

This creates every table and seeds the three rounds (as Draft), the event details and the
two faculty coordinators. Running it again later only applies new migrations.

### 3.5 Import the project in Vercel

1. <https://vercel.com/new> > import the GitHub repository.
2. Framework preset: **Next.js** (auto-detected). Leave build and output settings at their
   defaults; pnpm is detected from `package.json`.
3. **Settings > General > Node.js Version**: 22.x or newer.
4. **Environment Variables** (Production):

   | Name                    | Value                                                                       |
   | ----------------------- | --------------------------------------------------------------------------- |
   | `DATABASE_URL`          | production pooled connection string (skip if the Neon integration added it) |
   | `BETTER_AUTH_SECRET`    | a new `openssl rand -base64 32` value                                       |
   | `BETTER_AUTH_URL`       | `https://<your-project>.vercel.app` or your custom domain                   |
   | `BLOB_READ_WRITE_TOKEN` | added automatically by step 3.3                                             |

   For **Preview**, point `DATABASE_URL` at the Neon `preview` branch, never at
   production.

5. **Deploy**.

### 3.6 Create the first admin

```bash
DATABASE_URL="<production connection string>" pnpm admin:create you@ajiet.edu.in "Your Name"
```

Then sign in at `https://<your-domain>/admin/login`. Details in [section 4](#4-admin-accounts).

### 3.7 Check the deployment

1. `https://<your-domain>/api/health` returns `{"status":"ok",...}`.
2. Home and Contact Us show the event details and faculty.
3. Admin login works.
4. In the admin panel, add a test participant, add a question to a round, create a key,
   open the round, and take it from another browser as that participant.
5. If photos are enabled, upload one in **Content** and check it on Home.
6. Delete the test participant and question, and set the round back to **Draft**.

### Custom domain

**Vercel > Settings > Domains** > add the domain and follow the DNS instructions. Then set
`BETTER_AUTH_URL` to the new URL and redeploy.

### Updating later

Push to `main` and Vercel redeploys. If the change includes a new file in `drizzle/`, run
step 3.4 again **before** the new deployment goes live.

---

## 4. Admin accounts

There is no default admin and no admin sign-up page. Admins are created from the command
line with `pnpm admin:create`, which writes directly to the database using Better Auth's
password hashing.

### Create an admin

```bash
pnpm admin:create you@ajiet.edu.in "Your Name"
```

- It asks for the password twice (hidden while you type). Minimum 12 characters, maximum 128.
- It uses `DATABASE_URL` from `.env.local`. To target another database (for example
  production), put the variable in front:

  ```bash
  DATABASE_URL="<connection string>" pnpm admin:create you@ajiet.edu.in "Your Name"
  ```

- Without a terminal (CI, scripts), pass the password through an environment variable.
  It ends up in your shell history, so prefer the prompt:

  ```bash
  ADMIN_PASSWORD='a-long-password' pnpm admin:create you@ajiet.edu.in "Your Name"
  ```

Sign in at `/admin/login` with that email and password.

### Add more admins

Run the same command with a different email. Every admin has full access.

### Reset a forgotten password

Run the command again with the **same** email. It sets the new password and signs that
admin out everywhere.

### Remove an admin

There is no command for this. Delete the user in **Neon > SQL Editor**:

```sql
DELETE FROM auth_users WHERE email = 'person@ajiet.edu.in' AND role = 'admin';
```

Their password and sessions are removed with it.

### Rules

- An email that belongs to a participant cannot become an admin.
- Admin login is limited to 5 failed attempts per email per 15 minutes.
- Sessions last 12 hours. **Sign out** in the admin panel ends the session at once.
- Share passwords privately, never in chat groups.

---

## 5. Event day checklist

**Before the event**

1. **Content**: date, venue, details, technical lead, faculty details and photos, team
   members, number of winner places.
2. **Participants**: import the roster (`USN,Full Name`, one per line, paste from a
   spreadsheet).
3. **Rounds**: add questions; set time limits; create one access key per round. Keep
   every round in **Draft**.
4. Do a rehearsal with two or three people on the real site.

**During the event**

1. Set a round to **Open** and announce its key.
2. Watch the **Dashboard**.
3. Set the round to **Closed** when time is up. Unfinished attempts are submitted at that
   moment.
4. A participant whose device failed can log in on another device. To let them start a
   round over, open them in **Participants** and use **Reset this round**.
5. If a key leaks, **Revoke** it (or **New value**) and announce the new one. Rounds
   already unlocked stay unlocked.

**After the event**

1. **Results**: winner list and first finisher.
2. Export the CSVs.
3. Optionally enable "Show participants their scores" in **Content**.

---

## 6. Troubleshooting

| Symptom                                                      | Cause and fix                                                                                                                                          |
| ------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Test page says "Sign-in is not available on this deployment" | `DATABASE_URL` or `BETTER_AUTH_SECRET` is missing. Add it in Vercel and redeploy.                                                                      |
| Admin login always says "Invalid email or password"          | Wrong password, or the admin was created in a different database (check `DATABASE_URL` used with `pnpm admin:create`). Reset with `pnpm admin:create`. |
| "Too many failed attempts"                                   | Throttling. Wait 15 minutes (logins) or 10 minutes (keys).                                                                                             |
| Every access key stopped working                             | `BETTER_AUTH_SECRET` changed. Create new keys.                                                                                                         |
| Participant: "That name and USN do not match"                | The USN is not in the roster, or the name differs from the roster (case, extra spaces and dots are ignored). Fix it in **Participants**.               |
| Pages error with "relation ... does not exist"               | Migrations not applied to this database. Run step 3.4.                                                                                                 |
| Photo upload says it is not configured                       | `BLOB_READ_WRITE_TOKEN` missing. Connect a Blob store (3.3) and redeploy.                                                                              |
| Photo does not show after upload                             | The Blob store is not public. Create a public store.                                                                                                   |
| Home shows old content after an edit                         | Reload the page. If it persists, redeploy (clears the cache).                                                                                          |
