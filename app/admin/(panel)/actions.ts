"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth/server";

export async function adminLogout(): Promise<void> {
  const auth = getAuth();
  if (auth) {
    try {
      await auth.api.signOut({ headers: await headers() });
    } catch (error) {
      console.error("adminLogout failed", error);
    }
  }
  redirect("/admin/login");
}
