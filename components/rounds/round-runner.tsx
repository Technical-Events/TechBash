"use client";

import { useRouter } from "next/navigation";
import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import { saveAnswer, submitRound } from "@/app/test/actions";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { SavedAnswer } from "@/lib/db/queries/attempts";
import type { PublicQuestion } from "@/lib/rounds/types";
import { cn } from "@/lib/utils";
import { ProgressBar } from "./progress-bar";

type RoundRunnerProps = {
  roundNumber: number;
  sequential: boolean;
  questions: PublicQuestion[];
  initialAnswers: Record<string, SavedAnswer>;
  totalQuestions: number;
  solvedCount: number;
  deadlineAt: string | null;
  /** Server clock at render, to correct a wrong device clock. */
  serverNow: string;
};

function pad(n: number) {
  return String(n).padStart(2, "0");
}

/** Countdown to the deadline. Calls `onExpire` once when it reaches zero. */
function Countdown({
  deadlineAt,
  serverNow,
  onExpire,
}: {
  deadlineAt: string;
  serverNow: string;
  onExpire: () => void;
}) {
  const [offset] = useState(() => new Date(serverNow).getTime() - Date.now());
  const deadline = new Date(deadlineAt).getTime();
  const [remaining, setRemaining] = useState(
    () => deadline - (Date.now() + offset),
  );
  const fired = useRef(false);

  useEffect(() => {
    const timer = setInterval(() => {
      const left = deadline - (Date.now() + offset);
      setRemaining(left);
      if (left <= 0 && !fired.current) {
        fired.current = true;
        onExpire();
      }
    }, 1000);
    return () => clearInterval(timer);
  }, [deadline, offset, onExpire]);

  const seconds = Math.max(0, Math.ceil(remaining / 1000));
  const low = seconds <= 120;
  const minutesLeft = Math.ceil(seconds / 60);
  return (
    <>
      <p
        className={cn(
          "text-sm font-bold tracking-[0.08em] tabular-nums uppercase",
          low ? "text-danger" : "text-amber",
        )}
      >
        <span aria-hidden="true">
          [TIME {pad(Math.floor(seconds / 60))}:{pad(seconds % 60)}]
        </span>
        <span className="sr-only">Time left: {minutesLeft} minutes</span>
      </p>
      {/* Announces only the milestones, not every second. */}
      <p aria-live="polite" className="sr-only">
        {seconds > 0 && (minutesLeft === 5 || minutesLeft === 1)
          ? `${minutesLeft} minute${minutesLeft === 1 ? "" : "s"} left`
          : seconds === 0
            ? "Time is up"
            : ""}
      </p>
    </>
  );
}

function QuestionBody({
  question,
  label,
}: {
  question: PublicQuestion;
  label: string;
}) {
  return (
    <>
      <p className="text-sm text-muted">
        {label}{" "}
        <span className="text-xs">
          ({question.points} pt{question.points === 1 ? "" : "s"})
        </span>
      </p>
      <p className="mt-2 text-lg font-bold whitespace-pre-wrap">
        {question.prompt}
      </p>
      {question.code && (
        <figure className="mt-4">
          {question.codeLanguage && (
            <figcaption className="text-xs tracking-[0.08em] text-muted uppercase">
              # {question.codeLanguage}
            </figcaption>
          )}
          <pre
            tabIndex={0}
            className="mt-1 max-h-[60vh] overflow-auto border border-line bg-surface p-3 text-sm leading-relaxed"
          >
            <code>
              {question.code.split("\n").map((line, index) => (
                // Long lines wrap (phones) under their own number, so no
                // part of the code hides behind a sideways scroll.
                <span key={index} className="grid grid-cols-[3ch_1fr] gap-x-3">
                  <span
                    aria-hidden="true"
                    className="text-right text-muted select-none"
                  >
                    {index + 1}
                  </span>
                  <span className="whitespace-pre-wrap [overflow-wrap:anywhere]">
                    {line || " "}
                  </span>
                </span>
              ))}
            </code>
          </pre>
        </figure>
      )}
    </>
  );
}

