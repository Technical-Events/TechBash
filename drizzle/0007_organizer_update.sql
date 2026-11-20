-- Custom migration: the event is hosted by the technical committee.
UPDATE "event_info"
SET "organizer" = 'Technical Committee AJIET'
WHERE "id" = 1;
