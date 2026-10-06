# Rockhop assessment checklist

Preparation date: 2026-10-06. Source: `rockhop-technical-assessment-project.md`.

## Scope and effort

Build a small React application with a Node.js or .NET backend. Search or browse
an external API through the backend, and maintain a persistent saved list.
The submission should be understandable enough to explain and defend live.

The brief suggests 4–6 hours and explicitly asks candidates not to spend
significantly longer. Reserve time for verification, documentation, and a demo.
If the budget runs out, disclose remaining work honestly.

Suggested allocation after selecting the design:

| Work                                                | Time             |
| --------------------------------------------------- | ---------------- |
| Design, repository setup, and API contract          | 30 minutes       |
| Backend integration, persistence, and focused tests | 90 minutes       |
| React search and saved-list flows                   | 90 minutes       |
| End-to-end checks, failure cases, and fixes         | 45 minutes       |
| README, code explanation, and demo rehearsal        | 45 minutes       |
| Contingency, only if needed                         | Up to 60 minutes |

## Requirements and evidence

Implementation and checks are recorded below. Human rehearsal and submission
timing are separate pending steps; automated checks do not establish them.

| ID  | Mandatory requirement                                                        | Proposed location                                              | Observable verification                                                                         | Status                                                  |
| --- | ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| F1  | Search or browse external data and display meaningful results                | `server/books/open-library.ts`, `client/books/ReadingList.tsx` | Live backend and browser search of The Hobbit; title/authors/year visible                       | Verified                                                |
| F2  | Add an external result to the saved list                                     | `routes.ts`, `ReadingList.tsx`                                 | `routes.test.ts` HTTP CRUD; browser Save book                                                   | Verified                                                |
| F3  | View saved items                                                             | `store.ts`, `ReadingList.tsx`                                  | HTTP CRUD and browser saved card/count                                                          | Verified                                                |
| F4  | Update at least one user-editable field                                      | `routes.ts`, `SavedBookRow.tsx`                                | HTTP CRUD; browser changed status and notes                                                     | Verified                                                |
| F5  | Remove a saved item                                                          | `routes.ts`, `ReadingList.tsx`                                 | DELETE204/404 tests; browser removed created test item                                          | Verified                                                |
| D1  | Saved data persists across application restarts                              | `server/books/store.ts`                                        | On-disk reopen test; actual backend stop/start retained saved status/notes                      | Verified                                                |
| T1  | Frontend uses JavaScript or TypeScript with React                            | `client/`, `package.json`                                      | Source inspected; Vite build passed                                                             | Verified                                                |
| T2  | Backend uses Node.js or .NET                                                 | `server/index.ts`, `package.json`                              | Node26.7 runtime demo; full checks also passed on Node24.12                                     | Verified                                                |
| T3  | Backend calls the external API; frontend does not call it directly           | `open-library.ts`, `client/books/api.ts`                       | Source trace: only server has Open Library fetch; client data paths are `/api`, no images/fonts | Verified by source and flows; no network trace artifact |
| T4  | React consumes the application's own REST or GraphQL endpoints               | `client/books/ReadingList.tsx`, `client/books/api.ts`          | All five flows through local REST API                                                           | Verified                                                |
| E1  | Validate incoming requests                                                   | `shared/books.ts`, `validation.ts`                             | Schema/HTTP tests for exact bounds, invalid fields/IDs, malformed and oversized input           | Verified                                                |
| E2  | Handle external API timeouts and non-success responses                       | `open-library.ts`, `ReadingList.tsx`                           | Controlled502/504 tests; browser offline error retained draft                                   | Verified                                                |
| E3  | Handle empty external API results                                            | `open-library.ts`, `ReadingList.tsx`                           | Adapter empty test; real no-result query showed helpful empty state                             | Verified                                                |
| E4  | Return appropriate HTTP status codes                                         | `routes.ts`, `server/app.ts`                                   | HTTP tests201/200/204/400/404/409/413/502/504/500                                               | Verified                                                |
| H1  | Share an accessible Git repository with incremental commits                  | Git history/remote                                             | Incremental commits pushed to public GitHub main; GitHub API verified branch SHA and visibility | Verified                                                |
| H2  | README explains prerequisites, installation, configuration, and run commands | `README.md`                                                    | Clean git-archive copy: npm ci, check/build, npm start on Node24.12; root200 and empty API list | Verified                                                |
| H3  | README explains architecture, structure, API choice, and data-store choice   | `README.md`                                                    | Explanation matched against modules by author and independent AI reviewer                       | Verified                                                |
| H4  | README records assumptions, limitations, and future improvements             | `README.md`                                                    | Native driver status, scale, storage, omitted enhancements disclosed and reviewed               | Verified                                                |
| H5  | README discloses AI tools and how they were used                             | `README.md`                                                    | Codex design/code/test/debug/browser/documentation roles disclosed honestly                     | Disclosure present; candidate walkthrough pending       |
| H6  | Application works locally from README or at a live URL                       | Entire application                                             | Production browser CRUD; clean-copy minimum-runtime start/API/static smoke                      | Verified locally                                        |
| H7  | Send repository at least 24 hours before presentation                        | Submission coordination                                        | Check submission timestamp against scheduled presentation                                       | Pending schedule                                        |
| P1  | Prepare a 15-minute presentation and 15-minute Q&A                           | `docs/demo.md`                                                 | Timed outline and Q&A prepared; candidate rehearsal pending                                     | Prepared; rehearsal pending                             |

