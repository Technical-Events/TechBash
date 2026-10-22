import assert from "node:assert/strict";
import { test } from "node:test";
import {
  firstFinisher,
  rankParticipants,
  selectWinners,
  type ParticipantOutcome,
} from "../lib/results/ranking.ts";
import { formatDuration, toCsv } from "../lib/results/csv.ts";

const at = (minute: number) => new Date(Date.UTC(2026, 10, 1, 10, minute));

function person(
  usn: string,
  rounds: [score: number, start: number, end: number | null][],
): ParticipantOutcome {
  return {
    participantId: usn,
    usn,
    fullName: usn,
    rounds: rounds.map(([score, start, end], index) => ({
      roundNumber: index + 1,
      score,
      startedAt: at(start),
      submittedAt: end === null ? null : at(end),
    })),
  };
}

test("higher score ranks first", () => {
  const ranked = rankParticipants(
    [person("A", [[3, 0, 10]]), person("B", [[5, 0, 20]])],
    1,
  );
  assert.deepEqual(
    ranked.map((r) => [r.usn, r.rank]),
    [
      ["B", 1],
      ["A", 2],
    ],
  );
});

test("equal score: more rounds submitted, then less time, then earlier finish", () => {
  const ranked = rankParticipants(
    [
      person("SLOW", [
        [4, 0, 30],
        [0, 0, 5],
      ]),
      person("FAST", [
        [4, 0, 10],
        [0, 0, 5],
      ]),
      person("ONE", [
        [4, 0, 1],
        [0, 0, null],
      ]),
      person("LATE", [
        [4, 20, 30],
        [0, 30, 35],
      ]),
    ],
    2,
  );
  // FAST and LATE both took 15 minutes; FAST finished at 10:10, LATE at 10:35.
  assert.deepEqual(
    ranked.map((r) => r.usn),
    ["FAST", "LATE", "SLOW", "ONE"],
  );
  assert.equal(ranked[0].timeTakenMs, 15 * 60_000);
  assert.equal(ranked[3].finishedAt, null);
});

test("identical standings share a rank; the next rank skips", () => {
  const ranked = rankParticipants(
    [
      person("B", [[2, 0, 10]]),
      person("A", [[2, 0, 10]]),
      person("C", [[1, 0, 10]]),
      person("D", [[0, 0, null]]),
      person("E", [[0, 0, null]]),
    ],
    1,
  );
  assert.deepEqual(
    ranked.map((r) => [r.usn, r.rank]),
    [
      ["A", 1],
      ["B", 1],
      ["C", 3],
      ["D", 4],
      ["E", 4],
    ],
  );
});

test("first finisher is the earliest to submit every round", () => {
  const ranked = rankParticipants(
    [
      person("TOP", [
        [9, 0, 50],
        [9, 0, 55],
      ]),
      person("QUICK", [
        [1, 0, 5],
        [1, 0, 6],
      ]),
      person("HALF", [
        [1, 0, 1],
        [0, 0, null],
      ]),
    ],
    2,
  );
  assert.equal(firstFinisher(ranked)?.usn, "QUICK");
  assert.equal(firstFinisher(rankParticipants([], 2)), null);
});

test("winners include ties on the last place and skip zero scores", () => {
  const ranked = rankParticipants(
    [
      person("A", [[5, 0, 10]]),
      person("B", [[4, 0, 10]]),
      person("C", [[4, 0, 10]]),
      person("D", [[3, 0, 10]]),
      person("Z", [[0, 0, 10]]),
    ],
    1,
  );
  assert.deepEqual(
    selectWinners(ranked, 2).map((r) => r.usn),
    ["A", "B", "C"],
  );
  assert.deepEqual(
    selectWinners(ranked, 10).map((r) => r.usn),
    ["A", "B", "C", "D"],
  );
});

test("toCsv quotes, escapes and neutralizes formulas", () => {
  assert.equal(
    toCsv(
      ["a", "b"],
      [
        ["x,y", 'say "hi"'],
        ["=SUM(A1)", null],
        [1, at(0)],
      ],
    ),
    'a,b\r\n"x,y","say ""hi"""\r\n\'=SUM(A1),\r\n1,2026-11-01T10:00:00.000Z\r\n',
  );
  assert.equal(toCsv(["n"], [[-5]]), "n\r\n-5\r\n");
});

test("formatDuration", () => {
  assert.equal(formatDuration(65_000), "1m 05s");
  assert.equal(formatDuration(3_725_000), "1h 02m 05s");
  assert.equal(formatDuration(-5), "0m 00s");
});

test("scoreHistogram covers 0..max with every score counted once", async () => {
  const { scoreHistogram, percent } = await import("../lib/results/stats.ts");
  const buckets = scoreHistogram([0, 1, 2, 5, 9, 10, 10], 10);
  assert.deepEqual(
    buckets.map((b) => b.label),
    ["0-2", "3-5", "6-8", "9-10"],
  );
  assert.equal(
    buckets.reduce((total, b) => total + b.count, 0),
    7,
  );
  assert.deepEqual(scoreHistogram([0, 1, 1], 1), [
    { label: "0", count: 1 },
    { label: "1", count: 2 },
  ]);
  assert.deepEqual(scoreHistogram([0, 0], 0), [{ label: "0", count: 2 }]);
  assert.equal(percent(1, 3), 33);
  assert.equal(percent(1, 0), 0);
});
