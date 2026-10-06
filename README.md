# Reading List

Discover books through Open Library, save a personal reading list, and track
reading status and notes. Saved items persist in a local SQLite database.

Built for the Rockhop assessment with React, TypeScript, Node.js, Express, and
SQLite. Selected enhancements: automated tests, search pagination, author/year
details, and a bounded search cache. A GitHub Actions workflow template is included
but is not active because the available GitHub credential lacks workflow permission.

## Run locally

Prerequisites: **Node.js 24.12.0 or newer**, npm, and internet access for installation
and search. No API key or separate database service is needed. `.node-version`
records the minimum version; the lockfile pins dependency versions.

```sh
git clone https://github.com/christiantroyandrada/rockhop-ai-assessment.git
cd rockhop-ai-assessment
# Until the assessment PR is merged:
git switch feat/reading-list
npm ci
npm run build
npm start
```

Open **http://127.0.0.1:3001**. Express serves the built React application and API
from one origin. Search by title, author, or keyword, then use **Save book**.
Change reading status/notes and select **Save changes**. **Remove** deletes the
saved item. Already-saved results cannot be saved twice.

For development, run these in separate terminals:

```sh
npm run dev:server
```

```sh
npm run dev:client
```

Open http://127.0.0.1:5173. Vite proxies `/api` to backend port 3001; changing the
development backend port also requires updating `vite.config.ts`.

Optional configuration: `cp .env.example .env`.

| Variable        | Default                    | Meaning                                                     |
| --------------- | -------------------------- | ----------------------------------------------------------- |
| `PORT`          | `3001`                     | Backend port, positive integer ≤65535                       |
| `DATABASE_PATH` | `data/reading-list.sqlite` | Database file; relative paths resolve from the project root |

The backend binds to `127.0.0.1` and creates the directory/table on first start.
There is no seed data or manual migration command. Earlier assessment database
files are upgraded transactionally to non-reused IDs while retaining saved data.
Keep the same database path between
restarts. To reset your list, stop the backend and delete the database and its
`-wal`/`-shm` files; this permanently discards saved items. Database files and
`.env` are ignored by Git.

## Checks

```sh
npm run check
```

This runs ESLint, separate frontend/backend TypeScript checks, native Node tests,
and a Vite production build. Individual commands: `npm run lint`,
`npm run typecheck`, `npm test`, and `npm run build`.

Tests use temporary real SQLite files and real HTTP listeners, with controlled
upstream responses and cache clocks. They cover CRUD, duplicates, failed writes,
reopening persistence, exact input bounds, malformed/oversized requests, upstream
errors/timeouts, pagination parameters, cache expiry/capacity, and client response
handling. One expected internal-error test logs a backend diagnostic while
verifying a generic client error. Native SQLite may emit an experimental warning
on Node 24.12; that warning does not mean the tests failed.

Browser checks cover real search, edits/removal, pagination, empty results,
restart persistence, failed-save draft retention, list retry, overlapping
searches, duplicate clicks, keyboard access, and mobile/desktop layouts. See
[verification evidence](docs/assessment-checklist.md). The template at
`docs/ci-workflow.example.yml` runs these checks on minimum Node 24.12 and current
Node 24. To activate it, a user with workflow permission can copy it to
`.github/workflows/ci.yml`. No remote CI run is claimed; all checks above ran locally.

## Architecture and choices

```text
React → /api REST endpoints → Open Library search
                           → local SQLite saved_books table
```

| Location                       | Responsibility                                        |
| ------------------------------ | ----------------------------------------------------- |
| `client/App.tsx`               | Search, pagination, saved-list ownership, mutations   |
| `client/SavedBookCard.tsx`     | Status/notes drafts                                   |
| `client/api.ts`                | Same-origin requests and validated responses          |
| `shared/books.ts`              | Zod schemas and inferred transport types              |
| `server/app.ts`                | Express composition, static files, centralized errors |
| `server/books/routes.ts`       | Thin REST handlers                                    |
| `server/books/validation.ts`   | Typed request parsing                                 |
| `server/books/open-library.ts` | External requests, normalization, timeout/cache       |
| `server/books/store.ts`        | SQLite schema, prepared CRUD, row mapping             |
| `server/index.ts`              | Configuration, startup, graceful shutdown             |

