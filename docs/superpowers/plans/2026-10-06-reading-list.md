# Reading List Tracker Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deliver a locally runnable book search and persistent reading list with meaningful tests, pagination, and an accurate AI disclosure.

**Architecture:** React calls one Express API. Book-domain modules own validated inputs, Open Library search, and SQLite persistence; shared Zod schemas define transport types. Vite proxies the API in development; Express serves the built client in production.

**Tech Stack:** React, TypeScript, Vite, Express, Zod, native Node SQLite/test runner, ESLint.

**Spec:** [Approved design](../specs/2026-10-06-reading-list-design.md); [acceptance checklist](../../assessment-checklist.md).

## Global Constraints

- Target Node.js 24.12 or newer and TypeScript 5.8 or newer; verify the documented minimum runtime during implementation.
- Budget: 4–6 hours including verification and handoff. Record effort honestly; prioritize mandatory flows, tests, and pagination. Cache/CI only within the remaining budget.
- `strict: true`, NodeNext server resolution, erasable syntax, explicit `.ts` imports, type-only imports; static checking is separate from execution.
- Pin dependency versions and commit the lockfile. No application `any`, unchecked transport casts, or compiler-error suppression.
- Search query 1–200 trimmed characters, page 1–1000 default 1, page size 12; timeout eight seconds.
- Book work ID `/works/OL<digits>W`; title nonblank ≤300; authors ≤20 nonblank strings ≤200; year null or integer 0–9999.
- Status `want_to_read`, `reading`, or `finished`; notes string ≤2000; PATCH at least one allowed field. New books default to `want_to_read` and empty notes.
- JSON body limit 16 KiB. Reject arrays, unknown fields, malformed JSON, invalid IDs. Errors `{error: string}`; never expose internal diagnostics.
- SQLite prepared statements, constraints, WAL, `synchronous=FULL`, bounded busy timeout, atomic single-statement mutations. Same configurable database file survives restart.
- Frontend requests only `/api`; no external images. Single local user; no authentication, Docker, or deployment in this scope.
- Atomic, relevant commits at actual milestones; never fabricate history. Preserve the untracked source assessment document without publishing it.
- The local template is reference material. Adopt strict typing/unknown JSON/native tests/URL encoding; do not copy its inverted HTTP check or automatic retry/bulk-loading machinery.

## Review Focus

1. A valid-looking upstream error body must still fail with 502; a 200 body must succeed (Task 3).
2. Noncanonical IDs and numeric query syntax (`1x`, `1.5`, zero, unsafe integers) must not select or mutate a different book (Tasks 1/4).
3. A rejected edit must preserve both persisted values and the user's unsaved note draft (Tasks 2/5).
4. Late search/list responses and double clicks must not erase a newer result or a completed mutation (Task 5).
5. A missing production asset or unknown `/api` route must not receive misleading successful HTML/JSON (Tasks 4/5).

---

### Task 1: Shared validated contracts and executable TypeScript checks

**Files:** Create `package.json`, `package-lock.json`, `tsconfig.server.json`, `tsconfig.client.json`, `eslint.config.js`, `.node-version`, `.env.example`, `shared/books.ts`, `shared/books.test.ts`.

**Interfaces:** Produce `bookSchema`, `savedBookSchema`, `savedBooksSchema`, `updateBookSchema`, `searchQuerySchema`, `searchResponseSchema`, `bookIdSchema`, `errorSchema`, `readingStatuses`, `statusLabels`; inferred `Book`, `SavedBook`, `UpdateBook`, `SearchQuery`, `SearchResponse`. `SearchQuery` is `{q:string,page:number}`; `SearchResponse` is `{results:Book[],page:number,pageSize:12,total:number}`. ID parsing accepts only positive safe-integer decimal strings without leading zeros. Use `.strict()` for input objects.

- [ ] Write contract tests with `node:test` and `node:assert/strict`, including these assertions (valid `book` uses `/works/OL1W`, `A`, `[]`, `null`):
  ```ts
  assert.equal(bookSchema.safeParse(book).success, true);
  assert.equal(
    bookSchema.safeParse({ ...book, title: ' '.repeat(3) }).success,
    false,
  );
  assert.equal(
    bookSchema.safeParse({ ...book, title: 'a'.repeat(301) }).success,
    false,
  );
  assert.equal(
    bookSchema.safeParse({ ...book, authors: Array(21).fill('A') }).success,
    false,
  );
  assert.equal(updateBookSchema.safeParse({ notes: '' }).success, true);
  assert.equal(updateBookSchema.safeParse({}).success, false);
  assert.equal(
    updateBookSchema.safeParse({ notes: 'a'.repeat(2001) }).success,
    false,
  );
  assert.equal(updateBookSchema.safeParse({ status: 'other' }).success, false);
  assert.equal(bookIdSchema.safeParse('1x').success, false);
  assert.deepEqual(searchQuerySchema.parse({ q: ' book ' }), {
    q: 'book',
    page: 1,
  });
  ```
  Add exact-limit successes and above-limit failures for every pinned bound; arrays/unknown fields, negative/fractional years, page `0`, `1001`, `1.5`, repeated query arrays, and unsafe IDs must fail.
