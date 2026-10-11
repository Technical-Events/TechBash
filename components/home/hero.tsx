import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { site } from "@/lib/site";

// figlet "standard". Plain ASCII only, so every glyph comes from one font.
const logo = [
  " _____         _     ____            _",
  "|_   _|__  ___| |__ | __ )  __ _ ___| |__",
  "  | |/ _ \\/ __| '_ \\|  _ \\ / _` / __| '_ \\",
  "  | |  __/ (__| | | | |_) | (_| \\__ \\ | | |",
  "  |_|\\___|\\___|_| |_|____/ \\__,_|___/_| |_|",
].join("\n");

export function Hero() {
  return (
    <Panel title="techbash@localhost: ~" className="ascii-grid">
      <p className="text-sm text-muted">
        <span aria-hidden="true" className="text-accent">
          ${" "}
        </span>
        cat welcome.txt
      </p>
      {/* 44 columns wide; the fluid size keeps it inside a 320px screen. */}
      <pre
        aria-hidden="true"
        className="mt-4 text-[clamp(7px,2.5vw,18px)] leading-[1.1] font-bold text-accent"
      >
        {logo}
      </pre>
      <h1 className="mt-6 max-w-[24ch] text-2xl sm:text-4xl">
        <span className="sr-only">{site.name}: </span>
        Technical quizzes, served in plain text
        <span aria-hidden="true" className="animate-blink text-accent">
          _
        </span>
      </h1>
      <p className="mt-4 max-w-[62ch] text-muted">
        TechBash is a quiz platform for people who like terminals. Pick a topic,
        answer a short set of questions and get a scored review. No clutter, no
        pop-ups, nothing but text.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/test">Initialize quiz</ButtonLink>
        <ButtonLink href="/about" variant="secondary">
          Explore TechBash
        </ButtonLink>
      </div>
      <dl className="mt-8 flex flex-col gap-x-6 gap-y-1 border-t border-dashed border-line pt-4 text-xs tracking-[0.08em] text-muted uppercase sm:flex-row">
        <div className="flex gap-2">
          <dt>Status:</dt>
          <dd className="text-accent">Online</dd>
        </div>
        <div className="flex gap-2">
          <dt>Mode:</dt>
          <dd className="text-amber">Demo</dd>
        </div>
        <div className="flex gap-2">
          <dt>Quizzes ready:</dt>
          <dd className="text-fg">1</dd>
        </div>
      </dl>
    </Panel>
  );
}