**Open Library** has useful public book metadata without an API key. The backend
uses its [search API](https://openlibrary.org/dev/docs/api/search), requests needed
fields, encodes queries, identifies the application, spaces uncached request
starts by one second, and uses an eight-second upstream timeout. Missing
author/year metadata has explicit fallbacks. Failed/malformed responses fail
visibly. Successful searches are cached for 60 seconds, up to 100 query/page
entries with oldest-entry eviction. Errors are never cached. The cache disappears
on restart and is separate from persistent saved data.

**SQLite** keeps setup simple with transactional persistence. Prepared statements,
a unique work ID, non-reused item IDs, constraints, WAL, full synchronous durability, and a five-second
busy timeout protect the saved list. Each mutation is one atomic statement;
multi-write operations would need an explicit transaction. Metadata is a snapshot
at save time. The native Node driver avoids an ORM/addon dependency, but its API
is experimental on minimum Node 24.12. Synchronous calls can block the event loop;
this is an accepted ceiling for one local user's short operations. See
[Node SQLite](https://nodejs.org/api/sqlite.html) and
[SQLite transactions](https://www.sqlite.org/transactional.html).

**TypeScript** is checked in strict mode; native type stripping and Vite
transpilation do not type-check. Zod validates unknown data at runtime and
supplies inferred types; database constraints provide another integrity boundary.
Functions and explicit dependencies keep this small application understandable
without a generic repository/service hierarchy or dependency-injection framework.

## API

| Endpoint                       | Success                                | Expected errors                    |
| ------------------------------ | -------------------------------------- | ---------------------------------- |
| `GET /api/search?q=...&page=1` | 200 `{results,page,pageSize:12,total}` | 400 input;502 upstream;504 timeout |
| `GET /api/books`               | 200 saved array, newest first          | 500 unexpected error               |
| `POST /api/books`              | 201 saved book                         | 400 invalid;409 duplicate          |
| `PATCH /api/books/:id`         | 200 updated book                       | 400 invalid;404 missing            |
| `DELETE /api/books/:id`        | 204 empty response                     | 400 invalid;404 missing            |

POST accepts `{workId,title,authors,firstPublishYear}`. PATCH accepts at least one
of `{status,notes}`; status is `want_to_read`, `reading`, or `finished`.
Notes are limited to 2000 characters. Unknown fields are rejected. JSON bodies
are limited to 16 KiB (413 on overflow). Search accepts a trimmed 1–200 character
query and pages 1–1000. Errors return `{error: "Readable message"}`.
Unknown API routes return JSON 404 instead of application HTML.

## Assumptions, limitations, and next steps

- One user, one local process, no authentication. Saved data belongs to the local
  backend database, not a browser account. Multi-user ownership requires
  authentication, authorization, and isolation tests.
- No images, Docker, or deployment. Cover images should be proxied through the
  backend; deployment needs persistent storage and an intentional listening/auth
  configuration.
- Cache is instance-local, without in-flight request deduplication. Request
  spacing limits bursts. Saved lists are small/unpaginated; add pagination or
  async storage when real size/concurrency warrants it.
- Failed saves retain component drafts. Refreshing/navigating discards unsaved
  drafts. There is no cross-tab sync or edit-conflict resolution.
- Automated checks exercise schema/store/HTTP/adapter/client request boundaries.
  UI checks were manual; no committed browser automation suite.
- Candidate walkthrough and timed rehearsal remain preparation tasks; see
  [demo/Q&A notes](docs/demo.md). Send the repository at least 24 hours before
  the scheduled presentation.

## AI assistance disclosure

**OpenAI Codex** assisted with requirements, stack choices, referenced
Node/TypeScript/React guidance and a local template, design/plan, implementation,
test creation, debugging, browser checks, and documentation. Superpowers guided
the workflow; Ponytail guided scope/simplicity; impeccable guided the chosen
quiet-library interface; adversarial-development guided assessment evidence.

AI-generated code/tests were checked with the commands and browser flows above.
A separate AI reviewer is part of final review; findings and actual verification
status are recorded in the checklist. This does not claim that AI output is
inherently correct or that the candidate has already personally rehearsed or
reviewed every line. The candidate remains responsible for understanding,
explaining, and defending the submitted code.

Records: [design](docs/superpowers/specs/2026-10-06-reading-list-design.md),
[implementation plan](docs/superpowers/plans/2026-10-06-reading-list.md),
[requirements/evidence](docs/assessment-checklist.md).
