import type { Metadata } from "next";
import { updateEventInfo } from "@/app/admin/(panel)/content/actions";
import { PersonForm } from "@/components/admin/person-form";
import { ActionForm } from "@/components/ui/action-form";
import { Checkbox, Field } from "@/components/ui/field";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { requireAdminDb } from "@/lib/auth/session";
import { getEventInfo, getPeople } from "@/lib/db/queries/content";

export const metadata: Metadata = { title: "Content" };

export default async function ContentPage() {
  await requireAdminDb();
  const [info, people] = await Promise.all([getEventInfo(), getPeople()]);
  const photosEnabled = Boolean(process.env.BLOB_READ_WRITE_TOKEN);
  const groups = [
    {
      kind: "faculty",
      title: "Faculty",
      list: people.filter((p) => p.kind === "faculty"),
    },
    {
      kind: "team",
      title: "Team members",
      list: people.filter((p) => p.kind === "team"),
    },
  ];

  return (
    <>
      <PageHeading command="./admin --content" title="Content">
        Event details, contact information and the people shown on Home and
        Contact Us. Changes go live immediately.
      </PageHeading>

      <div className="space-y-16">
        <section aria-labelledby="event-heading">
          <SectionHeading id="event-heading">Event details</SectionHeading>
          <Panel title="event.conf">
            <ActionForm
              action={updateEventInfo}
              submitLabel="Save event details"
              pendingLabel="... Saving"
            >
              <div className="grid gap-5 sm:grid-cols-2">
                <Field
                  label="Event name"
                  name="name"
                  required
                  maxLength={80}
                  defaultValue={info.name}
                />
                <Field
                  label="Tagline"
                  name="tagline"
                  maxLength={160}
                  defaultValue={info.tagline}
                />
                <Field
                  label="Date and time"
                  name="eventDate"
                  maxLength={120}
                  defaultValue={info.eventDate}
                  placeholder="14 Nov 2026, 10:00 AM"
                />
                <Field
                  label="Venue"
                  name="venue"
                  maxLength={200}
                  defaultValue={info.venue}
                />
              </div>
              <Field
                label="Organizer"
                name="organizer"
                maxLength={200}
                defaultValue={info.organizer}
              />
              <Field
                label="Introduction"
                name="introduction"
                multiline
                rows={4}
                maxLength={2000}
                defaultValue={info.introduction}
              />
              <Field
                label="Details"
                name="details"
                multiline
                rows={5}
                maxLength={4000}
                defaultValue={info.details}
                hint="Rules, prizes, schedule. Line breaks are kept."
              />
              <div className="grid gap-5 sm:grid-cols-3">
                <Field
                  label="Technical lead"
                  name="leadName"
                  required
                  maxLength={100}
                  defaultValue={info.leadName}
                />
                <Field
                  label="Lead email"
                  name="leadEmail"
                  type="email"
                  required
                  maxLength={254}
                  defaultValue={info.leadEmail}
                />
                <Field
                  label="Lead phone"
                  name="leadPhone"
                  type="tel"
                  maxLength={30}
                  defaultValue={info.leadPhone}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2 sm:items-end">
                <Field
                  label="Winner places"
                  name="winnerCount"
                  type="number"
                  min={1}
                  max={20}
                  required
                  defaultValue={info.winnerCount}
                />
                <Checkbox
                  label="Show participants their scores"
                  name="resultsPublished"
                  defaultChecked={info.resultsPublished}
                  hint="Off during the event keeps answers from leaking."
                />
              </div>
            </ActionForm>
          </Panel>
        </section>

        {groups.map(({ kind, title, list }) => (
          <section key={kind} aria-labelledby={`${kind}-heading`}>
            <SectionHeading id={`${kind}-heading`}>{title}</SectionHeading>
            {list.length === 0 && (
              <p className="mb-6 text-sm text-muted"># None yet.</p>
            )}
            <ul className="space-y-8">
              {list.map((person) => (
                <li key={person.id}>
                  <Panel title={person.name}>
                    <PersonForm person={person} photosEnabled={photosEnabled} />
                  </Panel>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section aria-labelledby="add-heading">
          <SectionHeading id="add-heading">Add a profile</SectionHeading>
          <Panel title="new">
            <PersonForm photosEnabled={photosEnabled} />
          </Panel>
        </section>
      </div>
    </>
  );
}
