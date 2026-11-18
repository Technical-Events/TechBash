import type { Metadata } from "next";
import { asc, eq } from "drizzle-orm";
import {
  addAdmin,
  removeAdmin,
  setAdminPassword,
} from "@/app/admin/(panel)/admins/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Badge } from "@/components/ui/badge";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdminDb } from "@/lib/auth/session";
import { authUsers } from "@/lib/db/schema";
import { formatDateTime } from "@/lib/format";

export const metadata: Metadata = { title: "Admins" };

export default async function AdminsPage() {
  const { admin, db } = await requireAdminDb();
  const admins = await db
    .select({
      id: authUsers.id,
      name: authUsers.name,
      email: authUsers.email,
      addedBy: authUsers.addedBy,
      createdAt: authUsers.createdAt,
    })
    .from(authUsers)
    .where(eq(authUsers.role, "admin"))
    .orderBy(asc(authUsers.createdAt));

  return (
    <>
      <PageHeading command="./admin --admins" title="Admins">
        People who can sign in to this panel. Every admin has full access to
        rounds, keys, participants and results.
      </PageHeading>

      <div className="space-y-16">
        <Panel title="add admin">
          <ActionForm
            action={addAdmin}
            submitLabel="Add admin"
            pendingLabel="... Adding"
            resetOnSuccess
          >
            <div className="grid gap-5 sm:grid-cols-2">
              <Field
                label="Name"
                name="name"
                required
                maxLength={100}
                autoComplete="off"
              />
              <Field
                label="Email"
                name="email"
                type="email"
                required
                maxLength={254}
                autoComplete="off"
                spellCheck={false}
              />
              <Field
                label="Password"
                name="password"
                type="password"
                required
                minLength={12}
                maxLength={128}
                autoComplete="new-password"
                hint="12 to 128 characters. Give it to them in person."
              />
              <Field
                label="Repeat password"
                name="confirmPassword"
                type="password"
                required
                maxLength={128}
                autoComplete="new-password"
              />
            </div>
          </ActionForm>
        </Panel>

        <section aria-labelledby="admins-heading">
          <SectionHeading
            id="admins-heading"
            intro="Admins created from the terminal (pnpm admin:create) can only be changed there. Nobody can change or remove their own account here."
          >
            {`${admins.length} admin${admins.length === 1 ? "" : "s"}`}
          </SectionHeading>
          <ul className="space-y-6">
            {admins.map((entry) => {
              const self = entry.id === admin.userId;
              const manageable = !self && entry.addedBy !== null;
              return (
                <li key={entry.id}>
                  <Panel title={entry.addedBy === null ? "owner" : "admin"}>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                      <p className="font-bold">{entry.name}</p>
                      <p className="text-sm break-all">{entry.email}</p>
                      {self && <Badge tone="accent">you</Badge>}
                      {entry.addedBy === null && (
                        <Badge tone="amber">terminal only</Badge>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted">
                      {entry.addedBy === null
                        ? "Created with pnpm admin:create"
                        : `Added by ${entry.addedBy}`}{" "}
                      on {formatDateTime(entry.createdAt)}
                    </p>
                    {manageable && (
                      <div className="mt-5 grid gap-6 border-t border-dashed border-line pt-4 md:grid-cols-[2fr_1fr]">
                        <ActionForm
                          action={setAdminPassword}
                          submitLabel="Set password"
                          variant="secondary"
                          resetOnSuccess
                        >
                          <input type="hidden" name="userId" value={entry.id} />
                          <div className="grid gap-5 sm:grid-cols-2">
                            <Field
                              id={`password-${entry.id}`}
                              label="New password"
                              name="password"
                              type="password"
                              required
                              minLength={12}
                              maxLength={128}
                              autoComplete="new-password"
                            />
                            <Field
                              id={`confirm-${entry.id}`}
                              label="Repeat password"
                              name="confirmPassword"
                              type="password"
                              required
                              maxLength={128}
                              autoComplete="new-password"
                            />
                          </div>
                        </ActionForm>
                        <ActionForm
                          action={removeAdmin}
                          submitLabel="Remove admin"
                          variant="danger"
                          confirmLabel="Confirm remove"
                          className="self-end"
                        >
                          <input type="hidden" name="userId" value={entry.id} />
                        </ActionForm>
                      </div>
                    )}
                  </Panel>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
