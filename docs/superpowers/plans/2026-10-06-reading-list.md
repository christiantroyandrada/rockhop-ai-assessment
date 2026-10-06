# Reading List implementation plan

Approved on 2026-10-06 and executed in the dedicated checkout. This is the
original task sequence with execution notes, not a new set of work to run.
Current files and behavior are documented in the [README](../../../README.md).

**Goal:** book search and a persistent reading list, with tests, paging and an
accurate AI disclosure.

**Stack:** React, TypeScript, Vite, Express, Zod, native Node SQLite/test runner
and ESLint. React calls one API; book modules own search and storage, with shared
schemas. Vite forwards API requests in development; Express serves the built app.

References: [approved design](../specs/2026-10-06-reading-list-design.md),
[requirements and evidence](../../assessment-checklist.md).

## Constraints

- Node 24.12 or newer; TypeScript 5.8 or newer in the original plan. Verify the
  minimum runtime. The implementation pins TypeScript 6.0.3.
- Suggested 4-6 hours including checks and handoff. Prioritize required flows;
  tests/paging are selected extras, cache/CI depend on remaining time.
- Strict types, NodeNext server resolution, erasable syntax, explicit `.ts`
  imports and `import type`. Static checks run separately from execution.
- Pin dependencies and the lockfile. No application `any`, unchecked JSON casts
  or compiler-error suppression.
- Query: 1-200 trimmed characters, pages 1-1000 (default 1), twelve results per
  page, eight-second fetch timeout.
- Book: `/works/OL<digits>W`, nonblank title up to 300 characters, at most twenty
  nonblank authors of up to 200 characters, year null or integer 0-9999.
- Status: `want_to_read`, `reading`, `finished`. Notes: string up to 2000
  characters. PATCH needs at least one allowed field. New items start with
  `want_to_read` and empty notes.
- JSON limit: 16 KiB. Reject arrays, unknown fields, malformed JSON and invalid
  IDs. Errors use `{error: string}` without internal diagnostic details.
- Prepared SQL, table constraints, WAL/FULL, five-second busy timeout and atomic
  single-statement writes. Keep the same configurable database file after restart.
- One local user. Frontend data requests use `/api`. No auth, Docker, images or
  deployment in the chosen scope.
- Commit actual milestones. Preserve the supplied brief untracked.
- Treat the local TypeScript template as reference. Reuse strict typing, unknown
  JSON checks, native tests and URL encoding. Do not copy its inverted HTTP check,
  automatic retries or bulk-loading code.

## Cases to check

1. A success-shaped HTTP error still fails; a valid 200 succeeds.
2. IDs such as `1x`, `1.5`, zero and unsafe integers cannot select another book.
3. Rejected edits preserve stored values and the browser's draft.
4. Old reads and duplicate clicks cannot erase newer results or completed writes.
5. Missing assets and unknown API routes return errors, not misleading success.

## Task 1: Shared schemas and TypeScript checks

- [x] Create package/config files, `.node-version`, `.env.example`,
      `shared/books.ts` and `shared/books.test.ts`.
- [x] Test valid inputs, exact/over limits, blank values, unknown fields, arrays,
      invalid years/pages and noncanonical/unsafe IDs before implementing schemas.
- [x] Export book/saved/update/search/ID/error schemas, statuses/labels and inferred
      types. Inputs are strict. `SearchResponse` is
      `{results:Book[],page:number,pageSize:12,total:number}`.
- [x] Add test, lint, typecheck, dev, start, build and check scripts. Confirm the
      contract tests fail before implementation and pass afterward. Client build waits
      for its entry point in Task 5.

Checks: `node --test shared/books.test.ts`, server type check and lint.
Milestone: `feat: define validated book contracts and TypeScript checks`.

## Task 2: SQLite storage

- [x] Create `server/books/store.ts` and `store.test.ts`. Expose `createStore`,
      `DuplicateBookError` and `BookStore = ReturnType<typeof createStore>`.
- [x] Provide list/add/update/remove/close. Missing update returns null; remove
      returns a boolean. Validate mapped rows instead of asserting their types.
- [x] Test defaults, duplicates, edits after reopen, missing items, deterministic
      order, literal SQL-looking notes and rejected direct writes. Inspect WAL/FULL.
- [x] Implement prepared SQL and constraints for identity, title, authors JSON,
      year, status and notes, with timestamp defaults. Individual author limits stay
      in the shared validator. Document synchronous storage's local-use ceiling.

