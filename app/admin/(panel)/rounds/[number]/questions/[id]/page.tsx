import type { Metadata } from "next";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { z } from "zod";
import { deleteQuestion } from "@/app/admin/(panel)/rounds/actions";
import { QuestionForm } from "@/components/admin/question-form";
import { ActionForm } from "@/components/ui/action-form";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { requireAdminDb } from "@/lib/auth/session";
import { getRoundQuestions } from "@/lib/db/queries/attempts";
import { rounds } from "@/lib/db/schema";
import { roundNumberSchema } from "@/lib/validations/rounds";

export const metadata: Metadata = { title: "Edit question" };

export default async function EditQuestionPage(
  props: PageProps<"/admin/rounds/[number]/questions/[id]">,
) {
  const { db } = await requireAdminDb();
  const params = await props.params;
  const number = roundNumberSchema.safeParse(params.number);
  const id = z.uuid().safeParse(params.id);
  if (!number.success || !id.success) notFound();
  const [round] = await db
    .select()
    .from(rounds)
    .where(eq(rounds.number, number.data));
  if (!round) notFound();
  const list = await getRoundQuestions(db, round.id);
  const index = list.findIndex((q) => q.id === id.data);
  if (index === -1) notFound();

  return (
    <>
      <PageHeading
        command={`./admin --round ${round.number} --edit ${index + 1}`}
        title={`Question ${index + 1}`}
      >
        Round {round.number}: {round.title}. Saving re-scores answers already
        given.
      </PageHeading>
      <div className="space-y-10">
        <Panel title="question">
          <QuestionForm
            roundNumber={round.number}
            sequential={round.sequential}
            question={list[index]}
          />
        </Panel>
        <Panel title="danger zone" dashed>
          <p className="mb-4 text-sm text-muted">
            # Deleting removes every answer given to this question and changes
            scores.
          </p>
          <ActionForm
            action={deleteQuestion}
            submitLabel="Delete question"
            variant="danger"
            confirmLabel="Confirm delete"
          >
            <input type="hidden" name="round" value={round.number} />
            <input type="hidden" name="questionId" value={list[index].id} />
          </ActionForm>
        </Panel>
        <ButtonLink
          href={`/admin/rounds/${round.number}#questions`}
          variant="secondary"
        >
          Back to round
        </ButtonLink>
      </div>
    </>
  );
}
