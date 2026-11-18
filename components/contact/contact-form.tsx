"use client";

import {
  type FormEvent,
  startTransition,
  useActionState,
  useState,
} from "react";
import { submitContact } from "@/app/contact/actions";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Panel } from "@/components/ui/panel";
import {
  type ContactFieldErrors,
  type ContactFormState,
  contactFields,
  validateContact,
} from "@/lib/validations/contact";

const initialState: ContactFormState = { status: "idle" };

function Form({ onReset }: { onReset: () => void }) {
  const [state, formAction, pending] = useActionState(
    submitContact,
    initialState,
  );
  const [clientErrors, setClientErrors] = useState<ContactFieldErrors | null>(
    null,
  );

  // JS path: validate first and call the action by hand, which keeps the
  // typed values in place. Without JS the form still posts to `action`.
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const formData = new FormData(form);
    const result = validateContact(Object.fromEntries(formData));
    if (!result.ok) {
      setClientErrors(result.fieldErrors);
      const first = contactFields.find((field) => result.fieldErrors[field]);
      if (first) (form.elements.namedItem(first) as HTMLElement).focus();
      return;
    }
    setClientErrors(null);
    startTransition(() => formAction(formData));
  }

  if (state.status === "stored" || state.status === "demo") {
    const stored = state.status === "stored";
    return (
      <Panel title="result">
        <div role="status">
          <h3 className={stored ? "text-lg text-accent" : "text-lg text-amber"}>
            {stored ? "Message stored" : "Demo mode: nothing was sent"}
          </h3>
          <p className="mt-3 max-w-[62ch]">
            {stored
              ? "Your message was saved to the TechBash database. No email is sent, so a reply depends on someone reading it there."
              : "Your message passed validation, but this deployment has no database configured. It was not stored and it was not sent to anyone."}
          </p>
        </div>
        <Button variant="secondary" className="mt-6" onClick={onReset}>
          Write another
        </Button>
      </Panel>
    );
  }

  const errors =
    clientErrors ?? (state.status === "invalid" ? state.fieldErrors : {});
  const errorCount = Object.keys(errors).length;

  return (
    <Panel title="new message">
      <form
        action={formAction}
        onSubmit={handleSubmit}
        noValidate
        className="space-y-5"
      >
        <div role="alert" className="space-y-2 empty:hidden">
          {errorCount > 0 && (
            <p className="border border-danger px-3 py-2 text-sm text-danger">
              ! {errorCount} {errorCount === 1 ? "field needs" : "fields need"}{" "}
              attention.
            </p>
          )}
          {state.status === "throttled" && !clientErrors && (
            <p className="border border-danger px-3 py-2 text-sm text-danger">
              ! Too many messages from this network. Nothing was sent. Try again
              in an hour.
            </p>
          )}
          {state.status === "error" && !clientErrors && (
            <p className="border border-danger px-3 py-2 text-sm text-danger">
              ! Your message could not be saved. Nothing was sent. Try again
              later.
            </p>
          )}
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <Field
            label="Name"
            name="name"
            autoComplete="name"
            required
            maxLength={80}
            error={errors.name}
          />
          <Field
            label="Email"
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
            error={errors.email}
          />
        </div>
        <Field
          label="Subject"
          name="subject"
          required
          maxLength={120}
          error={errors.subject}
        />
        <Field
          label="Message"
          name="message"
          multiline
          required
          maxLength={2000}
          hint="10 to 2000 characters."
          error={errors.message}
        />
        <Button type="submit" disabled={pending} aria-busy={pending}>
          {pending ? "... Sending" : "Send message"}
        </Button>
      </form>
    </Panel>
  );
}

export function ContactForm() {
  // Remounting clears both the fields and the action state.
  const [key, setKey] = useState(0);
  return <Form key={key} onReset={() => setKey(key + 1)} />;
}
