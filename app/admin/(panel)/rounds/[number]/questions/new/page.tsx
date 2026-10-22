import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { QuestionForm } from "@/components/admin/question-form";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { requireAdminDb } from "@/lib/auth/session";
import { rounds } from "@/lib/db/schema";
import { roundNumberSchema } from "@/lib/validations/rounds";

export const metadata: Metadata = { title: "New question" };

export default async function NewQuestionPage(
  props: PageProps<"/admin/rounds/[number]/questions/new">,
) {
  const { db } = await requireAdminDb();
  const number = roundNumberSchema.safeParse((await props.params).number);
  if (!number.success) notFound();
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.number, number.data));
  if (!round) notFound();

  return (
    <>
      <PageHeading
        command={`./admin --round ${round.number} --add`}
        title="New question"
      >
        Round {round.number}: {round.title}
      </PageHeading>
      <Panel title="question">
        <QuestionForm
          roundNumber={round.number}
          sequential={round.sequential}
        />
      </Panel>
      <ButtonLink
        href={`/admin/rounds/${round.number}#questions`}
        variant="secondary"
        className="mt-8"
      >
        Back to round
      </ButtonLink>
    </>
  );
}
