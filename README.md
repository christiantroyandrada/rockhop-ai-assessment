# Reading List

Search Open Library, save books, and keep reading status and notes in a local
SQLite database. Built for the Rockhop assessment with React, TypeScript,
Node.js and Express.

The extras are tests, paged results, saved-book filtering, author/year details
and a small search cache. CI is included as an inactive template.

## Run locally

You need **Node.js 24.12.0 or newer**, npm, and internet access to install
dependencies and search. No API key or database service is needed.

```sh
git clone https://github.com/christiantroyandrada/rockhop-ai-assessment.git
cd rockhop-ai-assessment
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves the React app and API together.
The lockfile pins dependencies; `.node-version` records the minimum runtime.

- **Discover books:** search by title, author or keyword, then select **Save book**.
  Results show twelve books per page. Saved results cannot be added twice.
- **Saved books:** filter your collection by title or author. It shows ten books
  per page and starts at page one when you change the filter.
- Open a saved row to edit status or notes. Select **Save changes**, or **Remove**
  to delete it. Drafts survive collapsing, filtering, page changes and switching
  views. Refreshing the page discards unsaved changes.

Paging controls appear only when needed. Use Left/Right or Home/End on the view
tabs to switch them from the keyboard.

For development, run these in separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Open http://127.0.0.1:5173. Vite forwards `/api` requests to port 3001. If you
change the development backend port, also update `vite.config.ts`.

## Configuration and storage

Configuration is optional: `cp .env.example .env`.

| Variable        | Default                    | Meaning                                                 |
| --------------- | -------------------------- | ------------------------------------------------------- |
| `PORT`          | `3001`                     | Backend port, an integer from 1 to 65535                |
| `DATABASE_PATH` | `data/reading-list.sqlite` | Database file; relative paths start at the project root |

The backend listens on `127.0.0.1` and creates its database directory and table
on first start. There is no seed data or manual migration command. Older
assessment databases are upgraded in a transaction without losing saved books.

Keep the same database path between restarts. To reset the list, stop the backend
and delete the database plus its `-wal` and `-shm` files. This permanently deletes
saved books. Database files and `.env` are excluded from Git.

## Checks

```sh
npm run check
```

Runs Prettier, ESLint, both TypeScript checks, Node tests and a production build.
Individual commands are `npm run format:check`, `npm run lint`,
`npm run typecheck`, `npm test` and `npm run build`.
Use `npm run format` to format source and docs.

The 33 tests use temporary SQLite files, real HTTP listeners and controlled
external responses. They cover CRUD, restart persistence, rejected writes,
stale IDs, input limits, HTTP errors, upstream failures, cache expiry and saved
filtering/page boundaries. One test deliberately logs an internal error while
checking that the browser receives a safe message. Node 24.12 may also print
SQLite's experimental warning.

Manual browser checks cover the React flows, failed-save draft retention,
overlapping requests, keyboard access and mobile/desktop layouts. These are
recorded in the [assessment checklist](docs/assessment-checklist.md). There is
no automated browser suite.

The [CI template](docs/ci-workflow.example.yml) checks Node 24.12 and current
Node 24. The available GitHub credential could not publish an active workflow.
Someone with workflow permission can copy it to `.github/workflows/ci.yml`.
No remote CI run has passed or been claimed.

## Structure and choices

```text
React -> /api REST endpoints -> Open Library search
                            -> SQLite saved_books table