Checks: `node --test server/books/store.test.ts` and server type check.
Milestone: `feat: persist reading list with SQLite constraints`.

## Task 3: Open Library search

- [x] Create `server/books/open-library.ts` and its tests. `createBookSearch`
      accepts controlled fetch for tests and returns a search function.
      `UpstreamError` carries 502 or 504.
- [x] Test encoded query/page/limit, fixed origin, identifying header, redirect
      rejection and timeout signal. Cover success, missing metadata, empty results,
      malformed data/JSON, 404/429/500 bodies, network failures and deadlines.
- [x] Read JSON as unknown, validate and normalize it. Use native fetch, the fixed
      search URL, selected metadata fields and an eight-second signal. No automatic
      retries. Cancel non-success response bodies.
- [x] Check request-spacing guidance and run tests/type checks.

Check: `node --test server/books/open-library.test.ts`.
Milestone: `feat: search Open Library with validated responses and timeouts`.

## Task 4: REST API and startup

- [x] Create validation, routes, app, startup and HTTP test modules under `server/`.
      `createApp` accepts store/search and an optional static directory.
- [x] Use a real listener, temporary SQLite file and controlled search to test
      CRUD/status codes, malformed/oversized requests, query arrays, bad/missing IDs,
      upstream failures and safe generic 500 errors. DELETE has an empty body.
- [x] Keep routes thin and centralize errors. Unknown API routes return JSON 404
      before static serving; missing assets return 404.
- [x] Validate `PORT` and `DATABASE_PATH`, create directories, serve `dist`, and
      close the listener/store on SIGINT/SIGTERM. Verify startup configuration and
      one real external search separately from controlled tests.

Checks: `node --test server/books/routes.test.ts`, all tests, lint and type checks.
Milestone: `feat: expose validated reading list REST API`.

## Task 5: React flows

Original files: `client/App.tsx`, `client/SavedBookCard.tsx`, `client/api.ts`,
entry point, CSS, HTML and Vite config. Later names/locations are noted below.

- [x] Record expected browser states before UI implementation: loading, empty,
      errors/retry, pages, save/edit/remove, failed drafts, duplicate clicks, late
      requests, keyboard focus and narrow layouts.
- [x] Add a shared-schema request function and DELETE handling without JSON.
      Keep client requests local and avoid importing server-only modules.
- [x] Keep list/search reads independent; abort/ignore old searches. Wait for
      the initial list before writes, guard duplicate clicks immediately and update
      arrays from their previous state.
- [x] Keep status/notes as local drafts with explicit Save. Preserve failed edits.
      Add labels, focus, live feedback, fallbacks and responsive CSS. Define components
      at module scope without unnecessary memoization.
- [x] Run full checks and browser flows, including delayed requests, induced
      failures and save/edit persistence after restart.

Check: `npm run check` plus the recorded browser table.
Milestone: `feat: add book search and editable reading list interface`.

## Task 6: Extras and handoff

- [x] Add cache tests before the Map cache: hit, exact expiry, separate pages,
      capacity and no cached failures. Inject clock/wait for deterministic tests.
      Use a 60-second TTL and 100 query/page entries with oldest-entry removal.
- [x] Prepare a minimal CI job and verify its commands locally. Publishing an
      active workflow was blocked by credential scope; retain an inactive template.
- [x] Write the README from actual commands and behavior. Include setup, config,
      resets, structure, API/storage choices, limits and actual Codex assistance.
- [x] Prepare a 15-minute demo and Q&A. Personal rehearsal remains pending.
- [x] Reproduce clean setup, verify minimum Node 24.12 and local Node 26, obtain
      one independent review, reproduce/fix its finding and rerun full checks.
- [x] Push real incremental commits. The planned PR handoff was replaced by the
      owner's authorization to merge directly to `main`; no PR or remote CI run is
      claimed. Leave submission timing and email coordination pending.

## Outcome and later changes

Required application tasks and local checks passed. The independent reviewer
found deleted-ID reuse; AUTOINCREMENT and a transactional legacy upgrade fixed
it. See the [review record](../../review.md).

The feature branch was fast-forwarded and pushed to public `main`. The original
App/SavedBookCard/request files moved to `client/books/` as ReadingList,
SavedBookRow and api. BookSearch and SavedBooks were split out later, with saved
filtering/pages and separate views. Prettier joined the check command.
The real invalid upstream-ID case was fixed with two more tests.

The current suite has 33 tests. Historical task names above explain the sequence;
current setup and files are in the README. The checklist records verification,
limits and pending personal review/rehearsal/submission steps.
