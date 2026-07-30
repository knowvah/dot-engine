<!-- SPDX-License-Identifier: EPL-2.0 -->
# T3 — attribute the newly diverged ids

**Agent:** executor · **Depends on:** T2 · **Commit:** one

## Context

The injection-attribution harness separates "the port's routing/emission is
wrong" from "the two iterative solvers converged to different but internally
consistent layouts". It injects the oracle's own pre-routing node positions into
the port (`GVTS_POS_DUMP` on the oracle → `GVTS_POS_INJECT` on the port) and
re-compares. `injectedDiffs === 0` ⇒ `drift-exonerated`: everything downstream of
the solver is faithful and the residual is the solver's fp-chaotic positions
alone. That verdict is what the computed A1-drift class consumes
(`test/corpus/accepted-class.ts`).

## Task

For each iterative engine, run attribution over the ids T2 newly marked
`diverged`:

```
ATTR_ORACLE_TIMEOUT_MS=<generous> npx tsx test/corpus/attribute-divergence.ts <engine>
```

It resumes from `attribution-<engine>.jsonl` (skip-set by id) and guards on the
oracle's sha1, so previously-attributed ids are not re-run. Engines
**sequentially**.

`2621`'s oracle needs ~256s on its own; the harness default cap is 300_000 ms and
will be too tight under any load. Raise it (P2).

## Two traps that have already caused false findings here

1. **`injectedDiffs: 0` is also the field's initializer.** For a `harness-error`
   row no comparison ever ran, so a 0 there is a default, not a measurement.
   Never infer a verdict from the number — check the verdict field and confirm the
   computing path ran (`attribute-divergence.ts:538-539`).
2. **The dump has THREE prefixes:** `GVTS_POS`, `GVTS_BB`, and
   **`GVTS_CLUST_BB`** (fdp emits one per cluster). The committed harness filters
   all three (line ~337). A filter that drops the cluster lines makes the port
   recompute cluster boxes and **fabricates** `cluster:*/_draw_` divergences whose
   "expected" values are literally the dropped dump lines. This cost 8 false
   findings on 2026-07-29. If you touch the filter, don't.

## Write-set

- `test/corpus/attribution-neato.json` + `.jsonl`
- `test/corpus/attribution-fdp.json` + `.jsonl`
- `test/corpus/attribution-sfdp.json` + `.jsonl`
- `plans/attribute-and-address-new-divergences/decision-journal.md`

## Read-set

- `test/corpus/attribute-divergence.ts:1-30` (purpose + D1/D4/D5 notes),
  `:296-345` (`runOracleWithDump`, the dump filter), `:499-560` (the per-id loop
  and verdict computation)
- T2's journal table — the work list
- [constraints.md](../constraints.md) — S5, S6, S7, S12 all live here
- `plans/decision-journal.md`, the 2026-07-28 row "The 5 attribution
  harness-error rows CLOSED" — where trap 1 was diagnosed

## Interface contract (consumed by T4, T5, T6)

Journal a table:

```
| engine | id | verdict | injectedDiffs | bucket.shape |
```
`verdict ∈ {drift-exonerated, not-cleared}`. T4 verifies the exonerated set;
T6 takes the `not-cleared` set.

## Acceptance criteria

1. **Given** the oracle still carries the `GVTS_POS_DUMP` patch, **when**
   attribution runs, **then** every id from T2's diverged list receives a verdict.
   If the patch is gone, that is **S5: stop** — do not substitute hand acceptance.
2. **Given** a row reads `drift-exonerated`, **when** inspected, **then**
   `injectedDiffs` is a *computed* 0 (the comparison path ran), not the
   initializer.
3. **Given** the run completes, **when** all three files are tallied, **then**
   **0 `harness-error` rows** remain. Any remaining is **S12: stop**.
4. **Given** `2621`'s oracle needs ~256s, **when** attribution runs, **then** it
   is not cut off by the oracle cap.

## Observability requirements

N/A — no new observable operations. The verdict tally per engine is the signal;
record it in the journal.

## Rollback

**Reversible** — regenerated artifacts. Caution: the `.jsonl` is append-only and
its oracle-sha1 metadata line gates resume, so prefer `git checkout` of the pair
over hand-editing rows.

## Commit

`test(corpus): attribute the newly diverged iterative ids`
Body: the verdict table and the resolved/unresolved split.
