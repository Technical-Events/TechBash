# Roadmap

## Done

- **Phase 1 — Scaffold** (2026-10-11): design system, pages, Neon/Drizzle foundation.
- **Phase 2 — Event platform** (2026-10-22): Better Auth (admin + roster-checked
  participant login), three access-key-gated rounds (quiz, sequential treasure hunt, bug
  hunt with code), timers with server-enforced deadlines, admin panel (dashboard with
  charts, rounds, questions, keys, roster, results with tie-breaks and winners, CSV
  exports, content and photos, messages), editable Home and Contact Us. Verified end to
  end on a local database.

- **2026-11-18**: 30-question all-branch quiz (30 minutes) and 15-clue multiple-choice
  treasure hunt, loaded by `pnpm questions:import` from a gitignored bank; top-N
  qualification between rounds; admin management in the panel; access-key sheet.
  Typecheck, lint, tests and build pass; not yet exercised against a database.
- **2026-11-20**: confirmed event date and venue; three faculty members and one student
  coordinator with bundled photos; Home sections renamed to Faculty members and Student
  coordinators.

- **2026-11-24**: admin Leaderboard page: live standings re-read every 5 seconds, rank
  moves, and the overall top 5 in a popup when a round is closed (replayable). Typecheck,
  lint, tests and build pass; not yet exercised in a browser against a database.

- **2026-11-24**: round 2 replaced with 10 connected clues on one screen, answered in any
  order with no right/wrong feedback (not sequential). Its 17 earlier attempts were deleted
  after a backup in `private/`; the top-17 qualifier list was kept.

## Next (confirmed)

- **Go live checks**: repeat the end-to-end checks on the deployed site and verify a photo
  upload.
- **Rehearsal**: a dry run with a few participants on the real deployment before the event.

## Suggestions (not approved)

- Committed Playwright end-to-end suite and CI running typecheck, lint, tests, build.
- Participant passwords or one-time codes if the event is ever run remotely.
- Multiple-answer questions; per-question time limits; negative marking.
- Public leaderboard page after the event.
