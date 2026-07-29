<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: dot-engine-scrub

## Objective

Scrub the legacy name `graphviz-ts` → `dot-engine` across all repo text:
docs, CLAUDE.md, src/test comments and describe-strings, golden-ref SVG
banner lines, and historical `plans/` prose (user explicitly approved the
archaeology override). The npm package, exports map, runtime SVG banner, and
the plantuml-ts consumer ALREADY use `@knowvah/dot-engine` — this is a text
scrub with zero behavior change. Load-bearing filesystem paths are protected
(see decisions D2/D7).

## Branch

- Work branch: `chore/dot-engine-scrub` (base: `origin/main`, brief committed
  on this branch).
- Repo is **squash-merge-only**: one PR at mission end, PR title MUST be
  conventional-commit typed (`docs: scrub graphviz-ts branding to dot-engine`)
  — an untyped title makes semantic-release no-op silently (that's fine here:
  no release wanted) but keep the type for hygiene.

## Batches

| Batch | Description | Status |
|-------|-------------|--------|
| [batch-1](./batch-1/overview.md) | scrub script + dry-run report | [x] |
| [batch-2](./batch-2/overview.md) | apply: docs/plans (T2) ∥ src/test/golden (T3) | [x] |
| [batch-3](./batch-3/overview.md) | gates, sweep, closeout | [x] |

- [x] T1 — author scrub.mjs + dry-run ([spec](./batch-1/T1-scrub-script.md))
- [x] T2 — apply to plans/ + docs/ + CLAUDE.md ([spec](./batch-2/T2-docs-plans-sweep.md))
- [x] T3 — apply to src/ + test/ + golden banners ([spec](./batch-2/T3-src-test-golden-sweep.md))
- [x] T4 — gates + fresh sweep + closeout ([spec](./batch-3/T4-gates-closeout.md))

## Quality Gates

Per task commit:

```
- command: npm run typecheck
  pass: exit 0
  on_fail: fix_and_rerun
- command: npm test
  pass: exit 0 (6021 tests; any failure after a comment-only edit means the
        script hit code — see stop conditions)
  on_fail: stop
- command: git diff --name-only HEAD~1
  pass: within the task's declared write-set only
  on_fail: stop
```

End of mission (T4):

```
- command: count-identity check (see T4 spec — exact remaining-occurrence
  numbers pinned by T1's dry-run report)
  pass: counts match T1's pinned numbers exactly
  on_fail: stop
- command: npm run coverage
  pass: exit 0
  on_fail: fix_and_rerun
- command: rm -f parity-rules.json && npm run survey && npm run survey:gate
  pass: 0 regressions (fresh sweep; tsx is a devDependency since aa3304d)
  on_fail: stop
```

Never edit `src/` while the sweep runs. Known sweep quirk: id 1652 may flip
conformant↔timeout under load — budget-marginal perf class, NOT a regression
(see plans/fix-port-bugs/decision-journal.md).

## Constraints

### Stop conditions

1. Any file outside a task's declared write-set needs changes.
2. Two consecutive gate failures on the same check.
3. Implementation contradicts a decision in [decisions.md](./decisions.md).
4. Post-scrub count identity fails — ANY deviation from T1's pinned numbers
   (over- or under-scrub).
5. Any typecheck/test failure after T3 (comment edits cannot legitimately
   fail tests; a failure means the script modified code).
6. The end-of-mission fresh sweep shows any regression (1652 timeout-flip
   excepted per the note above — verify per-id before invoking the exception).

### Push-forward conditions

- Newly discovered case/spelling variants of the name: add a rule, log it.
- Awkward prose after mechanical replacement: ≤1-line rewording, log it.
- Comparison-page HTML entity/encoding rule tweaks, log it.

## Index

- [decisions.md](./decisions.md) — D1–D7 (locked)
- [batch-1/overview.md](./batch-1/overview.md) · [batch-2/overview.md](./batch-2/overview.md) · [batch-3/overview.md](./batch-3/overview.md)
- [diagrams/component-map.md](./diagrams/component-map.md) — scrub vs protect trees
- [diagrams/data-flow.md](./diagrams/data-flow.md) — sentinel pipeline
- [decision-journal.md](./decision-journal.md) — appended during execution
  (orchestrator only; task agents return journal text in their reports)

## Mission summary (2026-07-29, closeout)

- **Tasks:** 4/4 complete (T1 scrub tool ff0732f, T2 plans/docs/CLAUDE.md
  f40832a, T3 src/test/golden dcb5f090 + banner-alignment fix 5ad1ecc4,
  T4 gates/closeout). One fix commit beyond plan (T3 banner form).
- **Replacements:** 407 total (rule-b specifier 47, rule-c 358+2), matching
  T1's pinned dry-run numbers exactly in every tree.
- **Count identity:** EXACT — 16 remaining occurrences in the pinned
  universe (plans docs CLAUDE.md src test, excl. this brief), all protected:
  9 `git/graphviz-ts`, 4 `plans/graphviz-ts-port`, 3 `git-graphviz-ts`
  (dash-form — T1-discovered third protected pattern, ratified as a D2
  addendum in the decision journal). 0 `graphviz-TS` variants remain.
- **Out-of-scope residue (documented, intentional):** PUBLISHING.md
  (3 occurrences — legacy npm package references incl. the literal
  `npm deprecate graphviz-ts` command, which must keep the old name) and
  comparisons/a2-font-metrics (3 occurrences on 2 lines — stale artifacts of
  a closed mission). Neither tree is in the objective's enumerated scope or
  any task's write-set; T4's identity grep was scoped to T1's pinned
  universe accordingly (journal 11:00 entry).
- **Gates:** typecheck clean; 6021/6021 tests green (T3 and again after the
  banner fix); coverage 95.55/90.64/97.36/96.88 (floor 90); fresh 939-input
  corpus sweep GATE PASS with 0 regressions (pre-existing diverged set
  1367/1581/1652/2621 unchanged; parity-rules.json regenerated
  byte-identical except timestamp, restored).
- **Decisions flagged for review:** none blocking; see decision-journal.md
  (9 entries).
- **Follow-ups:** optional later cleanup of the comparisons/a2-font-metrics
  stale banner/label outside this mission's scope.
