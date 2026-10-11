import type { Metadata } from "next";
import { ButtonLink } from "@/components/ui/button";
import { PageHeading } from "@/components/ui/page-heading";
import { Panel } from "@/components/ui/panel";

export const metadata: Metadata = {
  title: "About",
  description:
    "What TechBash is, why it exists and why it looks like a terminal.",
};

// Placeholder copy. Refine once the project's positioning is final.
const sections = [
  {
    file: "what.txt",
    title: "What TechBash is",
    body: [
      "TechBash is a quiz platform for technical topics: web, systems, data, algorithms and the fundamentals underneath them.",
      "A quiz is a short set of questions. You answer, you submit, you get a score and an explanation for each question.",
    ],
  },
  {
    file: "why.txt",
    title: "Why it exists",
    body: [
      "Reading about a topic feels like learning. Being asked a precise question shows whether it stuck.",
      "TechBash is meant to be the quick check: a few minutes, honest feedback, and a clear idea of what to revisit.",
    ],
  },
  {
    file: "focus.txt",
    title: "What it focuses on",
    body: [
      "Learning over ranking. Every answer comes with the reasoning behind it.",
      "Technical knowledge that lasts: concepts and trade-offs, not trivia.",
      "Interaction that stays out of the way: one question, a few options, the keyboard works everywhere.",
    ],
  },
  {
    file: "style.txt",
    title: "Why it looks like this",
    body: [
      "The interface is drawn with text: monospaced type, borders made of plus signs and dashes, prompts and brackets instead of icons.",
      "It is a nod to the terminals and tools developers already live in, built with modern standards for accessibility and small screens.",
    ],
  },
];

export default function AboutPage() {
  return (
    <>
      <PageHeading command="./techbash --about" title="About">
        A quiz platform for technical knowledge with a plain-text soul.
      </PageHeading>
      <div className="grid gap-x-6 gap-y-10 md:grid-cols-2">
        {sections.map(({ file, title, body }) => (
          <Panel key={file} title={file}>
            <h2 className="text-base sm:text-lg">{title}</h2>
            <div className="mt-3 space-y-3 text-muted">
              {body.map((paragraph) => (
                <p key={paragraph}>{paragraph}</p>
              ))}
            </div>
          </Panel>
        ))}
      </div>
      <p className="mt-12 text-sm text-amber">
        ! TechBash is at the scaffold stage. One demo quiz works today.
      </p>
      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/test">Try the demo</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
    </>
  );
}
