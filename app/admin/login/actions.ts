"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  type Attempt,
  beginAttempt,
  clearFailures,
  clientIp,
  releaseAttempt,
  rules,
} from "@/lib/security/throttle";
import { adminLoginSchema } from "@/lib/validations/auth";
import { type ActionState, invalid } from "@/lib/validations/form";

const REJECTED = "Invalid email or password.";

export async function adminLogin(
  _previous: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const parsed = adminLoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return invalid(parsed.error);

  const auth = getAuth();
  const db = getDb();
  if (!auth || !db) {
    return {
      status: "error",
      message: "Sign-in is not available on this deployment.",
    };
  }

  const ip = await clientIp();
  const emailBucket = `admin-login:email:${parsed.data.email}`;
  const emailIpBucket = `admin-login:email-ip:${parsed.data.email}:${ip}`;
  let attempt: Attempt | null = null;
  try {
    attempt = await beginAttempt(db, [
      [emailIpBucket, rules.adminLoginEmailIp],
      [emailBucket, rules.adminLoginEmail],
      [`admin-login:ip:${ip}`, rules.adminLoginIp],
    ]);
    if (!attempt) {
      return {
        status: "error",
        message: "Too many failed attempts. Wait 15 minutes.",
      };
    }
    const result = await auth.api.signInEmail({
      body: parsed.data,
      headers: await headers(),
    });
    if (result.user.role !== "admin") {
      // Only admins have passwords; refuse anything else outright. The
      // attempt stays recorded as a failure.
      const context = await auth.$context;
      await context.internalAdapter.deleteUserSessions(result.user.id);
      return { status: "error", message: REJECTED };
    }
    await clearFailures(db, emailIpBucket);
    await releaseAttempt(db, attempt);
  } catch (error) {
    if (
      isAPIError(error) &&
      (error.status === "UNAUTHORIZED" || error.status === "BAD_REQUEST")
    ) {
      return { status: "error", message: REJECTED };
    }
    console.error("adminLogin failed", error);
    // Our failure, not a wrong password: do not count it.
    if (attempt) await releaseAttempt(db, attempt).catch(() => undefined);
    return {
      status: "error",
      message: "Something went wrong. Try again in a moment.",
    };
  }
  redirect("/admin");
}
