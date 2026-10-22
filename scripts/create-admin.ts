/**
 * Creates an admin account, or resets an existing admin's password.
 *
 *   pnpm admin:create <email> "<Full Name>"
 *
 * The password is read from ADMIN_PASSWORD or typed at a hidden prompt.
 * Needs DATABASE_URL (from .env.local or the environment). Better Auth's
 * own scrypt hashing is used, so the account works with the admin login.
 */
import { randomUUID } from "node:crypto";
import { neon, neonConfig } from "@neondatabase/serverless";
import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/neon-http";
import { z } from "zod";
// Relative import with an extension: Node's type stripping has no "@/" alias.
import { authAccounts, authSessions, authUsers } from "../lib/db/schema.ts";

function promptHidden(label: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdin = process.stdin;
    if (!stdin.isTTY) {
      reject(
        new Error("No terminal to prompt on. Set ADMIN_PASSWORD instead."),
      );
      return;
    }
    process.stdout.write(label);
    let value = "";
    const cleanup = () => {
      stdin.setRawMode(false);
      stdin.pause();
      stdin.off("data", onData);
    };
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === "\r" || char === "\n") {
          cleanup();
          process.stdout.write("\n");
          resolve(value);
          return;
        }
        if (char === "\u0003") {
          cleanup();
          reject(new Error("Cancelled."));
          return;
        }
        value =
          char === "\u007f" || char === "\b"
            ? value.slice(0, -1)
            : value + char;
      }
    };
    stdin.setRawMode(true);
    stdin.setEncoding("utf8");
    stdin.resume();
    stdin.on("data", onData);
  });
}

async function readPassword(): Promise<string> {
  if (process.env.ADMIN_PASSWORD) return process.env.ADMIN_PASSWORD;
  const first = await promptHidden("Password (12+ characters): ");
  const second = await promptHidden("Repeat password: ");
  if (first !== second) throw new Error("Passwords do not match.");
  return first;
}

async function main() {
  try {
    process.loadEnvFile(".env.local");
  } catch {
    // Fine: variables may come from the environment.
  }
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set.");
  if (process.env.NEON_FETCH_ENDPOINT)
    neonConfig.fetchEndpoint = process.env.NEON_FETCH_ENDPOINT;

  const args = z
    .tuple([
      z
        .string()
        .trim()
        .toLowerCase()
        .pipe(z.email("First argument must be an email address.")),
      z
        .string()
        .trim()
        .min(2, "Second argument must be the admin's name.")
        .max(100),
    ])
    .safeParse(process.argv.slice(2));
  if (!args.success) {
    throw new Error(
      `${args.error.issues[0]?.message ?? "Invalid arguments."}\nUsage: pnpm admin:create <email> "<Full Name>"`,
    );
  }
  const [email, name] = args.data;

  const password = await readPassword();
  if (password.length < 12 || password.length > 128) {
    throw new Error("The password must be 12 to 128 characters.");
  }
  const hash = await hashPassword(password);
  const db = drizzle(neon(url));

  const [existing] = await db
    .select()
    .from(authUsers)
    .where(eq(authUsers.email, email));
  if (existing && existing.role !== "admin") {
    throw new Error(
      `${email} belongs to a participant account. Use another email.`,
    );
  }

  if (existing) {
    const updated = await db
      .update(authAccounts)
      .set({ password: hash })
      .where(
        and(
          eq(authAccounts.userId, existing.id),
          eq(authAccounts.providerId, "credential"),
        ),
      )
      .returning({ id: authAccounts.id });
    if (updated.length === 0) {
      await db.insert(authAccounts).values({
        id: randomUUID(),
        accountId: existing.id,
        providerId: "credential",
        userId: existing.id,
        password: hash,
      });
    }
    await db
      .update(authUsers)
      .set({ name })
      .where(eq(authUsers.id, existing.id));
    await db.delete(authSessions).where(eq(authSessions.userId, existing.id));
    console.log(
      `Password reset for admin ${email}. Existing sessions were ended.`,
    );
    return;
  }

  const userId = randomUUID();
  await db.batch([
    db
      .insert(authUsers)
      .values({ id: userId, name, email, emailVerified: true, role: "admin" }),
    db.insert(authAccounts).values({
      id: randomUUID(),
      accountId: userId,
      providerId: "credential",
      userId,
      password: hash,
    }),
  ]);
  console.log(`Admin ${email} created. Sign in at /admin/login.`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
