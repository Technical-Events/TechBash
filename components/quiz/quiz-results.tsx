import { Check, X } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { PublicQuiz, QuizResult } from "@/lib/quiz/types";
import { ProgressBar } from "./progress-bar";

type QuizResultsProps = {
  quiz: PublicQuiz;
  result: QuizResult;
  onRestart: () => void;
};

function verdict(percent: number) {
  if (percent === 100) return "Perfect run.";
  if (percent >= 60) return "Solid. Check the misses below.";
  return "Worth another pass. The explanations below will help.";
}

export function QuizResults({ quiz, result, onRestart }: QuizResultsProps) {
  return (
    <div className="space-y-10">
      <Panel title="result">
        {/* Announced when the results replace the question form. */}
        <div role="status">
          <h2 className="text-lg sm:text-xl">
            Score: {result.score}/{result.total}{" "}
            <span className="text-accent">({result.percent}%)</span>
          </h2>
          <p className="mt-2 text-muted">{verdict(result.percent)}</p>
        </div>
        <ProgressBar value={result.score} max={result.total} className="mt-4" />
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button onClick={onRestart}>Retry</Button>
          <ButtonLink href="/test" variant="secondary">
            Back to tests
          </ButtonLink>
        </div>
      </Panel>

      <section aria-labelledby="review-heading">
        <h2 id="review-heading" className="mb-6 text-lg sm:text-xl">
          <span aria-hidden="true" className="text-accent">
            #{" "}
          </span>
          Review
        </h2>
        <ol className="space-y-8">
          {quiz.questions.map((question, index) => {
            const review = result.review.find(
              (r) => r.questionId === question.id,
            );
            if (!review) return null;
            const textOf = (id: string | null) =>
              question.options.find((o) => o.id === id)?.text ?? "No answer";
            return (
              <li key={question.id}>
                <Panel title={`q${index + 1}`}>
                  <p
                    className={`flex items-center gap-2 text-sm font-bold tracking-[0.08em] uppercase ${review.isCorrect ? "text-accent" : "text-danger"}`}
                  >
                    {review.isCorrect ? (
                      <Check aria-hidden="true" size={16} />
                    ) : (
                      <X aria-hidden="true" size={16} />
                    )}
                    {review.isCorrect ? "Correct" : "Incorrect"}
                  </p>
                  <h3 className="mt-2 text-base normal-case">
                    {question.prompt}
                  </h3>
                  <dl className="mt-3 space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="shrink-0 text-muted">Your answer:</dt>
                      <dd>{textOf(review.selectedOptionId)}</dd>
                    </div>
                    {!review.isCorrect && (
                      <div className="flex gap-2">
                        <dt className="shrink-0 text-muted">Correct answer:</dt>
                        <dd className="text-accent">
                          {textOf(review.correctOptionId)}
                        </dd>
                      </div>
                    )}
                  </dl>
                  <p className="mt-3 text-sm text-muted">
                    # {review.explanation}
                  </p>
                </Panel>
              </li>
            );
          })}
        </ol>
      </section>
    </div>
  );
}
