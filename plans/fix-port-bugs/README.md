<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: fix-port-bugs

## Objective

Fix the four real port bugs discovered (and `.todo`-skipped as ready-made red
tests) during the coverage-90 mission. Each fix converts its `it.todo` into a
real red test, then changes `src/` to match the canonical C behavior, TDD
red→green. All four are independent; one parallel batch.

## Branch

- Work branch: `fix/port-bugs`
- **Base: `test/coverage-90`** (NOT main — the `it.todo` tests and the
  baseline repair commit `0baa426` exist only there; main is 29 commits behind).
- Merge strategy: merge commit (mission-brief branch — never squash).

## Batches

| Batch | Description | Status |
|-------|-------------|--------|
| [batch-1](./batch-1/overview.md) | 4 parallel independent bug fixes | [x] |

- [x] T1 — xdot parseString rejects truncated input ([spec](./batch-1/T1-xdot-parsestring.md))
- [x] T2 — record attrBool delegates to mapbool ([spec](./batch-1/T2-record-attrbool.md))
- [x] T3 — HTML `<TH>` is a row synonym, not a TD alias ([spec](./batch-1/T3-html-th-row.md))
- [x] T4 — DtBag.delete finds non-root duplicates ([spec](./batch-1/T4-cdt-bag-delete.md))

## Quality Gates

Per task commit:

```
- command: npm run typecheck
  pass: exit 0
  on_fail: fix_and_rerun
- command: npm test
  pass: exit 0
  on_fail: fix_and_rerun
- command: git diff --name-only HEAD~1
  pass: output within the task's declared write-set only
  on_fail: stop
```

End of mission (after all 4 tasks, before merge):

```
- command: npm run coverage
  pass: exit 0 (thresholds 90/90/90/90 already enforced by vitest config)
  on_fail: fix_and_rerun
- command: rm -f parity-rules.json && npm run survey && npm run survey:gate
  pass: 0 regressions (fresh sweep — never resume-style; see CLAUDE.md)
  on_fail: stop
```

Never edit `src/` while the sweep runs.

## Constraints

### Stop conditions

1. Any file outside a task's declared write-set needs changes (and is in no
   other task's write-set).
2. Two consecutive gate failures on the same check, or the same location
   changed 3× without resolving the same failing check.
3. The red test reveals the journaled mechanism is wrong — the fix that makes
   it green is not the documented C divergence. The bug analyses in the task
   specs are locked; do not improvise a different fix.
4. Implementation contradicts a decision in [decisions.md](./decisions.md).
5. The end-of-mission fresh corpus sweep shows ANY regression.
6. A previously-passing test fails for any reason other than the intentional
   inversion at `src/cdt/bag.branch.test.ts:131` (T4).

### Push-forward conditions

- Wording/placement of new tests, comment phrasing, small pure helpers inside
  the write-set.
- Extra assertions beyond the minimum acceptance criteria (log it).
- Targeted coverage tests within the task's own write-set if a src edit nudges
  a branch percentage (log it).
- 1–3-line pre-existing violations in files already being edited
  (per pr-workflow.md).

## Index

- [decisions.md](./decisions.md) — locked architecture decisions D1–D3
- [batch-1/overview.md](./batch-1/overview.md) — task table + write-sets
- [diagrams/component-map.md](./diagrams/component-map.md)
- [diagrams/data-flow.md](./diagrams/data-flow.md) — TH hang mechanism
- [decision-journal.md](./decision-journal.md) — appended during execution;
  the orchestrator (not task agents) writes all journal entries post-batch
- Prior record: `plans/coverage-90/decision-journal.md` (gate-by-gate discovery
  record for all four bugs)

## Mission summary (2026-07-29)

- **Tasks: 4/4 complete** — one commit each: T1 `b52df39`, T2 `faea147`,
  T3 `c1a3db3`, T4 `970d644` on `fix/port-bugs`.
- **Decisions:** 12 journal entries; one human escalation (stop conditions
  1+6): T1 unmasked malformed byte-count fixtures in three xdot test files
  outside all write-sets; approved amendment folded the corrections into the
  T1 commit. One flagged scope bound for review: C's dtsearch OBAG
  group-normalization back-walk (dttree.c:167-181) not ported in T4 — safe
  while DtBag.delete has no production caller.
- **Quality gates:** typecheck clean; full suite 6021/6021; coverage
  95.55/90.64/97.36/96.88 (≥90 floor); fresh corpus sweep GATE PASS —
  0 regressions (908 conformant, pre-existing set unchanged).
- **Known issues / follow-ups:** `tsx` is not a devDependency — npm survey
  scripts assume a global; sweep was run via `npx -y tsx` (candidate cleanup:
  add tsx to devDependencies). Merge to base via merge commit (never squash)
  left to the user.
