# Final review record

One independent AI reviewer (GPT-6 Astra) inspected the implementation, tests,
CI, design/plan, README/checklist, and demo notes. It independently ran27 tests,
lint, and both type checks on Node26.7. Its verdict was “With fixes.”

The Important finding: SQLite reused a deleted primary key, allowing a stale
tab to change or remove a replacement book. Two regression tests reproduced
fresh-file ID reuse and the legacy-file case. The fix uses AUTOINCREMENT and a
transactional one-time legacy upgrade that preserves existing items and starts
new IDs above a timestamp floor. Both tests passed; the full29-test check also
passed on26.7 and24.12. No second reviewer pass was performed; the fix was
verified through the reproduced regression and full checks.

No Critical findings or separately deferred Minor findings were reported.
The review is AI-assisted evidence, not a candidate's completed personal review.

## Rulings made during execution

| Decision | Reason | Cost if wrong |
|---|---|---|
| Maintain execution scratch/ledger manually | lean-ctx blocks the skill workspace script; tool security was preserved | Manual bookkeeping could miss an entry |
| Pin TypeScript6.0.3 instead of7.0.2 | Current typescript-eslint supports TypeScript below6.1 | Newer compiler improvements deferred |
| Inject wait alongside fetch/clock | Deterministic upstream request-spacing tests | Test scheduler differs from wall-clock operation |
| Add native client request tests | Offline browser error needed actionable retry guidance; pin204 handling | Small extra test-maintenance cost |
| Upgrade old database files transactionally; reserve timestamp ID floor | Deleted legacy IDs had no recorded history; fresh and existing files must avoid wrong-book writes | Inconsistent externally edited files may fail upgrade; rollback retains original data |
| Keep auth,multi-user,hosting,images,large-scale storage deferred | Approved local assessment scope | Public/shared deployment needs further work |
| Leave same-book cross-tab conflicts and navigation draft loss disclosed | Local last-write behavior accepted; wrong-book reuse was fixed | Drafts may be overwritten or discarded |
| Defer in-flight deduplication/queued request cancellation | Efficiency work beyond current local scope | Rapid bursts wait and may waste upstream work |
| Reject undocumented nullable upstream fields | No observed/documented supported shape required them | Unexpected nullable data returns502 |
| Exclude direct external DB tampering from supported writes | App validates input and database enforces its stated constraints | Corrupted external metadata may fail reads |
| Verify handoff separately from implementation | Setup,remote CI,rehearsal and submission are distinct evidence | Premature submission may miss required preparation |
| Publish CI as a template rather than an active workflow | GitHub OAuth lacks workflow scope and existing SSH authentication failed | CI does not run remotely until a user enables the workflow |

The reviewer explicitly set aside the six scope/evidence categories above. The executor
considered each and kept the approved scope/limitations. Final source and CI
evidence is in [the checklist](assessment-checklist.md).