- [ ] Install the pinned toolchain/dependencies; define `test` as `node --test shared/*.test.ts server/books/*.test.ts`, with explicit file commands until those files exist; `typecheck`, `lint`, `build`, `dev:server`, `dev:client`, `start`, `check` scripts. Run `node --test shared/books.test.ts`; confirm missing contract exports fail before implementation.
- [ ] Implement schemas and inferred types in `shared/books.ts`. Two configs include shared code; server includes tests. ESLint covers TS/TSX with React hooks and disallows explicit `any`.
- [ ] Run contract tests, server type check, lint on existing files; confirm passes. Defer client build until Task 5 provides its entry point.
- [ ] Commit only these files: `feat: define validated book contracts and TypeScript checks`.

### Task 2: SQLite persistence with enforced integrity

**Files:** Create `server/books/store.ts`, `server/books/store.test.ts`.

**Interfaces:** Consume `Book`, `SavedBook`, `UpdateBook`, schemas from Task 1. Produce `createStore(path:string)` with inferred object return type, `type BookStore = ReturnType<typeof createStore>`, and `DuplicateBookError`. Store exposes `list():SavedBook[]`, `add(book:Book):SavedBook`, `update(id:number,patch:UpdateBook):SavedBook|null`, `remove(id:number):boolean`, `close():void`. Keep the factory return inferred so the alias does not form a circular return annotation.

- [ ] Write temporary-file tests (`mkdtemp`, cleanup in test teardown) asserting:
  ```ts
  const created = store.add(book);
  assert.equal(created.status, 'want_to_read');
  assert.equal(created.notes, '');
  assert.throws(() => store.add(book), DuplicateBookError);
  assert.equal(store.list().length, 1);
  assert.equal(store.update(created.id, { notes: 'saved' })?.notes, 'saved');
  store.close();
  const reopened = createStore(path);
  assert.equal(reopened.list()[0]?.notes, 'saved');
  assert.equal(reopened.remove(created.id), true);
  assert.equal(reopened.remove(created.id), false);
  ```
  Add tests for missing update, deterministic order, quotes/SQL-looking notes retained literally, and direct invalid SQL updates rejected while the previous status/notes remain unchanged. Open a second native database connection for direct constraint verification; do not weaken durability in tests.
- [ ] Run `node --test server/books/store.test.ts`; confirm failure for the missing store.
- [ ] Implement schema, prepared `RETURNING` mutations, and row mapping in `store.ts`; validate row objects instead of asserting types. Set WAL/FULL/busy timeout 5000 ms. Table constraints protect work ID, title, authors JSON/array type/count, year, status, notes, and timestamps; individual author string limits remain in shared boundary validation. Each mutation is one statement; no unnecessary transaction wrapper. Translate only duplicate-work uniqueness errors to `DuplicateBookError`.
- [ ] Run store tests and server type check; inspect PRAGMA values and reopen result. Mark the synchronous local-scale ceiling with a `ponytail:` comment.
- [ ] Commit `feat: persist reading list with SQLite constraints`.

### Task 3: Validated, bounded Open Library search

**Files:** Create `server/books/open-library.ts`, `server/books/open-library.test.ts`.

**Interfaces:** Consume `SearchQuery`, `SearchResponse`, `bookSchema`. Produce `createBookSearch(options?:{fetch?:typeof fetch}):(query:SearchQuery)=>Promise<SearchResponse>` and `UpstreamError` with `status:502|504`. Default fetch is native fetch; fixed origin `https://openlibrary.org/search.json`, fields `key,title,author_name,first_publish_year`, limit 12, eight-second abort signal, identifying User-Agent. No automatic retries.

