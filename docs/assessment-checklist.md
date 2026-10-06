# Rockhop assessment checklist

Recorded on 2026-10-06 against the supplied assessment brief. The application
checks are complete; personal code review, rehearsal and submission timing are
still pending.

## Scope

A React reading list with a Node/Express backend, Open Library search and local
SQLite storage. The required flows are search, save, view, edit and remove, with
saved data retained after restart.

The brief suggests 4-6 hours, including checks and handoff. Actual effort was
not measured by this audit. Optional features have no promised bonus score.
The [design](superpowers/specs/2026-10-06-reading-list-design.md) and
[plan](superpowers/plans/2026-10-06-reading-list.md) were approved on 2026-10-06.

## Requirements and evidence

Paths below refer to the current files. Tests are repeatable; browser checks
were manual. Neither proves that the candidate has personally reviewed the code.

| ID  | Requirement                                       | Implementation                                                | Verification                                                      | Status                                |
| --- | ------------------------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| F1  | Search external data and show meaningful results  | `server/books/open-library.ts`, `client/books/BookSearch.tsx` | Live Hobbit search showed title, authors and year                 | Verified                              |
| F2  | Add a search result                               | `server/books/routes.ts`, `client/books/ReadingList.tsx`      | HTTP CRUD test and browser Save book                              | Verified                              |
| F3  | View saved items                                  | `server/books/store.ts`, `client/books/SavedBooks.tsx`        | HTTP list and browser rows/count                                  | Verified                              |
| F4  | Edit a user-controlled field                      | `server/books/routes.ts`, `client/books/SavedBookRow.tsx`     | Status and notes saved in HTTP/browser checks                     | Verified                              |
| F5  | Remove a saved item                               | `server/books/routes.ts`, `client/books/ReadingList.tsx`      | DELETE 204/404 tests; browser removal                             | Verified                              |
| D1  | Persist across restarts                           | `server/books/store.ts`                                       | On-disk reopen tests and actual backend restart                   | Verified                              |
| T1  | React with JavaScript or TypeScript               | `client/`, `package.json`                                     | Source inspection and Vite build                                  | Verified                              |
| T2  | Node.js or .NET backend                           | `server/index.ts`, `package.json`                             | Node 26.7 and minimum 24.12 checks                                | Verified                              |
| T3  | Call the external API through the backend         | `server/books/open-library.ts`, `client/books/api.ts`         | Source trace and working local flows; no network archive          | Verified by source/flows              |
| T4  | React uses the application's REST/GraphQL API     | `client/books/api.ts`                                         | All required flows use local REST endpoints                       | Verified                              |
| E1  | Validate requests                                 | `shared/books.ts`, `server/books/validation.ts`               | Bounds, fields, IDs, malformed/oversized input tests              | Verified                              |
| E2  | Handle external failures/timeouts                 | `server/books/open-library.ts`, `client/books/BookSearch.tsx` | Adapter and HTTP 502/504 tests; visible browser errors            | Verified                              |
| E3  | Handle empty search results                       | `server/books/open-library.ts`, `client/books/BookSearch.tsx` | Adapter test and live no-result query                             | Verified                              |
| E4  | Use appropriate HTTP status codes                 | `server/books/routes.ts`, `server/app.ts`                     | Tests for 201/200/204/400/404/409/413/502/504/500                 | Verified                              |
| H1  | Share an accessible repo with incremental commits | Public GitHub `main` and Git history                          | Public visibility, branch SHA and focused commits checked         | Verified                              |
| H2  | Document setup and configuration                  | `README.md`                                                   | Clean committed copy installed, checked and started on Node 24.12 | Verified                              |
| H3  | Explain structure and API/storage choices         | `README.md`                                                   | Compared with source and AI review                                | Verified                              |
| H4  | Document assumptions and limits                   | `README.md`                                                   | Driver stability, local scale and omitted extras disclosed        | Verified                              |
| H5  | Disclose AI use                                   | `README.md`                                                   | Actual design/code/test/debug/docs assistance listed              | Present; personal walkthrough pending |
| H6  | Run locally or at a live URL                      | Application                                                   | Production browser flows and clean-copy HTTP checks               | Verified locally                      |
| H7  | Send repo at least 24 hours before presentation   | Submission coordination                                       | Compare actual send time with scheduled presentation              | Pending schedule/submission           |
| P1  | Prepare a 15-minute presentation and Q&A          | [Demo notes](demo.md)                                         | Timed outline and questions prepared                              | Rehearsal pending                     |

