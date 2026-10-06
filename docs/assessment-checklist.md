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

| Work | Time |
|---|---|
| Design, repository setup, and API contract | 30 minutes |
| Backend integration, persistence, and focused tests | 90 minutes |
| React search and saved-list flows | 90 minutes |
| End-to-end checks, failure cases, and fixes | 45 minutes |
| README, code explanation, and demo rehearsal | 45 minutes |
| Contingency, only if needed | Up to 60 minutes |

## Requirements and evidence

All implementation locations below are proposed responsibilities, not existing
files. Every row is unverified until there is actual implementation and evidence.

| ID | Mandatory requirement | Proposed location | Observable verification | Status |
|---|---|---|---|---|
| F1 | Search or browse external data and display meaningful results | Backend external API adapter; React search view | Real API smoke check and browser demo with title/details | Not implemented |
| F2 | Add an external result to the saved list | Backend create endpoint; React save action | Integration test and browser add flow | Not implemented |
| F3 | View saved items | Backend list endpoint; React saved-list view | Integration test and browser list flow | Not implemented |
| F4 | Update at least one user-editable field | Backend update endpoint; React edit control | Valid update test and visible persisted change | Not implemented |
| F5 | Remove a saved item | Backend delete endpoint; React remove action | Delete test and browser remove flow | Not implemented |
| D1 | Saved data persists across application restarts | Backend data store | Save/edit, stop backend, restart with same store, read again | Not implemented |
| T1 | Frontend uses JavaScript or TypeScript with React | Frontend package and components | Inspect dependencies/source; production build | Not implemented |
| T2 | Backend uses Node.js or .NET | Backend package and entry point | Inspect dependencies/source; run from documented commands | Not implemented |
| T3 | Backend calls the external API; frontend does not call it directly | Backend adapter; frontend API client | Inspect fetch destinations and browser network traffic | Not implemented |
| T4 | React consumes the application's own REST or GraphQL endpoints | Backend routes; frontend API client | Inspect contract and exercise all five flows | Not implemented |
| E1 | Validate incoming requests | Backend request validation | Missing/invalid fields and invalid editable values return client errors | Not implemented |
| E2 | Handle external API timeouts and non-success responses | Backend adapter; React error state | Deterministic failure tests and visible retryable UI error | Not implemented |
| E3 | Handle empty external API results | Backend adapter; React empty state | Empty response test and visible no-results message | Not implemented |
| E4 | Return appropriate HTTP status codes | Backend endpoints | Contract tests for success, invalid input, missing item, and upstream failure | Not implemented |
| H1 | Share an accessible Git repository with incremental commits | Git history and remote repository | Inspect actual commit history and reviewer access | Not implemented |
| H2 | README explains prerequisites, installation, configuration, and run commands | README.md | Reproduce setup from a clean checkout/data store | Not implemented |
| H3 | README explains architecture, structure, API choice, and data-store choice | README.md | Compare explanation against actual code | Not implemented |
| H4 | README records assumptions, limitations, and future improvements | README.md | Check claims against final behavior and disclosed gaps | Not implemented |
| H5 | README discloses AI tools and how they were used | README.md | Accurate disclosure; candidate can explain submitted code | Not implemented |
| H6 | Application works locally from README or at a live URL | Entire application | Complete search/save/view/update/remove demo | Not implemented |
| H7 | Send repository at least 24 hours before presentation | Submission coordination | Check submission timestamp against scheduled presentation | Pending schedule |
| P1 | Prepare a 15-minute presentation and 15-minute Q&A | Demo and walkthrough notes | Timed rehearsal and explanation of technical decisions | Not prepared |

Tests are optional in the brief, but a small set of integration tests is planned
to provide repeatable evidence for persistence, validation, and upstream failures.
The manual demo verifies the actual React interaction with the backend.

## Scope control

Optional enhancements may strengthen the submission's evidence, but the brief
does not promise bonus points or assign weights. A complete, explainable solution
takes priority over the number of features.

The selected topic is the recommended reading-list application. The proposed
written design is awaiting review before implementation.

| Enhancement | Proposed scope | Evidence | Priority/status |
|---|---|---|---|
| Automated integration tests | CRUD, persistence after reopening the store, invalid input, duplicate saves, and upstream failures; inject the external fetch function so tests do not depend on live Open Library | Repeatable test command with actual results | Include; not implemented |
| Pagination | Explicit search submit; bounded page size; Previous/Next controls; reset page when query changes | Backend page validation and browser checks for first, last, and empty pages | Include; not implemented |
| Cache external search results | Small bounded in-memory cache with a short TTL; key by query and page; cache only successful results; do not cache errors or saved-list writes | Deterministic hit, expiry, capacity, and failure tests | Include if verification time remains; not implemented |
| GitHub Actions CI | One job installing from the lockfile and running tests, type checks where applicable, and the production build | Actual passing run on the submitted commit | Include if verification time remains; not implemented |
| Images or richer details | Display author and publication year from search data; cover images only if served through the backend and time remains | Missing-metadata fallback and browser check; no direct frontend calls to the external API | Metadata planned; images deferred |
| Docker or docker-compose | Add only if needed for reviewer setup; a local SQLite file does not need a database service | Clean container setup following README | Deferred |
| Authentication or multi-user support | Adds identity, authorization, and per-user ownership beyond the required single-user saved list | Isolation and authorization tests would be necessary | Deferred |
| Cloud deployment with live URL | Add only after local setup is reproducible and the host provides persistent database storage | Live CRUD flow and data retained across backend restart/redeploy | Deferred |

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

| ID | Additional quality requirement | Verification | Status |
|---|---|---|---|
| Q1 | SQLite data integrity and transactional persistence | Constraint, rollback, and restart-persistence tests; inspect SQL and durability configuration | Not implemented |
| Q2 | Maintainable boundaries and understandable code | Trace search and CRUD end to end; candidate explains module responsibilities and tradeoffs | Not implemented |
| Q3 | Practical DRY and SOLID without speculative abstractions | Inspect repeated logic, dependencies, and test seams | Not implemented |
| Q4 | Usable loading, empty, error, and keyboard-accessible UI states | Browser checks of search, saved-list mutations, labels, focus, and retries | Not implemented |

Do not fabricate a retrospective commit history. Commit actual development
milestones as they are completed.

## Submission scorecard

| Criterion | Evidence required | Current status |
|---|---|---|
| Completeness | Every mandatory row has implementation and verification evidence | Unverified |
| Quality | Relevant checks and failure tests pass; decisions and limitations are honest | Unverified |
| Collaboration | Setup is reproducible; README, repository access, and history are coherent | Unverified |

Preparation does not establish that the application is complete or ready to send.
