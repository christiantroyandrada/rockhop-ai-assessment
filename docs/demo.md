# Presentation and Q&A notes

Target: 15-minute presentation, then 15-minute Q&A. This outline is not evidence
that the candidate has rehearsed or reviewed the entire codebase.

| Minutes | Demonstration |
|---|---|
| 0–2 | Problem: discover a book and remember why you wanted to read it. Scope: one local user. |
| 2–5 | Trace React → Express → Open Library/SQLite. Explain static types, runtime validation, and DB constraints. |
| 5–11 | Search The Hobbit, paginate, save, edit status/notes, restart backend and show persistence, remove. Show empty results and a failed-save draft. |
| 11–13 | Run `npm run check`; explain one rejected-write test and an upstream HTTP failure test. |
| 13–15 | Optional cache/pagination/CI, deferred auth/deployment, native SQLite tradeoff, AI disclosure, candidate review responsibility. |

Before presenting: clone the submitted branch, follow README setup, check CI,
ensure internet access, and have a saved book for an offline persistence demo.
Avoid relying on exact live result counts.

Questions to prepare:

- Why Node/TypeScript? Connect JavaScript experience to an explainable solution;
  Microsoft alignment alone does not guarantee a higher score.
- What does ACID mean here? SQLite owns atomicity/consistency/isolation/durability.
  Explain single-statement mutations, uniqueness, constraints, prepared SQL,
  WAL/FULL, failed-write and reopen tests. Cache is not durable storage.
- Why runtime validation with strict types? HTTP/JSON is unknown and types
  disappear at execution. Trace one schema-derived type.
- Why no ORM/service hierarchy? Five routes and one table need little setup.
- Why native SQLite? No extra service/addon; experimental on minimum runtime;
  synchronous event-loop ceiling accepted for local use.
- How do failures behave? 400 invalid,409 duplicate,404 missing,413 oversized,
  502 upstream,504 deadline,500 safe generic error; backend diagnostics only.
- What about stale reads/drafts? Abort/ignore old searches; guard mutations;
  retain failed-save drafts; initialize the list before allowing writes.
- How does cache invalidation work? Query/page,60-second TTL,100 entries,oldest
  eviction,no failure caching; saved data remains separate.
- What changes for production? Identity/ownership, persistent hosting storage,
  backups, async storage if load warrants it, deployment config, monitoring,
  browser automation.
- What did AI do? Follow the README disclosure; demonstrate actual code/tests.
  Do not claim unperformed personal review.

Candidate walkthrough and timed rehearsal: **pending**.
