# Presentation and Q&A notes

Target: 15-minute presentation, then 15-minute Q&A. This outline is not evidence
that the candidate has rehearsed or reviewed the entire codebase.

| Minutes | Demonstration                                                                                                                           |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 0–1     | Explain the problem and single-user scope.                                                                                              |
| 1–5     | Discover a book, save it, filter the saved list, edit status/notes, restart to show persistence, then remove it. Keep pagination brief. |
| 5–8     | Trace React → local REST → Open Library/SQLite. Explain the schema boundary, storage choice, and focused feature modules.               |
| 8–13    | Walk through one PATCH from draft to persisted row, then the search adapter and one regression test. Show completed check output.       |
| 13–15   | Explain AI assistance, chosen enhancements, accepted limits, and what you would improve next.                                           |

Before presenting: clone the submitted branch, follow README setup, run checks,
ensure internet access, and have a saved book for an offline persistence demo.
Avoid relying on exact live result counts.

Keep the check output ready instead of running the full toolchain during the
presentation. If live search fails, show the visible error and continue with a
previously saved book. Reserve empty-search and failed-save demonstrations for
Q&A if the core demo approaches four minutes.

For the code walkthrough, open these files beforehand:

- `client/books/SavedBookRow.tsx` → `ReadingList.tsx` → `api.ts`: draft state,
  duplicate-click guard, request, and successful functional state update.
- `server/books/routes.ts` → `shared/books.ts` → `store.ts`: PATCH validation,
  prepared SQL, atomic update, and missing-item response.
- `server/books/open-library.ts` and its test: deadline, cache, and the real
  edition-ID regression. Explain why invalid identities are skipped while
  saved-book validation remains strict, and why the upstream total can exceed
  the usable results.

Practice tracing these without a prepared script, then inspect the remaining
source and tests. A focused presentation does not replace the brief's requirement
to understand every submitted line.

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
- What is still imperfect? A failed discovery page clears the results; resubmit
  Search to restart at page one. The eight-second timeout covers the upstream
  fetch, not time waiting for a reserved request slot. Queued work is not bounded
  or cancelled when the browser aborts. These are disclosed local-use limits;
  production would need a bounded/cancellable queue and better page retry.
- What did AI do? Follow the README disclosure; demonstrate actual code/tests.
  Do not claim unperformed personal review.

Candidate walkthrough and timed rehearsal: **pending**.

Before submission, personally complete one uninterrupted 15-minute rehearsal,
answer the questions above in your own words, confirm actual time spent honestly,
and check that the repository reaches the reviewer at least 24 hours before the
scheduled presentation. If unsure during Q&A, name the uncertainty and describe
a concrete experiment or documentation check rather than guessing.