## Extras and engineering choices

| Extra                                  | Evidence                                                                                            | Status                                            |
| -------------------------------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| Automated tests                        | 33 tests, including stale-ID, invalid upstream-ID and saved-page cases                              | Verified                                          |
| Discovery/saved pages and saved search | Twelve discovery results, ten saved books per page; title/author filtering tests and browser checks | Verified                                          |
| Search cache                           | 60-second expiry, 100 entries, separate query/page keys, no cached failures                         | Verified                                          |
| Author/year details                    | Live metadata and missing-field fallback tests                                                      | Verified; images deferred                         |
| GitHub Actions                         | [Template](ci-workflow.example.yml); equivalent commands pass locally                               | Inactive; publishing requires workflow permission |
| Docker, login and deployment           | Outside the chosen local scope                                                                      | Deferred; no working implementation claimed       |

The code uses a few focused modules. SQLite handles atomic writes and durability;
shared schemas validate requests and responses. Repeated request handling is
centralized without adding a generic service/repository framework. Short comments
explain timing guards, draft retention and the synchronous-storage limit.

| ID  | Requested quality check                          | Evidence                                                                         | Status                                 |
| --- | ------------------------------------------------ | -------------------------------------------------------------------------------- | -------------------------------------- |
| Q1  | ACID and persistence                             | Constraints, rejected-write/reopen tests, WAL/FULL, transactional legacy upgrade | Verified                               |
| Q2  | Maintainable boundaries                          | Source/AI review and code walkthrough notes                                      | Reviewed; personal walkthrough pending |
| Q3  | Practical DRY/SOLID                              | Focused modules and explicit store/search dependencies                           | Reviewed                               |
| Q4  | Usable loading, empty, error and keyboard states | Browser checks below                                                             | Verified manually                      |
| Q5  | Selected Tao of Node guidance                    | Feature grouping, validation/errors, native tools, config/shutdown and tests     | Reviewed                               |
| Q6  | Strict TypeScript with shared types              | Both compiler checks pass; unknown JSON is parsed before use                     | Verified                               |
| Q7  | Relevant React guidance                          | Module-scope components, functional updates, independent reads and abort cleanup | Reviewed and checked in browser        |

## Browser checks

| Check                      | Observed result                                                                                                                                                |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| List loading/empty/error   | Empty state worked; controlled initial 500 recovered through Retry. Saving stayed disabled until the list loaded.                                              |
| Search success/empty/error | Hobbit metadata, a no-result query and an offline error displayed as expected.                                                                                 |
| Discovery pages/new query  | Page one advanced to two; new query reset the page. First/last controls and the 1000-page ceiling were checked.                                                |
| Save/duplicate             | Saved result appeared once. A controlled double click made one item; duplicate HTTP writes returned 409.                                                       |
| Edit/restart               | Reading status and notes survived a real stop/start.                                                                                                           |
| Remove                     | Created test item disappeared and became saveable again.                                                                                                       |
| Failed save                | With the backend stopped, the draft stayed editable and the error remained visible.                                                                            |
| Overlapping requests       | A delayed old search did not replace the newer results or loading state.                                                                                       |
| Keyboard/responsive layout | Labels and focus worked; narrow/desktop checks showed no horizontal overflow.                                                                                  |
| Collapsible rows           | Click, Enter and Space toggled the editor. Closing/reopening retained drafts and the unsaved indicator.                                                        |
| Saved filter/pages/tabs    | A separate 21-book fixture verified ranges, title/author matches, clear/no-match states, page clamping and preserved drafts. Saving increased its count to 22. |
| Page focus and tabs        | Page changes focused the heading. Arrow keys and Home/End switched views.                                                                                      |
| Footer/pager               | Centered footer checked at 390/1280px; grouped pager and larger label checked at 320/1280px.                                                                   |

