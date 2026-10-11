"use client";

import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type {
  Answers,
  PublicQuiz,
  QuizResult,
  SubmitQuizResult,
} from "@/lib/quiz/types";
import { ProgressBar } from "./progress-bar";
import { difficultyTone } from "./quiz-card";
import { QuizResults } from "./quiz-results";

type QuizRunnerProps = {
  quiz: PublicQuiz;
  /** Server Action that scores the answers. */
  submit: (answers: Answers) => Promise<SubmitQuizResult>;
};

export function QuizRunner({ quiz, submit }: QuizRunnerProps) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [result, setResult] = useState<QuizResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const total = quiz.questions.length;
  const question = quiz.questions[index];
  const selected = answers[question.id];
  const isLast = index === total - 1;

  function handleSubmit() {
    setError(null);
    startTransition(async () => {
      try {
        const response = await submit(answers);
        if (response.ok) setResult(response.result);
        else setError(response.error);
      } catch {
        setError(
          "Could not reach the server. Check your connection and retry.",
        );
      }
    });
  }

  function restart() {
    setIndex(0);
    setAnswers({});
    setResult(null);
    setError(null);
  }

  if (result) {
    return <QuizResults quiz={quiz} result={result} onRestart={restart} />;
  }

  return (
    <Panel title={`${quiz.slug}.quiz`}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          if (isLast) handleSubmit();
          else setIndex(index + 1);
        }}
      >
        <div className="flex items-center justify-between gap-4 text-sm text-muted">
          <p aria-live="polite">
            Question {index + 1} of {total}
          </p>
          <Badge tone={difficultyTone[quiz.difficulty]}>
            {quiz.difficulty}
          </Badge>
        </div>

        {/* key: remount per question so the radio group starts clean. */}
        <fieldset key={question.id} className="mt-5">
          <legend className="text-lg font-bold">{question.prompt}</legend>
          <div className="mt-5 space-y-2.5">
            {question.options.map((option) => {
              const checked = selected === option.id;
              return (
                <label
                  key={option.id}
                  className="flex min-h-11 cursor-pointer items-center gap-3 border border-line px-3 py-2 transition-colors duration-100 hover:border-accent has-checked:border-accent has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
                >
                  <input
                    type="radio"
                    name={question.id}
                    value={option.id}
                    checked={checked}
                    onChange={() =>
                      setAnswers({ ...answers, [question.id]: option.id })
                    }
                    className="sr-only"
                  />
                  <span aria-hidden="true" className="shrink-0">
                    {checked ? "(x)" : "( )"}
                  </span>
                  <span>{option.text}</span>
                </label>
              );
            })}
          </div>
        </fieldset>

        <ProgressBar value={index + 1} max={total} className="mt-6" />

        {error && (
          <p role="alert" className="mt-4 text-sm text-danger">
            ! {error}
          </p>
        )}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
          <Button
            variant="secondary"
            disabled={index === 0 || pending}
            onClick={() => setIndex(index - 1)}
          >
            Back
          </Button>
          <Button
            type="submit"
            disabled={!selected || pending}
            aria-busy={pending}
          >
            {pending ? "... Scoring" : isLast ? "Submit answers" : "Next"}
          </Button>
        </div>
      </form>
    </Panel>
  );
}
