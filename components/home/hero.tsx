import { ButtonLink } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { EventInfo } from "@/lib/content/defaults";

// figlet "standard". Plain ASCII only, so every glyph comes from one font.
const logo = [
  " _____         _     ____            _",
  "|_   _|__  ___| |__ | __ )  __ _ ___| |__",
  "  | |/ _ \\/ __| '_ \\|  _ \\ / _` / __| '_ \\",
  "  | |  __/ (__| | | | |_) | (_| \\__ \\ | | |",
  "  |_|\\___|\\___|_| |_|____/ \\__,_|___/_| |_|",
].join("\n");

export function Hero({ info }: { info: EventInfo }) {
  const facts = [
    ["When", info.eventDate],
    ["Where", info.venue],
    ["Hosted by", info.organizer],
  ].filter(([, value]) => value);

  return (
    <Panel title="techbash@event: ~" className="ascii-grid">
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
      <h1 className="mt-6 max-w-[28ch] text-2xl sm:text-4xl">
        {info.name}
        {info.tagline && (
          <span className="mt-2 block text-base text-muted normal-case sm:text-xl">
            {info.tagline}
          </span>
        )}
      </h1>
      <p className="mt-4 max-w-[62ch] whitespace-pre-line">
        {info.introduction}
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        <ButtonLink href="/test">Enter the test</ButtonLink>
        <ButtonLink href="/contact" variant="secondary">
          Contact us
        </ButtonLink>
      </div>
      {facts.length > 0 && (
        <dl className="mt-8 grid gap-x-6 gap-y-2 border-t border-dashed border-line pt-4 text-sm sm:grid-cols-3">
          {facts.map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs tracking-[0.08em] text-muted uppercase">
                {label}
              </dt>
              <dd className="text-fg">{value}</dd>
            </div>
          ))}
        </dl>
      )}
    </Panel>
  );
}