- [ ] Write controlled-fetch tests capturing URL/options and returning `Response` objects:
  ```ts
  assert.equal(result.pageSize, 12);
  assert.equal(result.results[0]?.workId, '/works/OL1W');
  assert.equal(capturedUrl.searchParams.get('q'), 'a & b');
  assert.equal(capturedUrl.searchParams.get('page'), '2');
  assert.equal(capturedUrl.searchParams.get('limit'), '12');
  assert.equal(capturedOptions.redirect, 'error');
  ```
  Test 200 success, both work-key formats, missing authors/year, empty results, malformed JSON/payload/metadata, HTTP 404/429/500 even with a success-shaped body, network rejection, and `DOMException('timeout','TimeoutError')` mapping to 504. Expect 502 for other upstream failures; assert encoded query cannot alter the origin. Verify the timeout signal is passed and non-success bodies are canceled.
- [ ] Run `node --test server/books/open-library.test.ts`; confirm missing adapter failure.
- [ ] Implement request, schema validation, normalization, and error mapping in `open-library.ts`. Read JSON as `unknown`. Preserve legitimate null/missing fallbacks; reject malformed responses, rather than silently claiming an empty result.
- [ ] Run adapter tests and server type check. Check rate-limit guidance with the actual identification header; avoid automatic retries.
- [ ] Commit `feat: search Open Library with validated responses and timeouts`.

### Task 4: REST routes, error handling, and backend startup

**Files:** Create `server/books/validation.ts`, `server/books/routes.ts`, `server/app.ts`, `server/index.ts`, `server/books/routes.test.ts`. Update `.env.example`.

**Interfaces:** Consume Task 2 store and Task 3 search. Produce `parseInput<T>(schema:z.ZodType<T>,input:unknown):T`, `InputError`; `createBookRouter(store:BookStore,search:(query:SearchQuery)=>Promise<SearchResponse>):Router`; `createApp({store,search,staticDir?}):Express`. Bootstrap validates `PORT` default 3001 and `DATABASE_PATH` default `data/reading-list.sqlite`, creates directories, serves `dist`, listens, and closes listener/store on SIGINT/SIGTERM.

- [ ] Write real HTTP tests with an ephemeral listener, temporary SQLite store, injected search, and cleanup; assert:
  ```ts
  assert.equal((await post(book)).status, 201);
  assert.equal((await post(book)).status, 409);
  assert.equal(
    (await patch(id, { status: 'finished', notes: 'done' })).status,
    200,
  );
  assert.equal((await patch(id, { status: 'bad', notes: 'lost' })).status, 400);
  assert.equal((await list()).body[0].notes, 'done');
  assert.equal((await remove(id)).status, 204);
  assert.equal((await remove(id)).status, 404);
  ```
  The helpers send native fetch requests and parse JSON as unknown with schemas. Cover every HTTP contract, malformed JSON, arrays, unknown fields, 16 KiB overflow →413, query arrays, invalid/noncanonical/unsafe IDs →400, missing updates →404, upstream 502/504, unknown `/api` routes →JSON 404 even with static serving, generic 500 without a local path/stack. Assert DELETE has an empty response body.
- [ ] Run `node --test server/books/routes.test.ts`; confirm missing app failure.
- [ ] Implement parsing/error helpers, thin routes, and app composition in their files. Map duplicate to409, invalid input/JSON to400, oversized body to413, upstream error to its code, unknown error to500 with structured diagnostic logging. Mount API fallback before static/HTML fallback; missing assets return404, not HTML. Add bootstrap config and graceful shutdown; malformed startup config exits with an actionable diagnostic.
- [ ] Run all tests, lint, server type check; launch and stop the server with a temporary DB, then reopen it. Verify default and explicit configuration; obtain one live Open Library search through `/api/search` and record its actual result separately from deterministic tests.
- [ ] Commit `feat: expose validated reading list REST API`.

### Task 5: Accessible React search and saved-list flows

**Files:** Create `index.html`, `vite.config.ts`, `client/main.tsx`, `client/api.ts`, `client/App.tsx`, `client/SavedBookCard.tsx`, `client/styles.css`; modify `package.json`/lockfile only if needed for agreed client tooling.

**Interfaces:** Consume shared schemas/types and Task 4 endpoints. Produce `request<T>(path:string,schema:z.ZodType<T>,options?:RequestInit):Promise<T>`, `removeBook(id:number):Promise<void>`, module-scope `App`, and `SavedBookCard({book,onUpdate,onRemove})` with mutation callbacks returning `Promise<void>`. Use `/api` paths only. Request helper parses success/error boundaries and handles DELETE without JSON parsing.

