import type { Metadata } from "next";
import { QuizRunner } from "@/components/quiz/quiz-runner";
import { PageHeading } from "@/components/ui/page-heading";
import { demoQuiz } from "@/lib/quiz/demo-quiz";
import { toPublicQuiz } from "@/lib/quiz/scoring";
import { submitDemoQuiz } from "./actions";

export const metadata: Metadata = {
  title: `${demoQuiz.title} (demo)`,
  description: demoQuiz.description,
};

export default function DemoQuizPage() {
  return (
    <>
      <PageHeading
        command={`./techbash --run ${demoQuiz.slug}`}
        title={demoQuiz.title}
      >
        {demoQuiz.description} This is the demo quiz: it is scored on the server
        and nothing is saved.
      </PageHeading>
      {/* Only the public shape crosses to the client: no answer keys. */}
      <QuizRunner quiz={toPublicQuiz(demoQuiz)} submit={submitDemoQuiz} />
    </>
  );
}