Tests are optional in the brief, but a small set of integration tests is planned
to provide repeatable evidence for persistence, validation, and upstream failures.
The manual demo verifies the actual React interaction with the backend.

## Scope control

Optional enhancements may strengthen the submission's evidence, but the brief
does not promise bonus points or assign weights. A complete, explainable solution
takes priority over the number of features.

The selected topic is the recommended reading-list application. The written
design and implementation plan were approved on 2026-10-06. The selected stack is
React + TypeScript + Node.js/Express + SQLite.

| Enhancement                          | Proposed scope                                                                                  | Evidence                                                                                              | Priority/status                       |
| ------------------------------------ | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Automated tests                      | Native schema/store/HTTP/adapter/client request and saved-filter tests                          | `npm test`:33/33; includes stale-ID, upstream-ID and saved-page regressions                           | Verified                              |
| Pagination and saved search          | Discovery12/page; saved10/page with title/author filter, reset on new query                     | Backend page validation; saved-page tests and isolated browser pagination/filter/draft checks         | Verified                              |
| Cache external search results        | 60-second TTL,100 query/page entries,successful only                                            | Adapter hit/exact-expiry/capacity/failure tests                                                       | Verified                              |
| GitHub Actions CI                    | Template:lockfile install,lint,type checks,tests,build on Node24.12 and24                       | Local minimum-runtime checks pass; GitHub rejected active workflow push due to missing workflow scope | Template provided; active CI deferred |
| Images or richer details             | Author/year metadata with missing-value fallback                                                | Real browser metadata and adapter fallback checks                                                     | Metadata verified; images deferred    |
| Docker or docker-compose             | Add only if needed for reviewer setup; a local SQLite file does not need a database service     | Clean container setup following README                                                                | Deferred                              |
| Authentication or multi-user support | Adds identity, authorization, and per-user ownership beyond the required single-user saved list | Isolation and authorization tests would be necessary                                                  | Deferred                              |
| Cloud deployment with live URL       | Add only after local setup is reproducible and the host provides persistent database storage    | Live CRUD flow and data retained across backend restart/redeploy                                      | Deferred                              |

These priorities are scoped to the 4–6 hour budget. Reconcile them against actual
elapsed effort; record omitted optional work and reasons in the README. Optional
features must not consume the time reserved for final verification and rehearsal.

## Engineering constraints requested by the candidate

- **Maintainability and clean code:** separate HTTP handling, external API
  integration, persistence, and React presentation into a few focused modules.
  Use clear names and short functions; comments explain non-obvious decisions.
- **ACID:** use SQLite transactions for operations that need multiple writes,
  parameterized statements, uniqueness and status constraints, and appropriate
  durability settings. Preserve the same database file across restarts. Verify
  rollback behavior, duplicate rejection, and restart persistence. An API cache
  must never be the authoritative saved-list store.
- **DRY:** centralize repeated request validation and frontend backend-request
  handling where repetition actually exists. Keep the database's constraints
  even when the HTTP boundary validates the same input; the two protect
  different entry points.
- **SOLID:** give each module one responsibility and inject the external fetch
  function where testing requires substitution. Add abstractions only when
  needed; a generic repository, dependency-injection container, or interface
  hierarchy is unnecessary for this application.
