import { saveQuestion } from "@/app/admin/(panel)/rounds/actions";
import { ActionForm } from "@/components/ui/action-form";
import { Field } from "@/components/ui/field";
import type { RoundQuestion } from "@/lib/db/queries/attempts";
import { MAX_OPTIONS } from "@/lib/validations/rounds";

const typeOptions = [
  { value: "single_choice", label: "Single choice (pick one option)" },
  { value: "short_text", label: "Short text (typed answer)" },
] as const;

/** Create or edit a question. Both answer sections show; the type decides which counts. */
export function QuestionForm({
  roundNumber,
  question,
  sequential,
}: {
  roundNumber: number;
  question?: RoundQuestion;
  sequential: boolean;
}) {
  const options = question?.options ?? [];
  return (
    <ActionForm
      action={saveQuestion}
      submitLabel={question ? "Save question" : "Add question"}
      pendingLabel="... Saving"
    >
      <input type="hidden" name="round" value={roundNumber} />
      <input type="hidden" name="questionId" value={question?.id ?? ""} />
      <div className="grid gap-5 sm:grid-cols-[2fr_1fr]">
        <Field
          label="Type"
          name="type"
          options={typeOptions}
          defaultValue={
            question?.type ?? (sequential ? "short_text" : "single_choice")
          }
        />
        <Field
          label="Points"
          name="points"
          type="number"
          min={1}
          max={100}
          required
          defaultValue={question?.points ?? 1}
        />
      </div>
      <Field
        label={sequential ? "Clue" : "Question"}
        name="prompt"
        multiline
        rows={4}
        required
        maxLength={4000}
        defaultValue={question?.prompt}
      />
      <Field
        label="Code snippet (optional)"
        name="code"
        multiline
        rows={10}
        maxLength={20000}
        spellCheck={false}
        className="[&_textarea]:font-mono [&_textarea]:text-sm"
        hint="Shown under the question with line numbers. Use it for Bug Hunt."
        defaultValue={question?.code ?? ""}
      />
      <Field
        label="Code language (optional)"
        name="codeLanguage"
        maxLength={30}
        placeholder="python"
        defaultValue={question?.codeLanguage ?? ""}
      />

      <fieldset className="border border-dashed border-line p-4">
        <legend className="px-2 text-sm font-bold tracking-[0.08em] uppercase">
          Options{" "}
          <span className="font-normal text-muted">(single choice)</span>
        </legend>
        <p className="mb-3 text-sm text-muted">
          # Fill 2 to {MAX_OPTIONS} options and mark exactly one correct. Empty
          rows are ignored.
        </p>
        <div className="space-y-3">
          {Array.from({ length: MAX_OPTIONS }, (_, i) => {
            const option = options[i];
            return (
              <div key={i} className="flex items-center gap-3">
                <input
                  type="hidden"
                  name={`optionId${i}`}
                  value={option?.id ?? ""}
                />
                <label className="flex min-h-11 shrink-0 cursor-pointer items-center gap-2 text-sm">
                  <input
                    type="radio"
                    name="correct"
                    value={i}
                    defaultChecked={option?.isCorrect ?? false}
                    className="size-4 accent-accent"
                  />
                  <span className="sr-only">Option {i + 1} is correct</span>
                  <span aria-hidden="true" className="text-muted">
                    {String.fromCharCode(65 + i)}
                  </span>
                </label>
                <input
                  name={`option${i}`}
                  aria-label={`Option ${i + 1} text`}
                  defaultValue={option?.text ?? ""}
                  maxLength={500}
                  className="w-full min-w-0 border border-line bg-surface px-3 py-2 text-fg"
                />
              </div>
            );
          })}
        </div>
      </fieldset>

      <Field
        label="Accepted answers (short text)"
        name="acceptedAnswers"
        multiline
        rows={4}
        maxLength={10000}
        hint="One per line. Matching ignores case and extra spaces."
        defaultValue={question?.acceptedAnswers.join("\n") ?? ""}
      />
    </ActionForm>
  );
}
