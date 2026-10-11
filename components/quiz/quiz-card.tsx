import { Badge, type BadgeTone } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { CatalogEntry } from "@/lib/quiz/catalog";
import type { Difficulty } from "@/lib/quiz/types";

export const difficultyTone: Record<Difficulty, BadgeTone> = {
  beginner: "accent",
  intermediate: "amber",
  advanced: "fg",
};

export function QuizCard({ entry }: { entry: CatalogEntry }) {
  const available = Boolean(entry.href);
  return (
    <Panel
      title={entry.category}
      dashed={!available}
      className="flex h-full flex-col"
    >
      <div className="flex flex-wrap gap-x-3 gap-y-1">
        <Badge tone={difficultyTone[entry.difficulty]}>
          {entry.difficulty}
        </Badge>
        {available ? <Badge tone="amber">demo</Badge> : <Badge>planned</Badge>}
      </div>
      <h3
        className={available ? "mt-3 text-base" : "mt-3 text-base text-muted"}
      >
        {entry.title}
      </h3>
      <p className="mt-2 flex-1 text-sm text-muted">{entry.description}</p>
      {entry.href ? (
        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <span className="text-sm text-muted">
            &gt; {entry.questionCount} questions
          </span>
          <ButtonLink href={entry.href}>Start demo</ButtonLink>
        </div>
      ) : (
        <p className="mt-5 text-sm text-muted"># not available yet</p>
      )}
    </Panel>
  );
}

export function QuizGrid({ entries }: { entries: CatalogEntry[] }) {
  return (
    <ul className="grid gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-3">
      {entries.map((entry) => (
        <li key={entry.slug}>
          <QuizCard entry={entry} />
        </li>
      ))}
    </ul>
  );
}
