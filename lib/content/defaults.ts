import type { eventInfo, people, rounds } from "@/lib/db/schema";

export type EventInfo = Omit<typeof eventInfo.$inferSelect, "id" | "updatedAt">;
export type Person = Omit<
  typeof people.$inferSelect,
  "createdAt" | "updatedAt"
>;
export type RoundSummary = Pick<
  typeof rounds.$inferSelect,
  | "number"
  | "title"
  | "description"
  | "status"
  | "durationMinutes"
  | "sequential"
>;

/**
 * Content shown when no database is configured. Matches the seed in
 * drizzle/0003_seed_event_content.sql and 0005_round_content_update.sql; with a database, admins edit it.
 */
export const defaultEventInfo: EventInfo = {
  name: "TechBash",
  tagline: "Three rounds. One terminal. Prove your tech skills.",
  introduction:
    "TechBash is a technical event with three rounds: a quiz, a tech treasure hunt and a bug hunt. Log in with your full name and USN, unlock each round with the access key announced at the venue, and compete for the top of the leaderboard.",
  details:
    "Scores are counted on the server. Ties are broken by total time taken, then by who finished first.",
  eventDate: "Date to be announced",
  venue: "A J Institute of Engineering and Technology",
  organizer: "Department of Computer Science and Engineering",
  leadName: "S. Mohammed Sharwan",
  leadEmail: "sharwan@ajiet.edu.in",
  leadPhone: "",
  resultsPublished: false,
  winnerCount: 3,
};

const facultyDefaults = {
  role: "Faculty Coordinator",
  department: "",
  bio: "",
  email: "",
  phone: "",
  photoUrl: null,
};

export const defaultPeople: Person[] = [
  {
    id: "default-devika",
    kind: "faculty",
    name: "Devika Ma'am",
    position: 1,
    ...facultyDefaults,
  },
  {
    id: "default-anusha",
    kind: "faculty",
    name: "Anusha Ma'am",
    position: 2,
    ...facultyDefaults,
  },
];

export const defaultRounds: RoundSummary[] = [
  {
    number: 1,
    title: "Quiz",
    description:
      "Thirty quick questions from every engineering branch: civil, mechanical, electronics and VLSI, computer science, AI and ML, IoT, cyber security and blockchain, data science and information science.",
    status: "draft",
    durationMinutes: 30,
    sequential: false,
  },
  {
    number: 2,
    title: "Tech Treasure Hunt",
    description:
      "Fifteen tech and logic puzzles. Solve one to unlock the next. The fastest to solve them all wins.",
    status: "draft",
    durationMinutes: 30,
    sequential: true,
  },
  {
    number: 3,
    title: "Bug Hunt",
    description: "Read the code, find the bug and name the fix.",
    status: "draft",
    durationMinutes: 30,
    sequential: false,
  },
];
