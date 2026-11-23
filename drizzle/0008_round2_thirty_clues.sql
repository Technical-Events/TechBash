-- Custom migration: round 2 grows from fifteen puzzles to thirty connected clues. Changes
-- the description only while it still equals the 0005 text, so admin edits are kept.
UPDATE "rounds" SET "description" = 'Thirty connected tech clues: each answer leads to the next. Solve one to unlock the next. The fastest to solve them all wins.'
WHERE "number" = 2 AND "description" = 'Fifteen tech and logic puzzles. Solve one to unlock the next. The fastest to solve them all wins.';
