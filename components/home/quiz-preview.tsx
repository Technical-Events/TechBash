import { Badge } from "@/components/ui/badge";
import { Panel } from "@/components/ui/panel";
import { ProgressBar } from "@/components/quiz/progress-bar";

// Static illustration of the quiz screen. Not a real question from any quiz.
const sampleOptions = [
  { text: "O(1)", selected: false },
  { text: "O(log n)", selected: true },
  { text: "O(n)", selected: false },
  { text: "O(n log n)", selected: false },
];

const steps = [
  ["01", "Pick a quiz", "Choose a topic and a difficulty from the list."],
  ["02", "Answer", "One question at a time. Go back whenever you want."],
  ["03", "Read the review", "Your score, the right answers and why."],
];

export function QuizPreview() {
  return (
    <section aria-labelledby="preview-heading">
      <h2 id="preview-heading" className="text-lg sm:text-xl">
        <span aria-hidden="true" className="text-accent">
          #{" "}
        </span>
        What a quiz looks like
      </h2>
      <div className="mt-8 grid gap-10 md:grid-cols-2 md:gap-8">
        <Panel title="preview">
          {/* Decorative mock-up: hidden from assistive tech, described by the steps. */}
          <div aria-hidden="true">
            <div className="flex items-center justify-between gap-4 text-sm text-muted">
              <span>Q 03/10</span>
              <Badge tone="amber">intermediate</Badge>
            </div>
            <p className="mt-4 font-bold">
              What is the time complexity of binary search on a sorted array?
            </p>
            <ul className="mt-4 space-y-2">
              {sampleOptions.map(({ text, selected }) => (
                <li
                  key={text}
                  className={
                    selected
                      ? "border border-accent px-3 py-2 text-accent"
                      : "border border-line px-3 py-2"
                  }
                >
                  {selected ? "(x)" : "( )"} {text}
                </li>
              ))}
            </ul>
            <ProgressBar value={3} max={10} className="mt-5" />
          </div>
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
  );
}
