import type { Metadata } from "next";
import { ContactForm } from "@/components/contact/contact-form";
import { PeopleGrid } from "@/components/people/person-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { getEventInfo, getPeople } from "@/lib/db/queries/content";

export const metadata: Metadata = {
  title: "Contact Us",
  description: "Reach the TechBash technical lead and faculty coordinators.",
};

export default async function ContactPage() {
  const [info, people] = await Promise.all([getEventInfo(), getPeople()]);
  const faculty = people.filter((person) => person.kind === "faculty");

  return (
    <>
      <PageHeading command="./techbash --contact" title="Contact Us">
        Questions about the event, the rounds or your login? Reach the
        organizers directly or send a message.
      </PageHeading>

      <div className="space-y-16">
        <section aria-labelledby="lead-heading">
          <SectionHeading id="lead-heading">Technical lead</SectionHeading>
          <Panel title="lead">
            <p className="text-lg font-bold">{info.leadName}</p>
            <p className="text-sm tracking-[0.08em] text-accent uppercase">
              Technical Lead
            </p>
            <dl className="mt-4 space-y-1 text-sm">
              <div className="flex flex-wrap gap-x-2">
                <dt className="text-muted">Email:</dt>
                <dd className="min-w-0 break-all">
                  <a
                    href={`mailto:${info.leadEmail}`}
                    className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
                  >
                    {info.leadEmail}
                  </a>
                </dd>
              </div>
              {info.leadPhone && (
                <div className="flex flex-wrap gap-x-2">
                  <dt className="text-muted">Phone:</dt>
                  <dd>
                    <a
                      href={`tel:${info.leadPhone.replace(/[^0-9+]/g, "")}`}
                      className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
                    >
                      {info.leadPhone}
                    </a>
                  </dd>
                </div>
              )}
            </dl>
          </Panel>
        </section>

        <section aria-labelledby="faculty-heading">
          <SectionHeading id="faculty-heading">Faculty members</SectionHeading>
          <PeopleGrid people={faculty} showContact />
        </section>

        <section aria-labelledby="message-heading">
          <SectionHeading id="message-heading">Send a message</SectionHeading>
          <div className="grid gap-10 lg:grid-cols-[2fr_1fr] lg:gap-8">
            <ContactForm />
            <Panel title="readme" className="self-start">
              <h3 className="text-base">What happens to your message</h3>
              <ul className="mt-3 space-y-2 text-sm text-muted">
                <li>
                  &gt; It is checked in your browser and again on the server.
                </li>
                <li>
                  &gt; It is stored for the organizers, who read it in the admin
                  panel.
                </li>
                <li>
                  &gt; No email is sent. For urgent issues, email the technical
                  lead.
                </li>
              </ul>
            </Panel>
          </div>
        </section>
      </div>
    </>
  );
}
