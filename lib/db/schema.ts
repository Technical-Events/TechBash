import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  unique,
  uuid,
} from "drizzle-orm/pg-core";
// Relative import with an extension: drizzle-kit and Node's type stripping
// (scripts/create-admin.ts) do not resolve the "@/" alias.
import {
  personKinds,
  questionTypes,
  roundStatuses,
  userRoles,
} from "../rounds/constants.ts";

// Full documentation of every table: docs/DATABASE.md.

export const userRole = pgEnum("user_role", userRoles);
export const roundStatus = pgEnum("round_status", roundStatuses);
export const questionType = pgEnum("question_type", questionTypes);
export const personKind = pgEnum("person_kind", personKinds);

const timestamptz = (name: string) => timestamp(name, { withTimezone: true });
const createdAt = timestamptz("created_at").notNull().defaultNow();
const updatedAt = timestamptz("updated_at")
  .notNull()
  .defaultNow()
  .$onUpdate(() => new Date());

/* ------------------------------------------------------------------------ */
/* Better Auth. Field names follow Better Auth's core schema (1.7).          */
/* ------------------------------------------------------------------------ */

export const authUsers = pgTable("auth_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  role: userRole("role").notNull().default("participant"),
  createdAt,
  updatedAt,
});

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: text("id").primaryKey(),
    token: text("token").notNull().unique(),
    expiresAt: timestamptz("expires_at").notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    createdAt,
    updatedAt,
  },
  (table) => [index("auth_sessions_user_id_idx").on(table.userId)],
);

export const authAccounts = pgTable(
  "auth_accounts",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => authUsers.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamptz("access_token_expires_at"),
    refreshTokenExpiresAt: timestamptz("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt,
    updatedAt,
  },
  (table) => [index("auth_accounts_user_id_idx").on(table.userId)],
);

export const authVerifications = pgTable(
  "auth_verifications",
  {
    id: text("id").primaryKey(),
    identifier: text("identifier").notNull(),
    value: text("value").notNull(),
    expiresAt: timestamptz("expires_at").notNull(),
    createdAt,
    updatedAt,
  },
  (table) => [index("auth_verifications_identifier_idx").on(table.identifier)],
);

/* ------------------------------------------------------------------------ */
/* Event content                                                             */
/* ------------------------------------------------------------------------ */

/** Single row (id = 1) holding the editable event details. */
export const eventInfo = pgTable(
  "event_info",
  {
    id: integer("id").primaryKey().default(1),
    name: text("name").notNull(),
    tagline: text("tagline").notNull(),
    introduction: text("introduction").notNull(),
    details: text("details").notNull(),
    eventDate: text("event_date").notNull(),
    venue: text("venue").notNull(),
    organizer: text("organizer").notNull(),
    leadName: text("lead_name").notNull(),
    leadEmail: text("lead_email").notNull(),
    leadPhone: text("lead_phone").notNull().default(""),
    /** Participants see their own scores only when this is on. */
    resultsPublished: boolean("results_published").notNull().default(false),
    /** How many places the winner list shows. */
    winnerCount: integer("winner_count").notNull().default(3),
    updatedAt,
  },
  (table) => [check("event_info_singleton", sql`${table.id} = 1`)],
);

/** Faculty coordinators and student team members shown on the site. */
export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    kind: personKind("kind").notNull(),
    name: text("name").notNull(),
    role: text("role").notNull().default(""),
    department: text("department").notNull().default(""),
    bio: text("bio").notNull().default(""),
    email: text("email").notNull().default(""),
    phone: text("phone").notNull().default(""),
    photoUrl: text("photo_url"),
    position: integer("position").notNull().default(0),
    createdAt,
    updatedAt,
  },
  (table) => [index("people_kind_position_idx").on(table.kind, table.position)],
);

/* ------------------------------------------------------------------------ */
/* Rounds, questions, access keys                                            */
/* ------------------------------------------------------------------------ */

export const rounds = pgTable(
  "rounds",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    number: integer("number").notNull().unique(),
    title: text("title").notNull(),
    description: text("description").notNull().default(""),
    instructions: text("instructions").notNull().default(""),
    status: roundStatus("status").notNull().default("draft"),
    /** Time limit from unlock to automatic submission. Null: no limit. */
    durationMinutes: integer("duration_minutes"),
    /** Sequential rounds show one question at a time, unlocked in order. */
    sequential: boolean("sequential").notNull().default(false),
    createdAt,
    updatedAt,
  },
  (table) => [
    check("rounds_number_range", sql`${table.number} between 1 and 3`),
    check(
      "rounds_duration_positive",
      sql`${table.durationMinutes} is null or ${table.durationMinutes} > 0`,
    ),
  ],
);

