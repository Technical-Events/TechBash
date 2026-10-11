export const site = {
  name: "TechBash",
  tagline: "Challenge your knowledge",
  description:
    "TechBash is a quiz platform for technical topics with a terminal-inspired, ASCII interface.",
} as const;

/** The primary navigation. The navbar and footer both render exactly these. */
export const navItems = [
  { href: "/", label: "Home" },
  { href: "/test", label: "Test" },
  { href: "/about", label: "About" },
  { href: "/contact", label: "Contact Us" },
] as const;