function AnswerInput({
  question,
  value,
  onChange,
  disabled,
}: {
  question: PublicQuestion;
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}) {
  if (question.type === "single_choice") {
    return (
      <fieldset className="mt-5" disabled={disabled}>
        <legend className="sr-only">Options</legend>
        <div className="space-y-2.5">
          {question.options.map((option) => {
            const checked = value === option.id;
            return (
              <label
                key={option.id}
                className="flex min-h-11 cursor-pointer items-center gap-3 border border-line px-3 py-2 transition-colors duration-100 hover:border-accent has-checked:border-accent has-checked:text-accent has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent"
              >
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={option.id}
                  checked={checked}
                  onChange={() => onChange(option.id)}
                  className="sr-only"
                />
                <span aria-hidden="true" className="shrink-0">
                  {checked ? "(x)" : "( )"}
                </span>
                <span className="whitespace-pre-wrap">{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <div className="mt-5">
      <label
        htmlFor={`answer-${question.id}`}
        className="mb-1.5 block text-sm font-bold tracking-[0.08em] uppercase"
      >
        <span aria-hidden="true" className="text-accent">
          &gt;{" "}
        </span>
        Your answer
      </label>
      <input
        id={`answer-${question.id}`}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        maxLength={300}
        autoComplete="off"
        spellCheck={false}
        disabled={disabled}
        className="w-full border border-line bg-surface px-3 py-2.5 text-fg"
      />
    </div>
  );
}

type Notice = { tone: "ok" | "error"; text: string } | null;

/** "Submit round" with a confirming second click. */
function FinishBar({
  roundNumber,
  label,
  note,
  beforeSubmit,
  onNotice,
}: {
  roundNumber: number;
  label: string;
  note: string;
  /** Runs first; returning false cancels the submit. */
  beforeSubmit?: () => Promise<boolean>;
  onNotice: (notice: Notice) => void;
}) {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();

  function finish() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setArmed(false);
    startTransition(async () => {
      try {
        if (beforeSubmit && !(await beforeSubmit())) return;
        const result = await submitRound(roundNumber);
        if (result.ok) router.refresh();
        else onNotice({ tone: "error", text: result.error });
      } catch {
        onNotice({
          tone: "error",
          text: "Could not reach the server. Check your connection and retry.",
        });
      }
    });
  }

  return (
    <div className="mt-8 border-t border-dashed border-line pt-5">
      <p className="text-sm text-muted"># {note}</p>
      <div className="mt-3 flex flex-wrap gap-3">
        <Button
          variant={armed ? "danger" : "secondary"}
          onClick={finish}
          disabled={pending}
          aria-busy={pending}
        >
          {pending ? "... Submitting" : armed ? "Confirm: submit now" : label}
        </Button>
        {armed && (
          <Button variant="secondary" onClick={() => setArmed(false)}>
            Cancel
          </Button>
        )}
      </div>
    </div>
  );
}

export function RoundRunner(props: RoundRunnerProps) {
  const router = useRouter();
  const [notice, setNotice] = useState<Notice>(null);

  const handleExpired = useCallback(() => {
    // The server finalizes at the deadline; this just shows the result.
    void submitRound(props.roundNumber)
      .catch(() => undefined)
      .finally(() => router.refresh());
  }, [props.roundNumber, router]);

  if (props.questions.length === 0) {
    return (
      <Panel title="empty" dashed>
        <p className="text-muted">
          # This round has no questions yet. Ask an organizer.
        </p>
      </Panel>
    );
  }

  const header = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      {props.sequential && (
        <ProgressBar value={props.solvedCount} max={props.totalQuestions} />
      )}
      {props.deadlineAt && (
        <Countdown
          deadlineAt={props.deadlineAt}
          serverNow={props.serverNow}
          onExpire={handleExpired}
        />
      )}
    </div>
  );

  const noticeLine = (
    <p aria-live="polite" className="mt-4 min-h-6 text-sm">
      {notice && (
        <span className={notice.tone === "ok" ? "text-accent" : "text-danger"}>
          {notice.tone === "ok" ? "OK " : "! "}
          {notice.text}
        </span>
      )}
    </p>
  );

  const Mode = props.sequential ? SequentialRound : OpenRound;
  return (
    <Mode
      {...props}
      header={header}
      noticeLine={noticeLine}
      onNotice={setNotice}
    />
  );
}

type ModeProps = RoundRunnerProps & {
  header: ReactNode;
  noticeLine: ReactNode;
  onNotice: (notice: Notice) => void;
};

/** Quiz and Bug Hunt: every question visible, answers saved as you go. */
function OpenRound({
  roundNumber,
  questions,
  initialAnswers,
  header,
  noticeLine,
  onNotice,
}: ModeProps) {
  const router = useRouter();
  const [index, setIndex] = useState(0);
  const [drafts, setDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      Object.entries(initialAnswers).map(([id, a]) => [id, a.answer]),
    ),
  );
  const [saved, setSaved] = useState<Record<string, string>>(drafts);
  const [saving, startSaving] = useTransition();

  const question = questions[index];
  const draft = drafts[question.id] ?? "";
  const dirty = draft.trim() !== "" && draft !== saved[question.id];
  const answeredCount = questions.filter((q) => saved[q.id]).length;

  function persist(questionId: string, value: string, then?: () => void) {
    if (value.trim() === "" || value === saved[questionId]) {
      then?.();
      return;
    }
    startSaving(async () => {
      try {
        const result = await saveAnswer({
          round: roundNumber,
          questionId,
          answer: value,
        });
        if (result.ok) {
          setSaved((current) => ({ ...current, [questionId]: value }));
          onNotice({ tone: "ok", text: "Answer saved." });
          then?.();
        } else {
          onNotice({ tone: "error", text: result.error });
          if (result.expired) router.refresh();
        }
      } catch {
        onNotice({
          tone: "error",
          text: "Could not reach the server. Your answer is not saved yet.",
        });
      }
    });
  }

  function go(next: number) {
    persist(question.id, draft, () => setIndex(next));
  }

  /** Saves every typed-but-unsaved answer before the round is submitted. */
  async function flushDrafts(): Promise<boolean> {
    for (const q of questions) {
      const value = drafts[q.id] ?? "";
      if (value.trim() === "" || value === saved[q.id]) continue;
      const result = await saveAnswer({
        round: roundNumber,
        questionId: q.id,
        answer: value,
      });
      if (!result.ok) {
        onNotice({
          tone: "error",
          text: `Question ${questions.indexOf(q) + 1}: ${result.error}`,
        });
        if (result.expired) router.refresh();
        return false;
      }
      setSaved((current) => ({ ...current, [q.id]: value }));
    }
    return true;
  }

  return (
    <div className="space-y-8">
      {header}
      <nav aria-label="Questions">
        <ol className="flex flex-wrap gap-2">
          {questions.map((q, i) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => go(i)}
                aria-current={i === index ? "step" : undefined}
                aria-label={`Question ${i + 1}${saved[q.id] ? ", answered" : ""}`}
                className={cn(
                  "min-h-11 min-w-11 border px-2 text-sm font-bold tabular-nums transition-colors duration-100 hover:border-accent",
                  i === index ? "border-accent text-accent" : "border-line",
                  saved[q.id] && i !== index && "bg-surface text-fg",
                )}
              >
                {pad(i + 1)}
                {saved[q.id] ? "*" : ""}
              </button>
            </li>
          ))}
        </ol>
        <p className="mt-2 text-xs text-muted">
          # * = answer saved. Answered {answeredCount} of {questions.length}.
        </p>
      </nav>

      <Panel title={`q${index + 1}`}>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            persist(question.id, draft);
          }}
        >
          <QuestionBody
            question={question}
            label={`Question ${index + 1} of ${questions.length}`}
          />
          <AnswerInput
            key={question.id}
            question={question}
            value={draft}
            onChange={(value) => {
              setDrafts((current) => ({ ...current, [question.id]: value }));
              if (question.type === "single_choice")
                persist(question.id, value);
            }}
          />
          {noticeLine}
          <div className="mt-4 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              variant="secondary"
              disabled={index === 0 || saving}
              onClick={() => go(index - 1)}
            >
              Back
            </Button>
            <div className="flex flex-col gap-3 sm:flex-row">
              {question.type === "short_text" && (
                <Button
                  type="submit"
                  variant="secondary"
                  disabled={!dirty || saving}
                  aria-busy={saving}
                >
                  {saving ? "... Saving" : dirty ? "Save answer" : "Saved"}
                </Button>
              )}
              <Button
                disabled={index === questions.length - 1 || saving}
                onClick={() => go(index + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        </form>
      </Panel>

      <FinishBar
        roundNumber={roundNumber}
        label="Submit round"
        note="Submitting is final. Typed answers that are not saved yet are saved first."
        beforeSubmit={flushDrafts}
        onNotice={onNotice}
      />
    </div>
  );
}

/** Tech Treasure Hunt: one clue at a time, the next unlocks on a correct answer. */
function SequentialRound({
  roundNumber,
  questions,
  initialAnswers,
  totalQuestions,
  header,
  noticeLine,
  onNotice,
}: ModeProps) {
  const router = useRouter();
  const solved = questions.filter((q) => initialAnswers[q.id]?.isCorrect);
  const current = questions.find((q) => !initialAnswers[q.id]?.isCorrect);
  const [value, setValue] = useState("");
  const [checking, startChecking] = useTransition();

  function check() {
    if (!current || value.trim() === "") return;
    startChecking(async () => {
      try {
        const result = await saveAnswer({
          round: roundNumber,
          questionId: current.id,
          answer: value,
        });
        if (!result.ok) {
          onNotice({ tone: "error", text: result.error });
          if (result.expired) router.refresh();
          return;
        }
        if (result.correct) {
          onNotice({
            tone: "ok",
            text: result.roundComplete
              ? "Correct. That was the last clue."
              : "Correct. Next clue unlocked.",
          });
          setValue("");
          router.refresh();
        } else {
          onNotice({ tone: "error", text: "Not quite. Try again." });
        }
      } catch {
        onNotice({
          tone: "error",
          text: "Could not reach the server. Try again.",
        });
      }
    });
  }

  return (
    <div className="space-y-8">
      {header}
      {solved.length > 0 && (
        <section aria-labelledby="solved-heading">
          <h2 id="solved-heading" className="text-base">
            <span aria-hidden="true" className="text-accent">
              #{" "}
            </span>
            Solved clues
          </h2>
          <ol className="mt-3 space-y-2 text-sm">
            {solved.map((q) => (
              <li key={q.id} className="border border-line px-3 py-2">
                <span className="text-accent">OK</span> Clue{" "}
                {questions.indexOf(q) + 1}:{" "}
                <span className="text-muted">
                  {q.type === "single_choice"
                    ? q.options.find(
                        (o) => o.id === initialAnswers[q.id]?.answer,
                      )?.text
                    : initialAnswers[q.id]?.answer}
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {current ? (
        <Panel title={`clue ${questions.indexOf(current) + 1}`}>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              check();
            }}
          >
            <QuestionBody
              question={current}
              label={`Clue ${questions.indexOf(current) + 1} of ${totalQuestions}`}
            />
            <AnswerInput
              key={current.id}
              question={current}
              value={value}
              onChange={setValue}
              disabled={checking}
            />
            {initialAnswers[current.id] && (
              <p className="mt-3 text-xs text-muted">
                # Tries so far: {initialAnswers[current.id].tries}
              </p>
            )}
            {noticeLine}
            <Button
              type="submit"
              className="mt-2"
              disabled={value.trim() === "" || checking}
              aria-busy={checking}
            >
              {checking ? "... Checking" : "Check answer"}
            </Button>
          </form>
        </Panel>
      ) : (
        <Panel title="done">
          <p className="text-accent">OK Every clue is solved.</p>
        </Panel>
      )}

      <FinishBar
        roundNumber={roundNumber}
        label="Finish round"
        note="Finishing ends the hunt. Solved clues keep their points."
        onNotice={onNotice}
      />
    </div>
  );
}
