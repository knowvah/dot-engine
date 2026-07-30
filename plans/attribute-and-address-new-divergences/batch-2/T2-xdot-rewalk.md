<!-- SPDX-License-Identifier: EPL-2.0 -->
# T2 — resume-walk the xdot tracks for neato, fdp, sfdp

**Agent:** executor (no specialist needed) · **Depends on:** T1 · **Commit:** one

## Context

Every walker derives its universe from `test/corpus/parity.json` rows with
`verdict === 'conformant'` — currently **910**. The three iterative xdot tracks
hold only **905** rows, missing exactly:

`2621`, `tree-doc-dotguide-curve`, `tree-doc-dotguide-icurve`,
`tree-doc-infosrc-fixed`, `tree-graphs-directed-arrows`

Three of those are this mission's target ids. Until they exist on the xdot track
with a `diverged` status, `attribute-divergence.ts` cannot see them at all
(it filters `status === 'diverged'` from `parity-<engine>.json`).

## Task

Resume-walk the xdot track for each iterative engine so all three reach 910 rows:

```
GVBINDIR=/tmp/ghl npx tsx test/corpus/engine-walk.ts <engine>
```

Set T1's env overrides if the defaults leave any target id short of its measured
cost. Run the **three engines sequentially** — not in parallel — and keep
per-walk concurrency <= 4 if the walker exposes it.

**Why sequential matters:** concurrent sweeps of heavy graphs were measured to
inflate wall time 3.8-5.7x and flipped four heavy ids to false `timeout` in a
single run (PR #37). `2621` is the heaviest graph in the corpus after `1652`
(20.6 min for the dot engine); do not let two heavy renders share the machine.

Warm the oracle cache before starting if it is cold — a cold cache makes native
renders compete with port renders, which is the exact mistake that invalidated a
survey run in PR #37.

## Write-set

- `test/corpus/parity-neato.json` + `.jsonl`
- `test/corpus/parity-fdp.json` + `.jsonl`
- `test/corpus/parity-sfdp.json` + `.jsonl`
- `plans/attribute-and-address-new-divergences/decision-journal.md`

Do **not** touch `src/`, any acceptance registry, or any other track's artifacts.

## Read-set

- [decisions.md#d2](../decisions.md) — resume, not fresh, and why
- [constraints.md](../constraints.md) — S8, S9, S11 apply directly here
- `test/corpus/engine-walk.ts` — the resume model (`doneIds` from the JSONL;
  only ids absent from it are rendered)
- T1's commit body — the env-var names it defined

## Interface contract (consumed by T3)

Record in the journal, as a table:

```
| engine | id | status | note |
```
covering (a) all 5 newly-entered ids per engine, and (b) every pre-existing id
whose status changed. T3's work list is the subset with `status === 'diverged'`.

## Acceptance criteria

1. **Given** each xdot track had 905 rows, **when** the walk completes, **then**
   each has exactly 910 and all 5 previously-missing ids are present.
2. **Given** `2621` would have hit the old 90s cap, **when** the walk completes,
   **then** it carries a real verdict (`pass` or `diverged`) on all three tracks
   — **not** `timeout`. If it is still `timeout`, that is **S9: stop**.
3. **Given** T1 raised the budget, **when** the walk completes, **then** every
   pre-existing status change is enumerated in the journal. The expected set is
   `2108` (x3) and `1652`@fdp leaving `timeout`; anything beyond that must be
   explained, and >15 new `diverged` pairs is **S8: stop**.
4. **Given** no `src/` file was touched, **when** the walk completes, **then** no
   id flips between `pass` and `diverged`. Such a flip means something other than
   this mission changed behaviour — investigate before proceeding.

## Observability requirements

N/A — no new observable operations. The deliverable's observable surface is the
journal table above plus the three regenerated `parity-<engine>.json` count
blocks; do not regenerate `PARITY*.md` here (T7 owns those files).

## Rollback

**Reversible** — regenerated artifacts only; `git checkout` the six files. Note
the JSONL files are git-tracked, so a checkout is a valid restore point *only
while no sweep is running*.

## Commit

`test(corpus): bring iterative xdot tracks to the 910-id universe`
Body: the status table, and the pre-existing flips with their cause (T1's budget).
