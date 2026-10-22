"use server";

import { isAPIError } from "better-auth/api";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";
import { getDb } from "@/lib/db";
import {
  clearFailures,
  clientIp,
  isThrottled,
  recordFailure,
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

  const emailBucket = `admin-login:email:${parsed.data.email}`;
  const ipBucket = `admin-login:ip:${await clientIp()}`;
  const buckets = [ipBucket, emailBucket];
  try {
    const throttled = await isThrottled(db, [
      [emailBucket, rules.adminLoginAccount],
      [ipBucket, rules.adminLoginIp],
    ]);
    if (throttled) {
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
      // Only admins have passwords; refuse anything else outright.
      const context = await auth.$context;
      await context.internalAdapter.deleteUserSessions(result.user.id);
      await recordFailure(db, buckets);
      return { status: "error", message: REJECTED };
    }
    await clearFailures(db, emailBucket);
  } catch (error) {
    if (
      isAPIError(error) &&
      (error.status === "UNAUTHORIZED" || error.status === "BAD_REQUEST")
    ) {
      await recordFailure(db, buckets);
      return { status: "error", message: REJECTED };
    }
    console.error("adminLogin failed", error);
    return {
      status: "error",
      message: "Something went wrong. Try again in a moment.",
    };
  }
  redirect("/admin");
}
