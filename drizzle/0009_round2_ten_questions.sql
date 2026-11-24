-- Custom migration: round 2 becomes ten connected clues on one screen, answered in any
-- order with no right/wrong feedback (not sequential). Each value changes only while it
-- still equals the 0008 text, so admin edits are kept.
UPDATE "rounds" SET "description" = 'Ten connected tech clues: each answer leads to the next. All ten are on one screen; change your answers as often as you like until you submit. Highest score wins; time taken breaks ties.', "sequential" = false
WHERE "number" = 2 AND "description" = 'Thirty connected tech clues: each answer leads to the next. Solve one to unlock the next. The fastest to solve them all wins.';
--> statement-breakpoint
UPDATE "rounds" SET "instructions" = 'All ten clues are on one page; answer them in any order. You are not told whether an answer is right, so check your choices: you can change any answer until you submit. Ranking: most correct answers, then less time taken.'
WHERE "number" = 2 AND "instructions" = 'Clues unlock one at a time. Pick an option and check it: a wrong pick can be changed and checked again as often as you like, a correct pick unlocks the next clue. The hunt ends when the last clue is solved. Ranking: most clues solved, then fastest finish.';
