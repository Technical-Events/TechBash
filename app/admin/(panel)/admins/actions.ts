"use server";

import { hashPassword } from "better-auth/crypto";
import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { type AdminViewer, requireAdminDb } from "@/lib/auth/session";
import type { Db } from "@/lib/db";
import { authAccounts, authSessions, authUsers } from "@/lib/db/schema";
import {
  adminPasswordResetSchema,
  newAdminSchema,
} from "@/lib/validations/auth";
import { type ActionState, invalid } from "@/lib/validations/form";

const FAILED: ActionState = {
  status: "error",
  message: "The change could not be saved. Try again.",
};

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

/**
 * The admin `userId` names, if the signed-in admin may change it: not
 * themselves, and not an admin created with `pnpm admin:create`.
 */
async function manageableAdmin(
  db: Db,
  viewer: AdminViewer,
  userId: string,
): Promise<
  | { ok: true; target: { id: string; email: string } }
  | { ok: false; state: ActionState }
> {
  const [target] = await db
    .select({
      id: authUsers.id,
      email: authUsers.email,
      role: authUsers.role,
      addedBy: authUsers.addedBy,
    })
    .from(authUsers)
    .where(eq(authUsers.id, userId))
    .limit(1);
  const refuse = (message: string) => ({
    ok: false as const,
    state: { status: "error" as const, message },
  });
  if (!target || target.role !== "admin") {
    return refuse("That admin no longer exists.");
  }
  if (target.id === viewer.userId) {
    return refuse(
      "You cannot change your own account here. Ask another admin, or use pnpm admin:create.",
    );
  }
  if (target.addedBy === null) {
    return refuse(
      "This admin was created with pnpm admin:create and can only be changed from the terminal.",
    );
  }
  return { ok: true, target };
}

/** Creates an admin account with the password the signed-in admin typed. */
export async function addAdmin(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, db } = await requireAdminDb();
  const parsed = newAdminSchema.safeParse({
    name: text(formData, "name"),
    email: text(formData, "email"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);
  const { name, email, password } = parsed.data;

  try {
    const [existing] = await db
      .select({ role: authUsers.role })
      .from(authUsers)
      .where(eq(authUsers.email, email))
      .limit(1);
    if (existing) {
      return {
        status: "error",
        message:
          existing.role === "admin"
            ? `${email} is already an admin.`
            : `${email} belongs to a participant account. Use another email.`,
      };
    }
    const userId = crypto.randomUUID();
    const hash = await hashPassword(password);
    await db.batch([
      db.insert(authUsers).values({
        id: userId,
        name,
        email,
        emailVerified: true,
        role: "admin",
        addedBy: admin.email,
      }),
      db.insert(authAccounts).values({
        id: crypto.randomUUID(),
        accountId: userId,
        providerId: "credential",
        userId,
        password: hash,
      }),
    ]);
  } catch (error) {
    console.error("addAdmin failed", error);
    return FAILED;
  }
  refresh();
  return {
    status: "success",
    message: `${name} can now sign in at /admin/login with ${email}. Give them the password in person, not in a group chat.`,
  };
}

/** Sets a new password for another panel-added admin and signs them out. */
export async function setAdminPassword(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, db } = await requireAdminDb();
  const parsed = adminPasswordResetSchema.safeParse({
    userId: text(formData, "userId"),
    password: text(formData, "password"),
    confirmPassword: text(formData, "confirmPassword"),
  });
  if (!parsed.success) return invalid(parsed.error);

  try {
    const found = await manageableAdmin(db, admin, parsed.data.userId);
    if (!found.ok) return found.state;
    const { id, email } = found.target;
    const hash = await hashPassword(parsed.data.password);
    // One transaction: replace the credential, end every session.
    await db.batch([
      db
        .delete(authAccounts)
        .where(
          and(
            eq(authAccounts.userId, id),
            eq(authAccounts.providerId, "credential"),
          ),
        ),
      db.insert(authAccounts).values({
        id: crypto.randomUUID(),
        accountId: id,
        providerId: "credential",
        userId: id,
        password: hash,
      }),
      db.delete(authSessions).where(eq(authSessions.userId, id)),
    ]);
    refresh();
    return {
      status: "success",
      message: `New password set for ${email}. They were signed out everywhere.`,
    };
  } catch (error) {
    console.error("setAdminPassword failed", error);
    return FAILED;
  }
}

/** Deletes another panel-added admin; their sessions end with the account. */
export async function removeAdmin(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const { admin, db } = await requireAdminDb();
  try {
    const found = await manageableAdmin(db, admin, text(formData, "userId"));
    if (!found.ok) return found.state;
    // Sessions and the credential row cascade with the user.
    await db
      .delete(authUsers)
      .where(
        and(eq(authUsers.id, found.target.id), eq(authUsers.role, "admin")),
      );
    refresh();
    return {
      status: "success",
      message: `${found.target.email} is no longer an admin.`,
    };
  } catch (error) {
    console.error("removeAdmin failed", error);
    return FAILED;
  }
}
