import Link from "next/link";
import { navItems, site } from "@/lib/site";

export function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-8 sm:px-6 md:flex-row md:items-start md:justify-between">
        <div>
          <p className="font-bold tracking-[0.04em]">
            <span aria-hidden="true" className="text-accent">
              &gt;_&nbsp;
            </span>
            {site.name}
          </p>
          <p className="mt-1 text-sm text-muted"># {site.tagline}</p>
        </div>
        <nav aria-label="Footer">
          <ul className="flex flex-col md:flex-row md:gap-6">
            {navItems.map(({ href, label }) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex min-h-11 items-center text-sm tracking-[0.08em] text-muted uppercase transition-colors duration-100 hover:text-accent md:min-h-0"
                >
                  {label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </footer>
  );
}
