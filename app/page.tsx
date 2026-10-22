import { Hero } from "@/components/home/hero";
import { RoundsOverview } from "@/components/home/rounds-overview";
import { PeopleGrid } from "@/components/people/person-card";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import {
  getEventInfo,
  getPeople,
  getRoundSummaries,
} from "@/lib/db/queries/content";

const steps = [
  [
    "01",
    "Log in",
    "Open Test and enter your full name and USN exactly as registered.",
  ],
  [
    "02",
    "Get the key",
    "Each round has its own access key, announced at the venue when the round opens.",
  ],
  [
    "03",
    "Unlock and answer",
    "Enter the key to start the round. The timer starts when the round unlocks.",
  ],
  [
    "04",
    "Submit",
    "Submit before time runs out. Unsubmitted rounds are submitted automatically at the deadline.",
  ],
];

export default async function HomePage() {
  const [info, people, rounds] = await Promise.all([
    getEventInfo(),
    getPeople(),
    getRoundSummaries(),
  ]);
  const faculty = people.filter((person) => person.kind === "faculty");
  const team = people.filter((person) => person.kind === "team");

  return (
    <div className="space-y-16 sm:space-y-24">
      <Hero info={info} />

      <section aria-labelledby="event-heading">
        <SectionHeading id="event-heading">About the event</SectionHeading>
        <div className="grid gap-10 md:grid-cols-2 md:gap-8">
          <Panel title="details.txt" className="self-start">
            <p className="whitespace-pre-line text-muted">{info.details}</p>
          </Panel>
          <ol className="space-y-6">
            {steps.map(([number, title, text]) => (
              <li key={number} className="flex gap-4">
                <span aria-hidden="true" className="font-bold text-accent">
                  {number}
                </span>
                <div>
                  <h3 className="text-base">{title}</h3>
                  <p className="mt-1 text-muted">{text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section aria-labelledby="rounds-heading">
        <SectionHeading
          id="rounds-heading"
          intro="Three rounds, each unlocked with its own access key."
        >
          The rounds
        </SectionHeading>
        <RoundsOverview rounds={rounds} />
      </section>

      <section aria-labelledby="faculty-heading">
        <SectionHeading id="faculty-heading">
          Faculty coordinators
        </SectionHeading>
        <PeopleGrid people={faculty} />
      </section>

      <section aria-labelledby="team-heading">
        <SectionHeading id="team-heading">The team</SectionHeading>
        {team.length > 0 ? (
          <PeopleGrid people={team} />
        ) : (
          <Panel dashed>
            <p className="text-muted">
              # Team members will be listed here soon.
            </p>
          </Panel>
        )}
      </section>
    </div>
  );
}
