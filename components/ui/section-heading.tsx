import type { ReactNode } from "react";

/** `# Title` section heading with an optional intro line. */
export function SectionHeading({
  id,
  children,
  intro,
}: {
  id: string;
  children: ReactNode;
  intro?: ReactNode;
}) {
  return (
    <div className="mb-8">
      <h2 id={id} className="text-lg sm:text-xl">
        <span aria-hidden="true" className="text-accent">
          #{" "}
        </span>
        {children}
      </h2>
      {intro && <p className="mt-3 max-w-[70ch] text-muted">{intro}</p>}
    </div>
  );
}
