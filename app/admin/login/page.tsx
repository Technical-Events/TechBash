import type { Metadata } from "next";
import { Suspense } from "react";
import { redirect } from "next/navigation";
import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import { Loading } from "@/components/ui/loading";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { getViewer } from "@/lib/auth/session";
import { adminLogin } from "./actions";

export const metadata: Metadata = {
  title: "Admin login",
  robots: { index: false },
};

/** Signed-in admins skip the form. */
async function AlreadySignedIn() {
  const viewer = await getViewer();
  if (viewer?.role === "admin") redirect("/admin");
  return null;
}

export default function AdminLoginPage() {
  return (
    <>
      <PageHeading command="sudo ./techbash --admin" title="Admin login">
        Organizers only. Participants log in on the Test page.
      </PageHeading>
      <Suspense fallback={<Loading label="Checking your session" />}>
        <AlreadySignedIn />
      </Suspense>
      <Panel title="authenticate" className="max-w-xl">
        <ActionForm
          action={adminLogin}
          submitLabel="Sign in"
          pendingLabel="... Verifying"
        >
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="username"
            required
            maxLength={254}
          />
          <Field
            label="Password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            maxLength={256}
          />
        </ActionForm>
      </Panel>
    </>
  );
}