```

| Location                        | Responsibility                                    |
| ------------------------------- | ------------------------------------------------- |
| `client/books/ReadingList.tsx`  | Page layout, saved-list loading and writes        |
| `client/books/BookSearch.tsx`   | Discovery requests, results and pages             |
| `client/books/SavedBooks.tsx`   | Saved filtering and pages                         |
| `client/books/saved-page.ts`    | Matching titles/authors and clamping page numbers |
| `client/books/SavedBookRow.tsx` | Collapsible status/notes editor                   |
| `client/books/api.ts`           | Requests to the backend and response validation   |
| `shared/books.ts`               | Zod schemas and types derived from them           |
| `server/app.ts`                 | Express setup, static files and error handling    |
| `server/books/routes.ts`        | REST endpoints                                    |
| `server/books/validation.ts`    | Request parsing                                   |
| `server/books/open-library.ts`  | External search, timeout and cache                |
| `server/books/store.ts`         | SQLite schema, prepared SQL and row mapping       |
| `server/index.ts`               | Configuration, startup and shutdown               |

Files are grouped around books. This follows the useful part of feature-based
organization without adding formal [FSD](https://feature-sliced.design/docs/get-started/overview)
layers or [DDD](https://learn.microsoft.com/en-us/dotnet/architecture/microservices/microservice-ddd-cqrs-patterns/ddd-oriented-microservice)
abstractions to a small CRUD app. Login would need focused auth modules, book
ownership in the database and tests proving users cannot access each other's data.

**Open Library** provides useful metadata without an API key. Only the backend
calls its [search API](https://openlibrary.org/dev/docs/api/search). It encodes
queries, requests the needed fields, identifies the app, spaces uncached starts
by one second and gives each fetch eight seconds. Missing authors/year have
fallbacks. Successful query/page results are cached for 60 seconds, up to 100
entries; the oldest is removed at capacity. Errors are not cached.

Some upstream `/works/` paths contain edition IDs. Search skips these records
and validates the remaining page. A nonempty page with no valid work IDs still
fails. The total comes from Open Library, so a page may contain fewer than twelve
usable results. Saved-book validation stays strict.

**SQLite** avoids a separate service. Prepared SQL, unique work IDs, non-reused
item IDs and table constraints protect the list. WAL journaling, full synchronous
durability and a five-second busy timeout are enabled. Each write is one atomic
statement; operations with several dependent writes need a transaction. Metadata
is a snapshot taken when the book is saved.

The [native Node driver](https://nodejs.org/api/sqlite.html) avoids an ORM or addon,
but is experimental on Node 24.12. Its synchronous calls can block the event loop.
That tradeoff suits one local user's short operations. SQLite provides the
[transaction guarantees](https://www.sqlite.org/transactional.html).

**TypeScript** is checked in strict mode. Node type stripping and Vite compilation
do not check types. Zod validates incoming JSON at runtime and supplies the
corresponding types. Database constraints protect writes separately.

The UI separates discovery from saved editing. Tabs follow
[WAI keyboard conventions](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/), with
[GOV.UK tabs](https://design-system.service.gov.uk/components/tabs/) and
[pagination guidance](https://design-system.service.gov.uk/components/pagination/)
informing the layout. Page changes focus the section heading. Hidden saved rows
stay mounted to [preserve draft state](https://react.dev/learn/preserving-and-resetting-state).

## API

| Endpoint                       | Success                                | Expected errors                                      |
| ------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| `GET /api/search?q=...&page=1` | 200 `{results,page,pageSize:12,total}` | 400 invalid input, 502 upstream failure, 504 timeout |
| `GET /api/books`               | 200 saved array, newest first          | 500 unexpected error                                 |
| `POST /api/books`              | 201 saved book                         | 400 invalid input, 409 duplicate                     |
| `PATCH /api/books/:id`         | 200 updated book                       | 400 invalid input, 404 missing item                  |
| `DELETE /api/books/:id`        | 204, empty body                        | 400 invalid ID, 404 missing item                     |

POST accepts `{workId,title,authors,firstPublishYear}`. PATCH accepts at least
one of `{status,notes}`. Status is `want_to_read`, `reading` or `finished`;
notes can be empty and are limited to 2000 characters. Unknown fields are rejected.
JSON bodies are limited to 16 KiB, with 413 for larger requests. Search accepts
a trimmed query of 1-200 characters and pages 1-1000.
Errors return `{error: "Readable message"}`. Unknown API routes return JSON 404.

## Limits and next steps

- One user and one local process, without authentication. Data belongs to the
  backend database, not a browser account. Hosting needs persistent storage and
  deliberate access/listening configuration. Docker, images and deployment are deferred.
- The cache is local to the process and does not combine identical requests in
  progress. Queued work is unbounded and continues when the browser aborts.
  The eight-second fetch timeout excludes queue wait. Production would need a
  bounded, cancellable queue.
- A failed discovery page clears results. Resubmit **Search** to restart at page one.
- Saved filtering/paging loads the whole collection and keeps rows mounted for
  drafts. For thousands of books, move paging/filtering into SQLite and keep
  drafts in keyed state while rendering only the current page.
- Failed saves retain drafts; refresh or navigation discards them. There is no
  cross-tab sync, conflict resolution or backup system.

Personal code review and rehearsal remain pending. The [demo notes](docs/demo.md)
cover the 15-minute presentation and Q&A. The brief requires the repository at
least 24 hours before the scheduled presentation.

## AI assistance disclosure

OpenAI Codex helped with requirements, stack choices, the design and plan, code,
tests, debugging, browser checks and documentation. It also used the supplied
Node/TypeScript/React guidance and local API template. Superpowers guided the
workflow; Ponytail helped keep scope small. Impeccable guided the library-style
UI, and adversarial-development guided the assessment checks. Humanize helped
edit the documentation.

The code was checked with the commands and browser flows above. A separate AI
reviewer found a stale-ID bug; tests reproduced it and verified the fix. The
[review record](docs/review.md) covers that finding and the simplicity review.
These checks do not replace my responsibility to understand and defend the code.
My personal walkthrough and timed rehearsal are not claimed as completed.

Further records: [design](docs/superpowers/specs/2026-10-06-reading-list-design.md),
[implementation plan](docs/superpowers/plans/2026-10-06-reading-list.md),
[requirements and evidence](docs/assessment-checklist.md).
