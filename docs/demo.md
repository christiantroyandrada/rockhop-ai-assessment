# Presentation and Q&A notes

Plan for 15 minutes presenting, then 15 minutes of questions. Personal code
review and timed rehearsal are still pending.

| Minutes | Show                                                                                                     |
| ------- | -------------------------------------------------------------------------------------------------------- |
| 0-1     | The problem: find a book and remember why you want to read it. One local user.                           |
| 1-5     | Discover, save, filter, edit status/notes, restart to prove persistence, then remove. Keep paging brief. |
| 5-8     | React -> local REST -> Open Library/SQLite. Explain validation, storage and the file boundaries.         |
| 8-13    | Trace one PATCH from draft to database, then show the search adapter and a regression test.              |
| 13-15   | AI assistance, chosen extras, accepted limits and next steps.                                            |

Before presenting, follow the README from a clean copy and keep the completed
check output ready. Have one saved book as a fallback. If live search fails,
show the error and continue with the saved list; don't depend on exact result counts.
Save empty-search and failed-save demonstrations for Q&A if time is tight.

## Code walkthrough

Open these files beforehand:

- `client/books/SavedBookRow.tsx` -> `ReadingList.tsx` -> `api.ts`: local draft,
  immediate duplicate-click guard, request and successful state update.
- `server/books/routes.ts` -> `shared/books.ts` -> `store.ts`: request validation,
  prepared SQL, atomic update and missing-item response.
- `server/books/open-library.ts` and its test: deadline, cache and the real
  edition-ID bug. Explain why invalid IDs are skipped, saved validation stays
  strict, and the upstream total can exceed the usable results.

Practice tracing these without a script. Then review the remaining source and
tests: the brief expects understanding of every submitted line.

## Questions to prepare

- **Why Node/TypeScript?** Connect the choice to JavaScript experience and code
  you can explain. Microsoft alignment alone doesn't establish a higher score.
- **What does ACID mean here?** Explain SQLite's transaction guarantees,
  single-statement writes, uniqueness, prepared SQL, WAL/FULL and reopen tests.
  The cache is not persistent storage.
- **Why validate JSON if TypeScript checks pass?** Types disappear at runtime.
  Show a shared schema validating unknown input and supplying its type.
- **Why no ORM or service hierarchy?** Five routes and one table need little setup.
- **Why native SQLite?** No extra database service/addon. The driver is
  experimental on the minimum runtime, and synchronous work blocks the event loop.
- **How are failures handled?** 400 invalid input, 409 duplicate, 404 missing,
  413 oversized, 502 upstream, 504 deadline and 500 safe generic error.
  Diagnostic details stay on the backend.
- **What stops timing bugs?** Old searches are aborted/ignored. Writes wait for
  the first list read, duplicate clicks are guarded and failed saves retain drafts.
- **How does the cache work?** Query/page keys, 60-second expiry, 100 entries,
  oldest-entry removal and no cached failures.
- **What's still imperfect?** A failed discovery page restarts at page one on
  resubmission. Queue wait is outside the fetch deadline; queued work is unbounded
  and isn't cancelled when the browser aborts. Saved paging loads the full list.
- **What changes for production?** User ownership, persistent hosting storage,
  backups, bounded/cancellable requests and monitoring. Consider async storage
  when load warrants it, plus automated browser checks.
- **What did AI do?** Use the README disclosure and show the actual code/tests.
  Don't claim personal review you haven't done.

Complete one uninterrupted rehearsal, answer these in your own words and record
actual effort honestly. Confirm the reviewer gets the repository at least
24 hours before the presentation. If unsure in Q&A, say what you don't know and
how you'd check it.
