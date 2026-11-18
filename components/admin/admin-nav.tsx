"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/rounds", label: "Rounds" },
  { href: "/admin/participants", label: "Participants" },
  { href: "/admin/results", label: "Results" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/messages", label: "Messages" },
  { href: "/admin/admins", label: "Admins" },
] as const;

/** Admin section links. Client only for the active-page marker. */
export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <ul className="flex flex-wrap gap-x-5 gap-y-1">
        {items.map(({ href, label }) => {
          const active =
            href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-11 items-center text-sm font-bold tracking-[0.08em] uppercase transition-colors duration-100 hover:text-accent",
                  active ? "text-accent" : "text-muted",
                )}
              >
                <span aria-hidden="true" className={cn(!active && "invisible")}>
                  &gt;&nbsp;
                </span>
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
