import Link from "next/link";
import { site } from "@/lib/site";
import { NavLinks } from "./nav-links";

export function Navbar() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-x-6 px-4 sm:px-6">
        <Link
          href="/"
          className="flex min-h-14 items-center text-lg font-bold tracking-[0.04em]"
        >
          <span aria-hidden="true" className="text-accent">
            &gt;_&nbsp;
          </span>
          {site.name}
        </Link>
        <NavLinks />
      </div>
    </header>
  );
}
