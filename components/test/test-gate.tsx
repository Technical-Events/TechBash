import { loginParticipant } from "@/app/test/actions";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import { getAuth } from "@/lib/auth/server";
import { getViewer } from "@/lib/auth/session";
import { getDb } from "@/lib/db";
import { getParticipantRounds } from "@/lib/db/queries/attempts";
import { getEventInfo } from "@/lib/db/queries/content";
import { ParticipantDashboard } from "./participant-dashboard";

/** Login form, or the participant's rounds once signed in. Request-time. */
export async function TestGate() {
  const db = getDb();
  if (!getAuth() || !db) {
    return (
      <Panel title="offline" dashed>
        <p className="text-amber">
          ! Sign-in is not available on this deployment.
        </p>
        <p className="mt-2 text-sm text-muted">
          The database or auth secret is not configured. Ask an organizer.
        </p>
      </Panel>
    );
  }

  const viewer = await getViewer();
  if (viewer?.role === "admin") {
    return (
      <Panel title="admin">
        <p>
          You are signed in as an administrator. The test is for participants.
        </p>
        <ButtonLink href="/admin" className="mt-5">
          Open admin panel
        </ButtonLink>
      </Panel>
    );
  }

  if (viewer?.role === "participant") {
    const [rounds, info] = await Promise.all([
      getParticipantRounds(db, viewer.participantId),
      getEventInfo(),
    ]);
    return (
      <ParticipantDashboard
        viewer={viewer}
        rounds={rounds}
        resultsPublished={info.resultsPublished}
      />
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-[3fr_2fr] lg:gap-8">
      <Panel title="login">
        <ActionForm
          action={loginParticipant}
          submitLabel="Log in"
          pendingLabel="... Checking"
        >
          <Field
            label="Full name"
            name="fullName"
            autoComplete="name"
            required
            maxLength={100}
            hint="As registered with the organizers."
          />
          <Field
            label="USN"
            name="usn"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
            required
            maxLength={40}
            hint="University Seat Number, for example 4JK22CS001."
          />
        </ActionForm>
      </Panel>
      <Panel title="readme" className="self-start">
        <ul className="space-y-2 text-sm text-muted">
          <li>&gt; Only registered participants can log in.</li>
          <li>&gt; Logging in on another device ends your earlier session.</li>
          <li>
            &gt; Each round needs its own access key, announced at the venue.
          </li>
          <li>&gt; Answers are saved on the server as you go.</li>
        </ul>
      </Panel>
    </div>
  );
}
