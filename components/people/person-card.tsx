import Image from "next/image";
import { Panel } from "@/components/ui/panel";
import type { Person } from "@/lib/content/defaults";

function initials(name: string) {
  return name
    .replace(/ma'am|sir|dr\.?|prof\.?/gi, "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join("");
}

/** Square photo, or an ASCII frame with initials when there is none. */
export function PersonPhoto({ person }: { person: Person }) {
  return (
    <div className="relative aspect-square w-full overflow-hidden border border-line bg-surface">
      {person.photoUrl ? (
        <Image
          src={person.photoUrl}
          alt={`Photo of ${person.name}`}
          fill
          sizes="(min-width: 1024px) 300px, (min-width: 640px) 45vw, 90vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="ascii-grid flex h-full items-center justify-center text-4xl font-bold text-muted"
        >
          [{initials(person.name) || "?"}]
        </div>
      )}
    </div>
  );
}

export function PersonCard({
  person,
  showContact,
}: {
  person: Person;
  /** Shows email and phone (Contact page). */
  showContact?: boolean;
}) {
  return (
    <Panel
      title={person.kind === "faculty" ? "faculty" : "team"}
      className="flex h-full flex-col"
    >
      <PersonPhoto person={person} />
      <h3 className="mt-4 text-base normal-case">{person.name}</h3>
      {person.role && (
        <p className="text-sm tracking-[0.08em] text-accent uppercase">
          {person.role}
        </p>
      )}
      {person.department && (
        <p className="mt-1 text-sm text-muted">{person.department}</p>
      )}
      {person.bio && <p className="mt-3 text-sm text-muted">{person.bio}</p>}
      {showContact && (person.email || person.phone) && (
        <dl className="mt-4 space-y-1 border-t border-dashed border-line pt-3 text-sm">
          {person.email && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Email:</dt>
              <dd className="min-w-0 break-all">
                <a
                  href={`mailto:${person.email}`}
                  className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
                >
                  {person.email}
                </a>
              </dd>
            </div>
          )}
          {person.phone && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="text-muted">Phone:</dt>
              <dd>
                <a
                  href={`tel:${person.phone.replace(/[^0-9+]/g, "")}`}
                  className="inline-flex min-h-11 items-center text-accent underline-offset-4 hover:underline"
                >
                  {person.phone}
                </a>
              </dd>
            </div>
          )}
        </dl>
      )}
    </Panel>
  );
}

export function PeopleGrid({
  people,
  showContact,
}: {
  people: Person[];
  showContact?: boolean;
}) {
  return (
    <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {people.map((person) => (
        <li key={person.id}>
          <PersonCard person={person} showContact={showContact} />
        </li>
      ))}
    </ul>
  );
}
