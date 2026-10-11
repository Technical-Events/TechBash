import type { Metadata } from "next";
import { QuizGrid } from "@/components/quiz/quiz-card";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";
import { catalog } from "@/lib/quiz/catalog";

export const metadata: Metadata = {
  title: "Test",
  description: "Pick a TechBash quiz and test your technical knowledge.",
};

const rules = [
  "Each quiz is a short set of multiple-choice questions with one correct answer.",
  "You see one question at a time and can go back before you submit.",
  "Answers are checked on the server. The answer key is not sent to your browser until you submit.",
  "After submitting you get a score and an explanation for every question.",
];

export default function TestPage() {
  return (
    <>
      <PageHeading command="./techbash --list-tests" title="Test">
        Short quizzes on technical topics. Pick one, answer the questions and
        read your review.
      </PageHeading>

      <div className="space-y-14">
        <Panel title="how it works">
          <ol className="space-y-2">
            {rules.map((rule, index) => (
              <li key={rule} className="flex gap-3">
                <span aria-hidden="true" className="font-bold text-accent">
                  {String(index + 1).padStart(2, "0")}
                </span>
                <span>{rule}</span>
              </li>
            ))}
          </ol>
          <p className="mt-5 border-t border-dashed border-line pt-4 text-sm text-amber">
            ! Preview build. Only the quiz marked [DEMO] can be taken. Results
            are not saved, so it is not suitable for real assessments.
          </p>
        </Panel>

        <section aria-labelledby="catalog-heading">
          <h2 id="catalog-heading" className="mb-8 text-lg sm:text-xl">
            <span aria-hidden="true" className="text-accent">
              #{" "}
            </span>
            Available tests
          </h2>
          <QuizGrid entries={catalog} />
        </section>
      </div>
    </>
  );
}
