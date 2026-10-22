import type { Metadata } from "next";
import { type ReactNode, Suspense } from "react";
import { AdminNav } from "@/components/admin/admin-nav";
import { Button } from "@/components/ui/button";
import { Loading } from "@/components/ui/loading";
import { requireAdmin } from "@/lib/auth/session";
import { adminLogout } from "./actions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s | TechBash admin" },
  robots: { index: false },
};

/**
 * Gate for the whole panel. Not the only check: every admin page and
 * Server Action calls requireAdmin() itself.
 */
async function AdminShell({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  return (
    <div className="space-y-10">
      <div className="border-b border-line pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
          <p className="text-muted">
            <span aria-hidden="true" className="text-accent">
              #{" "}
            </span>
            admin: <span className="text-fg">{admin.email}</span>
          </p>
          <form action={adminLogout}>
            <Button type="submit" variant="secondary">
              Sign out
            </Button>
          </form>
        </div>
        <div className="mt-2">
          <AdminNav />
        </div>
      </div>
      {children}
    </div>
  );
}

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Suspense fallback={<Loading label="Checking admin session" />}>
      <AdminShell>{children}</AdminShell>
    </Suspense>
  );
}
