-- Custom migration: the confirmed event date and venue, and the full coordinator
-- list with bundled photos. Photos uploaded later from the admin panel are kept.
UPDATE "event_info"
SET "event_date" = 'Tuesday, 24 November 2026, 9:30 AM'
WHERE "id" = 1;
--> statement-breakpoint
UPDATE "event_info"
SET "venue" = 'Seminar Hall 1, A J Institute of Engineering and Technology'
WHERE "id" = 1;
--> statement-breakpoint
UPDATE "people"
SET
  "name" = 'Ms. Devika',
  "role" = 'Co-Curricular Coordinator',
  "photo_url" = COALESCE("photo_url", '/people/devika.jpg')
WHERE "kind" = 'faculty' AND "name" = 'Devika Ma''am';
--> statement-breakpoint
UPDATE "people"
SET
  "name" = 'Mrs. Anusha Anchan',
  "role" = 'Event Coordinator',
  "photo_url" = COALESCE("photo_url", '/people/anusha.jpg')
WHERE "kind" = 'faculty' AND "name" = 'Anusha Ma''am';
--> statement-breakpoint
INSERT INTO "people" ("kind", "name", "role", "position", "photo_url")
SELECT 'faculty', 'Mrs. Remul Pinto', 'Event Coordinator', 3, '/people/remul-pinto.jpg'
WHERE NOT EXISTS (
  SELECT 1 FROM "people" WHERE "name" = 'Mrs. Remul Pinto'
);
--> statement-breakpoint
INSERT INTO "people" ("kind", "name", "role", "position", "photo_url")
SELECT 'team', 'S. Mohammed Sharwan', 'Technical Coordinator', 1, '/people/s-mohammed-sharwan.jpg'
WHERE NOT EXISTS (
  SELECT 1 FROM "people" WHERE "name" = 'S. Mohammed Sharwan'
);
