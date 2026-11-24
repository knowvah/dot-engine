# T3 — set the 7 new 16.1.2 inputs aside (part of the T2 commit, typescript-pro)

## Context
After T2 the corpus root is `~/git/graphviz-16.1.2/tests`, which adds `2745.dot`, `2760.dot`, `2762.dot`,
`2762_1.dot`, `2764.dot`, `2764_1.dot`, `2870_3.dot` over 16.1.1 and changes no other input. AD-1: they enter
the manifest quarantined until #298 admits them. `enumerate.ts:193` has `MANUAL_QUARANTINE` keyed by relative
path; `QuarantineReason` is the type `dashboard.ts:60` reads.

## Task (tests first)
1. `corpus-manifest.test.ts`: a case asserting each of the 7 ids is `{ status: 'quarantined', reason:
   'pending-input' }`; keep the existing 16.1.1-additions and SIGSEGV cases (those inputs are still in 16.1.2).
   Run it red.
2. `enumerate.ts`: add `'pending-input'` to `QuarantineReason` with a doc comment ("an input upstream added in a
   newer oracle, waiting for its port issue: 16.1.2's seven are #298"); add the 7 paths to `MANUAL_QUARANTINE`
   with a comment naming #298.
3. Regenerate `corpus-manifest.json` with the enumerator's own write path (read `enumerate.ts`'s CLI; it scans
   `ORACLE_CORPUS_ROOT`). Diff: exactly 7 added entries, nothing else.

## Write-set
`test/corpus/enumerate.ts`, `test/corpus/corpus-manifest.json`, `test/corpus/corpus-manifest.test.ts`.

## Acceptance criteria
- Given a fresh enumeration of 16.1.2's `tests/`, then it equals the committed manifest (existing test).
- Given the manifest diff, then it adds exactly the 7 ids, each quarantined `pending-input`, and changes no
  other entry.
- Given any walker's id selection (`status === 'applicable'`), then none of the 7 is selected.

## Observability / rollback
N/A. Reversible; #298 removes the 7 `MANUAL_QUARANTINE` lines.