- **Ponytail:** prefer platform features, the standard library, and a few
  established dependencies. Preserve validation, error handling, accessibility,
  and data integrity when simplifying.

| ID  | Additional quality requirement                                  | Verification                                                                                         | Status                                                       |
| --- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Q1  | SQLite data integrity and transactional persistence             | Store tests: constraints, reopen, stale-ID rejection and legacy preservation; WAL/FULL inspected     | Verified; each mutation atomic; upgrade transaction explicit |
| Q2  | Maintainable boundaries and understandable code                 | Author and independent AI reviewer traced modules; demo notes explain choices                        | Structure reviewed; candidate walkthrough pending            |
| Q3  | Practical DRY and SOLID without speculative abstractions        | Reviewer checked focused functions, validation, store/search seams                                   | Verified by review                                           |
| Q4  | Usable loading, empty, error, and keyboard-accessible UI states | Browser table below; controlled retry/race/double-click checks                                       | Verified                                                     |
| Q5  | Apply the design's Tao of Node considerations                   | Domain grouping, parsing/errors, functions, native tools, config/shutdown, tests                     | Reviewed against selected guidance                           |
| Q6  | Strict TypeScript with schema-derived contracts                 | Both tsc configurations pass on Node26.7 and24.12; boundaries parse unknown data                     | Verified                                                     |
| Q7  | Scoped Vercel React guidance                                    | Module-scope components, functional updates, independent reads, abort cleanup; browser overlap check | Verified by code/browser review                              |

Do not fabricate a retrospective commit history. Commit actual development
milestones as they are completed.

## Browser verification table

Initial state before Task 5: no client entry point; all UI flows fail/unavailable.

| Check                            | Expected behavior                                                               | Evidence                                                                                                                 |
| -------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Initial list loading/empty/error | Independent list status; retry; mutations wait for successful list read         | Real empty list; controlled temporary backend initial500 then Retry recovered                                            |
| Search success/empty/error       | Metadata, explicit empty state, scoped retryable error                          | Real Hobbit metadata; unique no-result query; offline error; typed client test                                           |
| Pagination/new query             | Previous disabled on page1; Next stops at last page/1000; new query resets page | Real page1→2; new query empty; fixture single page had both controls disabled;1000 ceiling inspected/tested              |
| Save/duplicate                   | Item appears once; result indicates Saved                                       | Real saved card; fixture double-click produced one saved form; HTTP409 test                                              |
| Status and notes                 | Explicit save persists both fields                                              | Browser status Reading and note saved; reloaded after actual restart                                                     |
| Remove                           | Item disappears and result becomes saveable                                     | Browser removed created test item; list count0 and empty state                                                           |
| Failed note save                 | Draft remains editable and error visible                                        | Stopped backend, Save changes failed, draft retained; client guidance test RED→GREEN                                     |
| Double click and stale reads     | Conflicting writes cannot repeat; old searches cannot replace newer results     | Delayed slow→fast search retained Latest search after delay; double click saved once; readiness gate inspected           |
| Keyboard/narrow viewport         | Labels, focus, keyboard actions; no horizontal overflow                         | Tab from search input focused Search; visible focus;390px and1280px layouts inspected; desktop overflow=false            |
| Restart and network destinations | Saved edit survives restart; requests use local /api                            | Actual stop/start retained previous saved notes; source fetch trace confirms only local client paths; no network archive |

## Submission scorecard

| Criterion     | Evidence required                                                            | Current status                                                     |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Completeness  | Every mandatory row has implementation and verification evidence             | Application flows green; rehearsal/submission coordination pending |
| Quality       | Relevant checks and failure tests pass; decisions and limitations are honest | Green:33/33,lint,two type checks,build; final reviewer issue fixed |
| Collaboration | Setup is reproducible; README, repository access, and history are coherent   | Clean setup and public main verified; active CI deferred           |

Preparation does not establish that the application is complete or ready to send.

## Final verification record

- `npm run check`: passed on Node26.7.0 and, through npm's pinned Node package,
  Node24.12.0. Final suite29/29; both strict type checks,lint and Vite build pass.
- Clean copy from committed source: `npm ci`,minimum-runtime full check/build,
  and `npm start` passed; `GET /`200 and `GET /api/books` returned `[]`.
