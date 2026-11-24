/**
 * Leaderboard ranking and winner selection. Pure functions: the admin
 * results page, the exports and the tests all use them.
 *
 * The admin views rank the current round alone (`currentRound`,
 * `rankLiveRound`): earlier rounds do not count. `rankParticipants` applies
 * the tie-break order (documented in docs/ARCHITECTURE.md) to whatever
 * rounds it is given:
 *   1. Higher total score.
 *   2. More rounds submitted (in a single round: submitted beats in progress).
 *   3. Less total time taken (sum over submitted rounds of submission
 *      time minus unlock time).
 *   4. Earlier final submission (the latest submission time).
 * Participants equal on all four share a rank. USN only orders the display.
 */

export type RoundOutcome = {
  roundNumber: number;
  score: number;
  startedAt: Date;
  submittedAt: Date | null;
};

export type ParticipantOutcome = {
  participantId: string;
  usn: string;
  fullName: string;
  rounds: RoundOutcome[];
};

export type RankedParticipant = ParticipantOutcome & {
  rank: number;
  totalScore: number;
  roundsSubmitted: number;
  /** Milliseconds, submitted rounds only. */
  timeTakenMs: number;
  /** Latest submission time among submitted rounds. */
  lastSubmittedAt: Date | null;
  /** Set when every round is submitted: the moment the test was finished. */
  finishedAt: Date | null;
};

function summarize(
  outcome: ParticipantOutcome,
  totalRounds: number,
): Omit<RankedParticipant, "rank"> {
  let totalScore = 0;
  let roundsSubmitted = 0;
  let timeTakenMs = 0;
  let lastSubmittedAt: Date | null = null;
  for (const round of outcome.rounds) {
    totalScore += round.score;
    if (!round.submittedAt) continue;
    roundsSubmitted += 1;
    timeTakenMs += Math.max(
      0,
      round.submittedAt.getTime() - round.startedAt.getTime(),
    );
    if (!lastSubmittedAt || round.submittedAt > lastSubmittedAt) {
      lastSubmittedAt = round.submittedAt;
    }
  }
  return {
    ...outcome,
    totalScore,
    roundsSubmitted,
    timeTakenMs,
    lastSubmittedAt,
    finishedAt:
      totalRounds > 0 && roundsSubmitted >= totalRounds
        ? lastSubmittedAt
        : null,
  };
}

/** Negative when `a` ranks above `b`, 0 when they tie. */
function compareStanding(
  a: Omit<RankedParticipant, "rank">,
  b: Omit<RankedParticipant, "rank">,
): number {
  return (
    b.totalScore - a.totalScore ||
    b.roundsSubmitted - a.roundsSubmitted ||
    a.timeTakenMs - b.timeTakenMs ||
    // Never submitted sorts last. Both missing gives NaN, which `||` maps to 0.
    (a.lastSubmittedAt?.getTime() ?? Infinity) -
      (b.lastSubmittedAt?.getTime() ?? Infinity) ||
    0
  );
}

export function rankParticipants(
  outcomes: ParticipantOutcome[],
  totalRounds: number,
): RankedParticipant[] {
  const sorted = outcomes
    .map((outcome) => summarize(outcome, totalRounds))
    .sort((a, b) => compareStanding(a, b) || a.usn.localeCompare(b.usn));

  const ranked: RankedParticipant[] = [];
  sorted.forEach((entry, index) => {
    const previous = ranked[index - 1];
    const tied =
      previous !== undefined && compareStanding(previous, entry) === 0;
    ranked.push({ ...entry, rank: tied ? previous.rank : index + 1 });
  });
  return ranked;
}

/** The participant who submitted every round first, if anyone has. */
export function firstFinisher(
  ranked: RankedParticipant[],
): RankedParticipant | null {
  let first: RankedParticipant | null = null;
  for (const entry of ranked) {
    if (!entry.finishedAt) continue;
    if (!first?.finishedAt || entry.finishedAt < first.finishedAt)
      first = entry;
  }
  return first;
}

/**
 * Places 1 to `places` among participants who scored. A tie on the last
 * place includes everyone sharing it.
 */
export function selectWinners(
  ranked: RankedParticipant[],
  places: number,
): RankedParticipant[] {
  return ranked.filter((entry) => entry.totalScore > 0 && entry.rank <= places);
}

/**
 * One round ranked on its own, for choosing who advances. Only
 * participants who submitted that round are ranked, by its score, then
 * time taken, then submission time. Equal on all three: shared rank.
 */
export function rankRound(
  outcomes: ParticipantOutcome[],
  roundNumber: number,
): RankedParticipant[] {
  const entries = outcomes.flatMap((outcome) => {
    const rounds = outcome.rounds.filter(
      (round) => round.roundNumber === roundNumber && round.submittedAt,
    );
    return rounds.length ? [{ ...outcome, rounds }] : [];
  });
  return rankParticipants(entries, 1);
}

/**
 * The round rankings follow: the highest-numbered round that is open or
 * closed. A draft round has not started. Null before any round starts.
 */
export function currentRound(
  rounds: { number: number; status: string }[],
): number | null {
  let current: number | null = null;
  for (const round of rounds) {
    if (round.status === "draft") continue;
    if (current === null || round.number > current) current = round.number;
  }
  return current;
}

/**
 * One round ranked on its own, live: everyone who unlocked it, submitted or
 * still working. Earlier rounds do not count. On equal scores a submitted
 * attempt ranks above one in progress, then less time, then earlier
 * submission.
 */
export function rankLiveRound(
  outcomes: ParticipantOutcome[],
  roundNumber: number,
): RankedParticipant[] {
  const entries = outcomes.flatMap((outcome) => {
    const rounds = outcome.rounds.filter(
      (round) => round.roundNumber === roundNumber,
    );
    return rounds.length ? [{ ...outcome, rounds }] : [];
  });
  return rankParticipants(entries, 1);
}

/**
 * The top `count` places of a ranking. A tie on the last place includes
 * everyone sharing it, so the result can be longer than `count`.
 */
export function selectQualifiers(
  ranked: RankedParticipant[],
  count: number,
): RankedParticipant[] {
  return ranked.filter((entry) => entry.rank <= count);
}
