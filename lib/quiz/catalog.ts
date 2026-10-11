import type { Difficulty } from "./types";

export type CatalogEntry = {
  slug: string;
  title: string;
  category: string;
  description: string;
  difficulty: Difficulty;
  /** Present only for entries that can be taken today. */
  href?: string;
  questionCount?: number;
};

/**
 * PLACEHOLDER CATALOG. Only the demo entry works. The rest show the kinds of
 * quizzes TechBash could offer and are replaced by a database query in
 * Phase 2 (see docs/ROADMAP.md).
 */
export const catalog: CatalogEntry[] = [
  {
    slug: "demo",
    title: "Web Fundamentals",
    category: "web",
    description: "Five quick questions on HTTP, HTML, CSS and JavaScript.",
    difficulty: "beginner",
    href: "/test/demo",
    questionCount: 5,
  },
  {
    slug: "linux-shell",
    title: "Linux and Shell",
    category: "systems",
    description:
      "Pipes, permissions, processes and everyday command-line tools.",
    difficulty: "beginner",
  },
  {
    slug: "dsa",
    title: "Data Structures and Algorithms",
    category: "cs-core",
    description:
      "Complexity, trees, graphs, sorting and classic problem patterns.",
    difficulty: "intermediate",
  },
  {
    slug: "sql",
    title: "Databases and SQL",
    category: "data",
    description: "Joins, indexes, transactions and schema design.",
    difficulty: "intermediate",
  },
  {
    slug: "networking",
    title: "Networking",
    category: "systems",
    description: "TCP/IP, DNS, TLS and what happens when you load a page.",
    difficulty: "intermediate",
  },
  {
    slug: "os-internals",
    title: "Operating Systems",
    category: "cs-core",
    description: "Scheduling, memory management, concurrency and file systems.",
    difficulty: "advanced",
  },
];