- [ ] Prepare a repeatable browser verification table before UI implementation: initial loading/empty/list failure, search success/empty/failure, page reset/first/last, duplicate save, status/notes save, remove, failed-note retention, double click, stale response, keyboard/focus, narrow viewport. Record expected visible states in `docs/assessment-checklist.md`; browser failures before implementation are the initial check.
- [ ] Implement request helper and Vite `/api` proxy to localhost:3001. Use direct imports; share runtime schemas without pulling server-only modules into client.
- [ ] Implement `App` with independent list/search loading/errors, explicit search/page actions, aborted or ignored stale reads, functional immutable updates, and derived saved-ID `Set`. Prevent late initial-list reads from overwriting completed mutations by ignoring obsolete snapshots or finishing list initialization before mutations become available. Cancel a previous search as soon as a new one starts. Disable conflicting mutation actions synchronously with a per-item pending guard.
- [ ] Implement `SavedBookCard` with local status/notes drafts, explicit save, and draft retention on failure. Add semantic labels, visible focus, live status/error messages, responsive layout, title/author/year fallbacks, readable text rendering, and explicit empty states. Counts render with explicit conditions. No cheap memoization or nested component definitions.
- [ ] Run `npm run check`; expect lint, both type checks, all tests, and production build to pass. Start production server and perform the full browser table, including throttled stale requests and induced HTTP failures. Verify only the application's origin appears for data requests and missing assets return404. Repeat a save/edit after backend restart. Fix failures and rerun affected checks.
- [ ] Commit `feat: add book search and editable reading list interface`.

### Task 6: Optional cache and CI, then verified handoff

**Files:** Optional modify `server/books/open-library.ts`/tests and create `.github/workflows/ci.yml`; modify `README.md`, `docs/assessment-checklist.md`; create `docs/demo.md`.

**Interfaces:** If cache fits remaining time, extend Task 3 options with `now?:()=>number`; preserve its search signature and HTTP behavior. TTL60 seconds, capacity100, key normalized query+page, successful results only. FIFO eviction is sufficient; no class/framework. CI uses Node24 and `npm ci` then `npm run check`.

- [ ] Check remaining assessment effort before optional work. If insufficient, document cache/CI omitted and proceed directly to handoff.
- [ ] For cache, write failing tests asserting a second same-query/page request makes one fetch, different pages make distinct fetches, age `60_000` triggers refetch, failed searches are fetched again, and 101 unique keys evict the oldest. Run adapter tests red; implement Map-based cache with injected clock; rerun green and commit `feat: cache successful book searches within bounded limits`.
- [ ] For CI, create one lockfile-install/check workflow with minimal permissions; run its exact commands locally. Commit `ci: check types tests lint and build`. A configured job is not a verified remote run.
- [ ] Write README from actual commands: prerequisites and minimum Node verification, `npm ci`, dev servers, build/start, environment/default DB path, reset instructions, architecture/file map, endpoints, API/SQLite rationale/stability and synchronous scale ceiling, assumptions/limits/future, tests, selected enhancements. Accurately disclose Codex's actual design/code/test/debug/review assistance; leave candidate walkthrough/rehearsal claims pending until done.
- [ ] Create `docs/demo.md` with a 15-minute sequence (problem2, architecture3, live CRUD/restart6, validation/tests2, tradeoffs/AI2) and Q&A prompts on ACID, validation versus types, timeout/cache, test seams, deployment persistence, and JS/TS stack choice. Candidate rehearsal remains explicitly pending until performed.
- [ ] Reproduce README using a clean copy/checkout, `npm ci`, fresh DB, check/build/start; verify minimum Node24.12 runtime separately from the locally installed Node26. Use final adversarial-development Assessment review and one fresh independent code reviewer under the selected execution skill. Fix evidence-backed findings; rerun only affected checks, then one final full check. Record actual commands/results and any unresolved gaps in checklist/README.
- [ ] Commit `docs: document setup assessment evidence and AI assistance`. Configure the supplied empty GitHub repository, push real incremental commits to a feature branch and create a reviewable PR with concise validation notes; attach the PR with `attach_artifact`. Inspect actual CI status if configured; do not merge without authorization. Record reviewer access, repository link, and remaining submission timing/rehearsal tasks. No email is sent.

## Plan self-review

Coverage: Tasks1/4 cover contracts/validation; Tasks2/4 CRUD and persistence; Task3 upstream/timeout/empty; Task5 all React flows/pagination/accessibility; Task6 reproducibility, disclosure, actual Git history, optional features, and presentation support. Review Focus cases are pinned to owning checks. Input/output types and signatures match across tasks. Native execution in the existing dedicated checkout is recommended for this small, sequential application; one final independent review supplies fresh scrutiny. Candidate presentation rehearsal and email submission remain human coordination steps, not fabricated completed evidence.
