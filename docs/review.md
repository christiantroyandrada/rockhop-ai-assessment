# Review record

An independent AI reviewer (GPT-6 Astra) inspected the source, tests, planned CI,
design, README and demo notes. It ran 27 tests, lint and both TypeScript checks
on Node 26.7. Verdict: **With fixes**.

## Deleted-ID bug

SQLite reused a deleted primary key. A stale browser tab could then edit or
remove a replacement book. Two tests reproduced this in fresh and older files.

The fix uses AUTOINCREMENT and a one-time transaction to upgrade older databases.
Saved data is retained. New IDs start above a timestamp floor because deleted
legacy IDs have no recorded history. Both tests and the full 29-test check passed
on Node 26.7 and 24.12.

No second independent review was run. The failing tests and full checks verified
the fix. No Critical or separately deferred Minor findings were reported.
This AI review does not replace the candidate's personal code review.

## Decisions and limits

- **TypeScript 6.0.3:** selected to fit typescript-eslint's support below 6.1.
  Newer compiler features were deferred.
- **Injected fetch, clock and wait:** keep external-request tests deterministic.
  These tests check scheduling logic, not real wall-clock load.
- **Native client tests:** cover useful offline guidance and empty DELETE bodies.
- **Legacy upgrade:** invalid externally edited files may fail to upgrade.
  Rollback keeps the original table/data.
- **Local scope:** auth, multiple users, hosting, images and large-scale storage
  are deferred. Public hosting needs further work.
- **Drafts/conflicts:** same-book cross-tab edits use last-write behavior;
  navigation can discard drafts. Wrong-book ID reuse was fixed.
- **Search queue:** identical requests are not combined, and queued work is not
  cancelled. Bursts can wait and waste upstream calls.
- **Upstream shape:** undocumented nullable metadata is rejected with 502.
  Invalid work identities are now skipped when the rest of the page is usable.
- **External database edits:** unsupported metadata corruption may prevent reads.
  Normal writes pass through validation and database constraints.
- **CI:** GitHub rejected the workflow push because the OAuth credential lacked
  workflow permission. SSH authentication also failed. An inactive template is
  provided; no remote run is claimed.
- **Handoff:** setup and repository access were checked separately from code.
  Personal review, rehearsal and submission timing remain pending.
- **Tool limits:** a blocked workspace script was not bypassed; execution notes
  were maintained manually, with a risk of missed bookkeeping.

Current checks and delivery status are in the
[assessment checklist](assessment-checklist.md).

## Simplicity review

The repository was checked for duplicate work, unused types and unnecessary
abstractions. Three changes removed ten formatted source lines without adding
runtime dependencies:

- Removed duplicate whole-book parsing in the
  [search adapter](../server/books/open-library.ts). The response schema already
  validates each book. The later work-ID check serves a different purpose: it
  filters invalid identities before that final validation.
- Removed an unused ReadingStatus type alias from
  [shared schemas](../shared/books.ts). Types are derived where needed.
- Removed a [CSS](../client/styles.css) reduced-motion rule that restated default
  scrolling. The interface has no animation.

Brief comments explain timing guards and draft retention. Prettier was added
for consistent formatting. The store/app/search functions support real tests or
resource cleanup; the legacy upgrade protects existing data, rather than adding
a general migration framework.

The scope stays small: tests, paging and a Map cache. Authentication, Docker,
images and deployment remain deferred. This review did not measure whether the
candidate's actual effort stayed within the suggested 4-6 hours.
