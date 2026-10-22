export const site = {
  name: "TechBash",
  tagline: "Three rounds. One terminal.",
  description:
    "TechBash is a technical event with three access-controlled rounds: a quiz, a tech treasure hunt and a bug hunt.",
} as const;

/** The primary navigation. The navbar and footer both render exactly these. */
export const navItems = [
  { href: "/", label: "Home" },
  { href: "/test", label: "Test" },
  { href: "/contact", label: "Contact Us" },
] as const;

/** Times are shown in the venue's time zone, whatever the server's is. */
export const EVENT_TIME_ZONE = "Asia/Kolkata";
