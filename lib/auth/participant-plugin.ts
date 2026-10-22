import "server-only";
import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { and, eq, isNull } from "drizzle-orm";
import type { Db } from "@/lib/db";
import { participants } from "@/lib/db/schema";
import { namesMatch } from "@/lib/participants/roster";
import { participantLoginSchema } from "@/lib/validations/auth";

export const PARTICIPANT_MISMATCH =
  "That name and USN do not match the registered participant list.";

/**
 * Placeholder address: Better Auth requires a unique email per user. Keyed
 * on the roster row id, so editing a USN never collides with another row.
 */
function participantEmail(participantId: string) {
  return `${participantId}@participants.techbash.invalid`;
}

/**
 * Better Auth plugin: participants sign in with full name and USN, checked
 * against the admin-approved roster. Better Auth owns the user, the session
 * and the signed cookie. Each sign-in ends the participant's other sessions,
 * so one USN is active on one device at a time.
 */
export function participantSignIn(db: Db) {
  return {
    id: "participant-sign-in",
    endpoints: {
      signInParticipant: createAuthEndpoint(
        "/participant-sign-in/sign-in",
        { method: "POST", body: participantLoginSchema },
        async (ctx) => {
          const { usn, fullName } = ctx.body;
          const [entry] = await db
            .select()
            .from(participants)
            .where(eq(participants.usn, usn))
            .limit(1);
          if (!entry || !namesMatch(entry.fullName, fullName)) {
            throw new APIError("UNAUTHORIZED", {
              message: PARTICIPANT_MISMATCH,
            });
          }

          const adapter = ctx.context.internalAdapter;
          let userId = entry.userId;
          let user = userId ? await adapter.findUserById(userId) : null;
          if (!user) {
            user = await adapter.createUser(
              {
                email: participantEmail(entry.id),
                name: entry.fullName,
                emailVerified: false,
                role: "participant",
              },
              { method: "participant-roster" },
            );
            // Link only if no concurrent sign-in linked a user first.
            const [linked] = await db
              .update(participants)
              .set({ userId: user.id })
              .where(
                and(eq(participants.id, entry.id), isNull(participants.userId)),
              )
              .returning({ userId: participants.userId });
            if (!linked) {
              await adapter.deleteUser(user.id);
              throw new APIError("CONFLICT", {
                message: "Sign-in is already in progress. Try again.",
              });
            }
            userId = user.id;
          }

          await adapter.deleteUserSessions(user.id);
          const session = await adapter.createSession(user.id);
          if (!session) {
            throw new APIError("INTERNAL_SERVER_ERROR", {
              message: "Could not start a session.",
            });
          }
          await setSessionCookie(ctx, { session, user });
          await db
            .update(participants)
            .set({ lastLoginAt: new Date() })
            .where(eq(participants.id, entry.id));
          return ctx.json({ userId });
        },
      ),
    },
  } satisfies BetterAuthPlugin;
}
