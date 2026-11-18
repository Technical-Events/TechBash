-- Custom migration: round 1 becomes a 30-minute, all-branch engineering quiz and
-- round 2 a multiple-choice treasure hunt. Each statement changes a value only while it
-- still equals the 0003 seed, so edits made in the admin panel are kept.
UPDATE "rounds" SET "duration_minutes" = 30 WHERE "number" = 1 AND "duration_minutes" = 20;
--> statement-breakpoint
UPDATE "rounds" SET "description" = 'Thirty quick questions from every engineering branch: civil, mechanical, electronics and VLSI, computer science, AI and ML, IoT, cyber security and blockchain, data science and information science.'
WHERE "number" = 1 AND "description" = 'Rapid-fire technical questions across programming, networks, databases and computing fundamentals.';
--> statement-breakpoint
UPDATE "rounds" SET "description" = 'Fifteen tech and logic puzzles. Solve one to unlock the next. The fastest to solve them all wins.'
WHERE "number" = 2 AND "description" = 'Follow a trail of technical clues. Solve one to unlock the next.';
--> statement-breakpoint
UPDATE "rounds" SET "instructions" = 'Clues unlock one at a time. Pick an option and check it: a wrong pick can be changed and checked again as often as you like, a correct pick unlocks the next clue. The hunt ends when the last clue is solved. Ranking: most clues solved, then fastest finish.'
WHERE "number" = 2 AND "instructions" = 'Clues unlock one at a time. Type your answer to each clue; a correct answer reveals the next clue. Wrong answers can be retried.';
