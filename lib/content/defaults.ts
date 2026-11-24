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
 * Content shown when no database is configured. Matches the seeds in
 * drizzle/0003_seed_event_content.sql and content updates 0005-0007; with a
 * database, admins edit it.
 */
export const defaultEventInfo: EventInfo = {
  name: "TechBash",
  tagline: "Three rounds. One terminal. Prove your tech skills.",
  introduction:
    "TechBash is a technical event with three rounds: a quiz, a tech treasure hunt and a bug hunt. Log in with your full name and USN, unlock each round with the access key announced at the venue, and compete for the top of the leaderboard.",
  details:
    "Scores are counted on the server. Ties are broken by total time taken, then by who finished first.",
  eventDate: "Tuesday, 24 November 2026, 9:30 AM",
  venue: "Seminar Hall 1, A J Institute of Engineering and Technology",
  organizer: "Technical Committee AJIET",
  leadName: "S. Mohammed Sharwan",
  leadEmail: "sharwan@ajiet.edu.in",
  leadPhone: "",
  resultsPublished: false,
  winnerCount: 3,
};

const personDefaults = {
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
    name: "Ms. Devika",
    position: 1,
    ...personDefaults,
    role: "Co-Curricular Coordinator",
    photoUrl: "/people/devika.jpg",
  },
  {
    id: "default-anusha",
    kind: "faculty",
    name: "Mrs. Anusha Anchan",
    position: 2,
    ...personDefaults,
    role: "Event Coordinator",
    photoUrl: "/people/anusha.jpg",
  },
  {
    id: "default-remul",
    kind: "faculty",
    name: "Mrs. Remul Pinto",
    position: 3,
    ...personDefaults,
    role: "Event Coordinator",
    photoUrl: "/people/remul-pinto.jpg",
  },
  {
    id: "default-sharwan",
    kind: "team",
    name: "S. Mohammed Sharwan",
    position: 1,
    ...personDefaults,
    role: "Technical Coordinator",
    photoUrl: "/people/s-mohammed-sharwan.jpg",
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
      "Ten connected tech clues: each answer leads to the next. All ten are on one screen; change your answers as often as you like until you submit. Highest score wins; time taken breaks ties.",
    status: "draft",
    durationMinutes: 30,
    sequential: false,
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
