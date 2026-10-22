import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { type Db, getDb } from "@/lib/db";
import {
  authAccounts,
  authSessions,
  authUsers,
  authVerifications,
} from "@/lib/db/schema";
import { userRoles } from "@/lib/rounds/constants";
import { site } from "@/lib/site";
import { participantSignIn } from "./participant-plugin";

/** Origins Better Auth accepts: the configured URL plus Vercel's own. */
function trustedOrigins(): string[] {
  const hosts = [
    process.env.VERCEL_URL,
    process.env.VERCEL_BRANCH_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL,
  ].filter((host): host is string => Boolean(host));
  return [
    ...(process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : []),
    ...hosts.map((host) => `https://${host}`),
  ];
}

function createAuth(db: Db, secret: string) {
  return betterAuth({
    appName: site.name,
    secret,
    baseURL:
      process.env.BETTER_AUTH_URL ??
      (process.env.VERCEL_PROJECT_PRODUCTION_URL
        ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
        : undefined),
    trustedOrigins: trustedOrigins(),
    database: drizzleAdapter(db, {
      provider: "pg",
      schema: {
        user: authUsers,
        session: authSessions,
        account: authAccounts,
        verification: authVerifications,
      },
    }),
    // Admins only. Accounts are created by scripts/create-admin.ts.
    emailAndPassword: {
      enabled: true,
      disableSignUp: true,
      minPasswordLength: 12,
      maxPasswordLength: 128,
    },
    user: {
      additionalFields: {
        role: {
          type: [...userRoles],
          required: false,
          defaultValue: "participant",
          input: false,
        },
      },
    },
    session: {
      // One event day. No sliding refresh: Server Components cannot set
      // cookies, and a fixed expiry keeps every page consistent.
      expiresIn: 60 * 60 * 12,
      disableSessionRefresh: true,
      // Read from the database on every request, so revoking a session or
      // removing a participant takes effect immediately.
      cookieCache: { enabled: false },
    },
    // The Better Auth HTTP handler is not mounted (see docs/ARCHITECTURE.md);
    // throttling lives in the Server Actions that call it.
    rateLimit: { enabled: false },
    // Ids are generated here: the auth tables have text keys without defaults.
    advanced: { database: { generateId: () => crypto.randomUUID() } },
    plugins: [participantSignIn(db), nextCookies()],
  });
}

export type Auth = ReturnType<typeof createAuth>;

let auth: Auth | undefined;

/**
 * Better Auth instance, or `null` when `DATABASE_URL` or
 * `BETTER_AUTH_SECRET` is missing. Sign-in is unavailable in that case.
 */
export function getAuth(): Auth | null {
  const db = getDb();
  const secret = process.env.BETTER_AUTH_SECRET;
  if (!db || !secret) return null;
  return (auth ??= createAuth(db, secret));
}