- Invalid `PORT` produced `invalid_configuration` and exit1.
- Native SQLite experimental warnings on24.12 and the deliberately logged500
  test diagnostic were expected; neither was concealed or counted as a failure.
- Independent final AI review found one Important stale-ID reuse issue; tests
  reproduced it, AUTOINCREMENT and a data-preserving legacy upgrade fixed it,
  and the29-test suite passed afterward. See [review record](review.md).
- Source assessment document, local databases, `.env`, temporary fixtures and
  execution scratch are excluded from the submitted tree.
- Candidate code walkthrough, timed rehearsal, presentation schedule and email
  submission remain pending. Nothing was emailed by Codex.

## Final handoff update

Saved-list refinement: native details/summary rows start collapsed with title,
author/year, and saved status visible. Browser checks confirmed click and
Enter/Space toggling, unsaved indication while collapsed, draft retention on
reopen, and a readable 390px layout. Temporary draft text was restored without
saving; existing saved items were preserved. Full checks passed with 29 tests.

- The owner authorized a direct merge to main. The feature branch was
  fast-forwarded and pushed, preserving its incremental history. GitHub's API
  confirmed public visibility, main as the default branch, and implementation
  commit `5e94b87` on remote main.
- Prettier formatted all supported source/documentation files; source reference
  material and generated/private files were excluded. `npm run format:check`
  is part of `npm run check`. Four brief comments explain race guards and drafts.
- After the Ponytail cuts, full checks passed on Node 26.7 and minimum 24.12:
  formatting, lint, two strict type checks, 29 tests, and production build.
  The final browser smoke returned 461 Hobbit results with author/year metadata.
- [Simplicity findings and execution rulings](review.md) record the cuts, accepted
  ceilings, and costs if decisions are wrong. No deferred Minor review findings.
- Optional active CI still needs workflow permission. The candidate's walkthrough,
  rehearsal, schedule, and submission remain pending.

Feature grouping refinement: reading-list components and request tests now live
in `client/books/`; the entry point composes `ReadingList`. Server book modules
and shared schemas retain their responsibilities. This move adds no runtime code
or dependencies. Prettier remains pinned, with format and format-check scripts.

Responsibility split: BookSearch owns search state, cancellation, results, and
pagination; ReadingList owns page layout, saved-list loading, and mutations.
The saved-item editor remains in SavedBookRow. All 29 tests and full checks pass.
An isolated browser fixture verified slow/fast searches, list failure/retry,
disabled saves until readiness, duplicate clicks, save feedback, notes updates,
and removal making the search result saveable again. Existing user data was
untouched. ReadingList fell from 322 to 176 lines; one component was added with
explicit props and no new dependencies.

Collection/discovery refinement: separate accessible Saved books and Discover
books tabs replace the simultaneous columns. The intro is shorter. Saved books
filter instantly by title or author and show ten per page; discovery retains
twelve per page. Pagination is hidden for single-page results. Page changes move
focus to the section heading. Left/Right and Home/End switch tabs.

- New native tests were observed failing before implementing filtering/paging,
  then passed, including a deleted last-page boundary and an author match beyond
  the first page. Full checks pass with 31 tests on Node 26.7 and minimum 24.12.
- An isolated temporary SQLite fixture with 21 saved books verified list
  failure/retry, pages/ranges, author filtering, clear/no-match states, saving a
  discovered result, keyboard tab switching, and notes surviving filtering,
  paging, and switching views. A new save updated the count from 21 to 22.
- Browser inspection confirmed page changes focus the heading and no horizontal
  overflow at 390px and 1280px. The production preview retained both existing
  saved books. Its single-page collection has no pagination controls.
- Saved pagination/filtering is client-side. The API returns all saved books;
  hidden rows stay mounted to preserve drafts. For thousands of books, lift
  drafts into keyed state and move paging/filtering into SQLite. No dependency
  or backend contract was added. Guidance and this ceiling are in the README.

Upstream-ID regression: searching `ursuls` succeeded on page 1 but page 2 returned
local HTTP 502. Direct upstream inspection returned HTTP 200 with three edition
IDs (`OL18739976M`, `OL17609244M`, `OL21536600M`) under `/works/` keys. The work-only
schema rejected the whole page. Search now drops invalid work IDs and validates
the remaining page; saved-book validation is unchanged. An all-invalid nonempty
page still returns an upstream error. A regression test failed before the fix
and passed afterward. The returned total remains the upstream count. Full checks
pass with 33 tests on Node 26.7 and minimum 24.12. After restarting the preview,
the same local API request returned HTTP 200 with nine valid books; clicking Next
in the original browser tab showed Page 2 of 22 without the error. The existing
13 saved books were unchanged.