export const questions = pgTable(
  "questions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    type: questionType("type").notNull(),
    prompt: text("prompt").notNull(),
    /** Optional code snippet shown under the prompt (Bug Hunt). */
    code: text("code"),
    codeLanguage: text("code_language"),
    /** Short-text answers accepted after normalization. */
    acceptedAnswers: text("accepted_answers")
      .array()
      .notNull()
      .default(sql`'{}'::text[]`),
    points: integer("points").notNull().default(1),
    createdAt,
    updatedAt,
  },
  (table) => [
    index("questions_round_position_idx").on(table.roundId, table.position),
    check("questions_points_positive", sql`${table.points} > 0`),
  ],
);

export const questionOptions = pgTable(
  "question_options",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    position: integer("position").notNull(),
    text: text("text").notNull(),
    isCorrect: boolean("is_correct").notNull().default(false),
  },
  (table) => [
    index("question_options_question_idx").on(table.questionId, table.position),
  ],
);

/** Only an HMAC of each key is stored; the key itself is shown once. */
export const accessKeys = pgTable(
  "access_keys",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    keyHash: text("key_hash").notNull(),
    /** Last characters of the key, so admins can tell keys apart. */
    keyHint: text("key_hint").notNull(),
    revokedAt: timestamptz("revoked_at"),
    createdAt,
    updatedAt,
  },
  (table) => [
    unique("access_keys_round_hash_key").on(table.roundId, table.keyHash),
  ],
);

/* ------------------------------------------------------------------------ */
/* Participants and their work                                               */
/* ------------------------------------------------------------------------ */

/** The approved roster. Login succeeds only for a USN listed here. */
export const participants = pgTable("participants", {
  id: uuid("id").primaryKey().defaultRandom(),
  usn: text("usn").notNull().unique(),
  fullName: text("full_name").notNull(),
  userId: text("user_id")
    .unique()
    .references(() => authUsers.id, { onDelete: "set null" }),
  lastLoginAt: timestamptz("last_login_at"),
  createdAt,
  updatedAt,
});

/** One per participant and round, created when an access key is accepted. */
export const roundAttempts = pgTable(
  "round_attempts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    participantId: uuid("participant_id")
      .notNull()
      .references(() => participants.id, { onDelete: "cascade" }),
    roundId: uuid("round_id")
      .notNull()
      .references(() => rounds.id, { onDelete: "cascade" }),
    accessKeyId: uuid("access_key_id").references(() => accessKeys.id, {
      onDelete: "set null",
    }),
    startedAt: timestamptz("started_at").notNull().defaultNow(),
    /** Fixed when the attempt starts, from the round's time limit. */
    deadlineAt: timestamptz("deadline_at"),
    submittedAt: timestamptz("submitted_at"),
    /** True when the deadline or a closed round submitted the attempt. */
    autoSubmitted: boolean("auto_submitted").notNull().default(false),
  },
  (table) => [
    unique("round_attempts_participant_round_key").on(
      table.participantId,
      table.roundId,
    ),
    index("round_attempts_round_idx").on(table.roundId),
  ],
);

export const attemptAnswers = pgTable(
  "attempt_answers",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    attemptId: uuid("attempt_id")
      .notNull()
      .references(() => roundAttempts.id, { onDelete: "cascade" }),
    questionId: uuid("question_id")
      .notNull()
      .references(() => questions.id, { onDelete: "cascade" }),
    answer: text("answer").notNull(),
    isCorrect: boolean("is_correct").notNull(),
    pointsAwarded: integer("points_awarded").notNull(),
    /** How many times this question was answered (retries in sequential rounds). */
    tries: integer("tries").notNull().default(1),
    answeredAt: timestamptz("answered_at").notNull().defaultNow(),
  },
  (table) => [
    unique("attempt_answers_attempt_question_key").on(
      table.attemptId,
      table.questionId,
    ),
    index("attempt_answers_question_idx").on(table.questionId),
  ],
);

/** Failed sign-in and access-key attempts, for throttling. */
export const throttleEvents = pgTable(
  "throttle_events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    bucket: text("bucket").notNull(),
    createdAt,
  },
  (table) => [
    index("throttle_events_bucket_created_idx").on(
      table.bucket,
      table.createdAt,
    ),
  ],
);

export const contactSubmissions = pgTable("contact_submissions", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  subject: text("subject").notNull(),
  message: text("message").notNull(),
  createdAt,
});
