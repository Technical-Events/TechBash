"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { navItems } from "@/lib/site";
import { cn } from "@/lib/utils";

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function NavLinks() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="primary-nav"
        onClick={() => setOpen(!open)}
        className="flex min-h-11 items-center gap-2 border border-line px-3 text-sm font-bold tracking-[0.08em] uppercase hover:border-accent hover:text-accent md:hidden"
      >
        {open ? (
          <X aria-hidden="true" size={16} />
        ) : (
          <Menu aria-hidden="true" size={16} />
        )}
        {open ? "Close" : "Menu"}
      </button>
      <nav
        id="primary-nav"
        aria-label="Primary"
        className={cn(
          "w-full border-t border-line md:block md:w-auto md:border-0",
          !open && "hidden",
        )}
      >
        <ul className="flex flex-col py-2 md:flex-row md:gap-6 md:py-0">
          {navItems.map(({ href, label }) => {
            const active = isActive(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex min-h-11 items-center text-sm font-bold tracking-[0.08em] uppercase transition-colors duration-100 hover:text-accent md:min-h-14",
                    active ? "text-accent" : "text-fg",
                  )}
                >
                  <span
                    aria-hidden="true"
                    className={cn(!active && "invisible")}
                  >
                    &gt;&nbsp;
                  </span>
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
