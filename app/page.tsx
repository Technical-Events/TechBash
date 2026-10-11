import { Hero } from "@/components/home/hero";
import { QuizPreview } from "@/components/home/quiz-preview";
import { QuizGrid } from "@/components/quiz/quiz-card";
import { ButtonLink } from "@/components/ui/button";
import { catalog } from "@/lib/quiz/catalog";

export default function HomePage() {
  return (
    <div className="space-y-16 sm:space-y-24">
      <Hero />
      <QuizPreview />
      <section aria-labelledby="topics-heading">
        <h2 id="topics-heading" className="text-lg sm:text-xl">
          <span aria-hidden="true" className="text-accent">
            #{" "}
          </span>
          Topics on the way
        </h2>
        <p className="mt-3 mb-8 max-w-[70ch] text-muted">
          One demo quiz works today. The others show the kinds of topics
          TechBash is being built for.
        </p>
        <QuizGrid entries={catalog} />
        <div className="mt-10">
          <ButtonLink href="/test" variant="secondary">
            See all tests
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