## Rubric audit — 2026-10-06

Reviewed application source at `0cf05c4`. This is an evidence-based readiness
review, not an employer score or an estimate of hiring probability. The brief
gives no weights or guaranteed bonus points for optional enhancements.

| Evaluation area      | Evidence and assessment                                                                                                                                                                | Remaining limit                                                                                                                         |
| -------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Functionality        | Required search/add/view/update/remove flows have HTTP tests and recorded browser checks. Fresh production startup and CRUD/restart smoke passed.                                      | Live discovery depends on Open Library/network availability.                                                                            |
| Backend design       | Thin [routes](../server/books/routes.ts), separate [adapter](../server/books/open-library.ts)/[store](../server/books/store.ts), shared runtime schemas, centralized safe HTTP errors. | Local synchronous storage; no multi-user authorization.                                                                                 |
| API integration      | Tests cover non-success HTTP, malformed/empty data, network/deadline failures, cache boundaries, and the real invalid-ID regression.                                                   | Queue wait is outside the fetch deadline; queued work is unbounded and not cancelled. Failed-page recovery restarts search at page one. |
| Data handling        | Prepared SQL, unique/non-reused IDs, constraints, atomic writes, on-disk reopen and stale-ID/legacy upgrade tests. Fresh restart retained status and notes.                            | No backups or cross-tab conflict resolution; metadata is a saved snapshot.                                                              |
| Frontend             | Focused components, guarded/abortable async work, draft retention, separate tasks, local filtering/pagination, recorded keyboard and narrow-screen checks.                             | UI verification is manual; saved paging still loads/mounts the whole collection.                                                        |
| Code quality         | Strict inferred TypeScript contracts, readable feature boundaries, brief intent comments, ESLint/Prettier passing; no new abstraction needed.                                          | Candidate must personally understand the native-driver and migration tradeoffs.                                                         |
| Engineering practice | Focused incremental history, pinned lockfile, reproducible README, AI disclosure, 33 passing tests, production build. Public remote main matched audited source.                       | Active CI remains deferred; the template is not a running pipeline. Actual effort was not measured by this audit.                       |
| Communication        | [Demo/Q&A notes](demo.md) now reserve five minutes for code tracing, include a network fallback and honest limitations.                                                                | Personal review of every submitted line and an uninterrupted timed rehearsal remain unverified.                                         |

Fresh verification:

- Current checkout: `npm run check`, exit 0; formatting, lint, both TypeScript
  checks, 33/33 tests, production build.
- Isolated copy of committed source, with no pre-existing dependencies, `.env`
  or database: `npm ci`, `npm run check`, and `npm start` on Node 24.12.0 passed.
  The pinned Node package selected the minimum runtime for these commands.
- Production HTTP smoke: root HTML 200, empty list, create 201, edit 200, actual
  stop/start retained both edited fields, remove 204, empty list again. Test data
  used a separate database and port; the user's preview/data were untouched.
- The context tool initially fell back to the original checkout when asked to
  run outside its project root. Those apparent clean-copy results were discarded;
  the successful run verified its working directory in an isolated ignored copy.
- `git diff --check` passed; history and tracked files were inspected. The original
  assessment document remains untracked; databases, configuration secrets,
  dependencies and test scratch are excluded from the submitted source.

Delivery contract:

| Criterion     | Gate                                                                                                                                            |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| Completeness  | Application requirements verified. Personal understanding, rehearsal, and 24-hour submission timing remain unverified mandatory delivery steps. |
| Quality       | Green for the assessed local application: checks and failure-path evidence pass; limitations are disclosed.                                     |
| Collaboration | Green for repository handoff: clean setup works, README matches behavior, and incremental public history is coherent.                           |

**Technical application: verified, with disclosed optional limitations. Overall
submission gate: not Green; unverified mandatory delivery steps are Red under
the evidence contract.** This does not mean a core application flow failed.
Do not claim the candidate has completed those steps until there is evidence.
Freeze features now: the useful next work is personal code review, rehearsal,
honest effort accounting, and confirming the submission/presentation schedule.
