-- Custom migration: seed rows the application expects to exist.
-- Every value is editable from the admin panel afterwards.
INSERT INTO "rounds" ("number", "title", "description", "instructions", "status", "duration_minutes", "sequential") VALUES
  (1, 'Quiz', 'Rapid-fire technical questions across programming, networks, databases and computing fundamentals.', 'Answer every question, then submit the round. You can change an answer until you submit.', 'draft', 20, false),
  (2, 'Tech Treasure Hunt', 'Follow a trail of technical clues. Solve one to unlock the next.', 'Clues unlock one at a time. Type your answer to each clue; a correct answer reveals the next clue. Wrong answers can be retried.', 'draft', 30, true),
  (3, 'Bug Hunt', 'Read the code, find the bug and name the fix.', 'Each question shows a code snippet. Pick or type the answer that identifies the bug, then submit the round.', 'draft', 30, false)
ON CONFLICT ("number") DO NOTHING;
--> statement-breakpoint
INSERT INTO "event_info" ("id", "name", "tagline", "introduction", "details", "event_date", "venue", "organizer", "lead_name", "lead_email") VALUES
  (1, 'TechBash', 'Three rounds. One terminal. Prove your tech skills.', 'TechBash is a technical event with three rounds: a quiz, a tech treasure hunt and a bug hunt. Log in with your full name and USN, unlock each round with the access key announced at the venue, and compete for the top of the leaderboard.', 'Scores are counted on the server. Ties are broken by total time taken, then by who finished first.', 'Date to be announced', 'A J Institute of Engineering and Technology', 'Department of Computer Science and Engineering', 'S. Mohammed Sharwan', 'sharwan@ajiet.edu.in')
ON CONFLICT ("id") DO NOTHING;
--> statement-breakpoint
INSERT INTO "people" ("kind", "name", "role", "position") VALUES
  ('faculty', 'Devika Ma''am', 'Faculty Coordinator', 1),
  ('faculty', 'Anusha Ma''am', 'Faculty Coordinator', 2);