Controlled tests used separate databases and preserved existing user data.
Browser checks establish observed behavior, not an automated UI suite.

## Review and fix history

The [independent AI review](review.md) ran 27 tests and found deleted-ID reuse:
old tabs could update a replacement book. Two failing tests reproduced it.
AUTOINCREMENT and a data-preserving legacy upgrade fixed it; checks then passed
with 29 tests on Node 26.7 and 24.12. No second independent review was performed.

The owner authorized a direct merge to `main`. The branch was fast-forwarded
and pushed with its incremental commits. Components later moved into
`client/books/`; discovery and saved-list responsibilities were separated.
Saved filtering/page tests brought the suite to 31. Original design/plan paths
are historical; the README lists current files.

Searching `ursuls` worked on page one but failed on page two. Open Library
returned HTTP 200 with three edition IDs under `/works/` paths:
`OL18739976M`, `OL17609244M` and `OL21536600M`. The adapter now skips invalid work
IDs, validates the rest, and still rejects an all-invalid nonempty page. Two
new tests brought the suite to 33. The real page-two request then returned 200
with nine valid books, and the browser showed Page 2 of 22. The existing 13 saved
books were unchanged. Totals still come from the upstream API.

## Latest verification

Application source audited at `0cf05c4` on 2026-10-06:

- `npm run check` passed on Node 26.7: formatting, lint, both TypeScript checks,
  33/33 tests and production build.
- An isolated copy of committed source, without dependencies, `.env` or a
  database, passed `npm ci`, `npm run check` and `npm start` on Node 24.12.0.
  Its working directory was checked; an earlier tool fallback to the original
  checkout was discarded as clean-copy evidence.
- Production HTTP checks passed: root HTML 200, empty list, create 201, edit 200,
  actual restart retaining both edited fields, remove 204 and empty list again.
  They used a separate port/database.
- Invalid `PORT` exited with `invalid_configuration`. Expected SQLite warnings
  and the deliberate safe-error test diagnostic were recorded as such.
- `git diff --check`, tracked files and history were inspected. Public remote
  `main` matched the audited source. The original brief stayed untracked;
  databases, `.env`, dependencies and temporary test files were excluded.

## Evaluation areas

This review does not predict hiring odds or assign an employer score.

| Area                 | Evidence                                                                 | Limit                                                                               |
| -------------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| Functionality        | Required flows tested; clean setup and restart verified                  | Live search needs network/API availability                                          |
| Backend design       | Separate routes, validation, search and storage; safe central errors     | Local synchronous storage, no user authorization                                    |
| API integration      | Failure/timeout/empty data, cache and invalid-ID tests                   | Unbounded queue; fetch deadline excludes wait; failed-page retry starts at page one |
| Data handling        | Prepared SQL, constraints, non-reused IDs, reopen/upgrade tests          | No backup or cross-tab conflict handling                                            |
| Frontend             | Focused components, retained drafts, filtering/pages and keyboard checks | Manual UI checks; full saved collection stays loaded/mounted                        |
| Code quality         | Strict types, short intent comments, lint/format checks                  | Personal understanding must still be demonstrated                                   |
| Engineering practice | Lockfile, 33 tests, README, AI disclosure, incremental public history    | CI is inactive; actual effort not measured by audit                                 |
| Communication        | Timed outline, code trace, fallback and Q&A prepared                     | Personal review/rehearsal unverified                                                |

## Submission status

| Criterion     | Status                                                                                      |
| ------------- | ------------------------------------------------------------------------------------------- |
| Completeness  | Application requirements verified; personal review, rehearsal and submission timing pending |
| Quality       | Green for the local app: checks/failure paths pass and limits are disclosed                 |
| Collaboration | Green for handoff: clean setup, accurate README and coherent public history                 |

**The application is verified. Submission is not yet Green:** mandatory personal
understanding and delivery steps are unverified, which is Red under the evidence
contract. That status does not indicate a failed application flow.

Keep feature work finished. Next: review every submitted line, rehearse, record
actual effort honestly and confirm the submission/presentation schedule.
Nothing was emailed by Codex.
