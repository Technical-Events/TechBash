import type { Metadata } from "next";
import Link from "next/link";
import {
  addParticipant,
  importParticipants,
} from "@/app/admin/(panel)/participants/actions";
import { AttemptCell } from "@/components/admin/attempt-cell";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { SectionHeading } from "@/components/ui/section-heading";
import { EmptyRow, Table } from "@/components/ui/table";
import { requireAdminDb } from "@/lib/auth/session";
import { getResultsData } from "@/lib/db/queries/results";
import { formatDateTime } from "@/lib/format";
import { MAX_ROSTER_IMPORT } from "@/lib/participants/roster";

export const metadata: Metadata = { title: "Participants" };

export default async function ParticipantsPage(
  props: PageProps<"/admin/participants">,
) {
  const { db } = await requireAdminDb();
  const query = (await props.searchParams).q;
  const q =
    typeof query === "string" ? query.trim().toLowerCase().slice(0, 100) : "";
  const data = await getResultsData(db);
  const rows = q
    ? data.participants.filter(
        (p) =>
          p.usn.toLowerCase().includes(q) ||
          p.fullName.toLowerCase().includes(q),
      )
    : data.participants;
  const rankOf = new Map(data.ranked.map((r) => [r.participantId, r]));

  return (
    <>
      <PageHeading command="./admin --participants" title="Participants">
        The approved roster. Only these USNs can log in.
      </PageHeading>

      <div className="space-y-16">
        <div className="grid gap-10 lg:grid-cols-2 lg:gap-8">
          <Panel title="add one">
            <ActionForm
              action={addParticipant}
              submitLabel="Add participant"
              resetOnSuccess
            >
              <Field
                label="USN"
                name="usn"
                required
                maxLength={40}
                autoComplete="off"
                spellCheck={false}
              />
              <Field
                label="Full name"
                name="fullName"
                required
                maxLength={100}
                autoComplete="off"
              />
            </ActionForm>
          </Panel>
          <Panel title="import list">
            <ActionForm
              action={importParticipants}
              submitLabel="Import"
              pendingLabel="... Importing"
              resetOnSuccess
            >
              <Field
                label="One per line: USN,Full Name"
                name="roster"
                multiline
                rows={8}
                required
                spellCheck={false}
                placeholder={"4JK22CS001,Asha K\n4JK22CS002,Ravi Kumar"}
                hint={`Comma or tab separated (paste from a spreadsheet). Up to ${MAX_ROSTER_IMPORT} rows. Existing USNs are skipped.`}
              />
            </ActionForm>
          </Panel>
        </div>

        <section aria-labelledby="roster-heading">
          <SectionHeading
            id="roster-heading"
            intro={`${data.participants.length} registered, ${data.participants.filter((p) => p.lastLoginAt).length} have logged in. OK = submitted, ... = in progress, * = submitted automatically.`}
          >
            Roster
          </SectionHeading>
          <form role="search" className="mb-6 flex flex-wrap items-end gap-3">
            <Field
              label="Search USN or name"
              name="q"
              type="search"
              defaultValue={q}
              maxLength={100}
              className="min-w-0 flex-1 sm:max-w-sm"
            />
            <button
              type="submit"
              className="min-h-11 border border-line px-4 text-sm font-bold tracking-[0.08em] uppercase hover:border-accent hover:text-accent"
            >
              [ Search ]
            </button>
            {q && (
              <Link
                href="/admin/participants"
                className="flex min-h-11 items-center text-sm text-muted hover:text-accent"
              >
                Clear
              </Link>
            )}
          </form>
          <Table
            caption="Participants"
            head={[
              "USN",
              "Name",
              "Last login",
              ...data.rounds.map((r) => `R${r.number}`),
              data.currentRound === null
                ? "Rank"
                : `Rank (R${data.currentRound})`,
              "",
            ]}
          >
            {rows.length === 0 && (
              <EmptyRow colSpan={5 + data.rounds.length}>
                {q ? "No match." : "No participants yet."}
              </EmptyRow>
            )}
            {rows.map((p) => {
              const ranked = rankOf.get(p.id);
              return (
                <tr key={p.id}>
                  <td className="font-bold whitespace-nowrap">{p.usn}</td>
                  <td className="min-w-[16ch]">{p.fullName}</td>
                  <td className="whitespace-nowrap text-muted">
                    {p.lastLoginAt ? formatDateTime(p.lastLoginAt) : "never"}
                  </td>
                  {data.rounds.map((round) => (
                    <td
                      key={round.id}
                      className="whitespace-nowrap tabular-nums"
                    >
                      <AttemptCell
                        attempt={data.attempts.find(
                          (a) =>
                            a.participantId === p.id && a.roundId === round.id,
                        )}
                      />
                    </td>
                  ))}
                  <td className="tabular-nums font-bold">
                    {ranked?.rank ?? "-"}
                  </td>
                  <td>
                    <ButtonLink
                      href={`/admin/participants/${p.id}`}
                      variant="secondary"
                    >
                      View
                    </ButtonLink>
                  </td>
                </tr>
              );
            })}
          </Table>
        </section>
      </div>
    </>
  );
}
