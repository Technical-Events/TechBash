import type { ReactNode } from "react";

type PageHeadingProps = {
  /** Shell command shown above the title, without the `$`. */
  command: string;
  title: string;
  children?: ReactNode;
};

export function PageHeading({ command, title, children }: PageHeadingProps) {
  return (
    <header className="mb-10 sm:mb-12">
      <p className="text-sm text-muted">
        <span aria-hidden="true" className="text-accent">
          ${" "}
        </span>
        {command}
      </p>
      <h1 className="mt-2 text-2xl sm:text-4xl">
        {title}
        <span aria-hidden="true" className="animate-blink text-accent">
          _
        </span>
      </h1>
      {children && <p className="mt-4 max-w-[70ch] text-muted">{children}</p>}
    </header>
  );
}
