<!-- SPDX-License-Identifier: EPL-2.0 -->
# T4 — verify the exoneration transfers to the json surface

**Agent:** executor · **Depends on:** T3 · **Commit:** one

## Context

Attribution proves exoneration on the **xdot** surface (`compareXdot`). The json
and map acceptance classes *inherit* that verdict. The inference is sound only if
the divergence is confined to the same drift surface — the json emitter carries
fields xdot never compares (`pos`, `bb`, attribute echoes), so a json-only defect
could hide behind an xdot exoneration.

In PR #37 that inheritance held for 113/115 ids — but only because it was
checked, and the check is what exposed a dump-filter bug that had fabricated 8
false "cluster polygon defects". D3 makes the check mandatory rather than
optional.

## Task

For each id T3 marked `drift-exonerated`, re-run the *same* injection but compare
with `compareJson`:

1. Oracle, one invocation per (engine, id): `-K<engine> -Tjson` with
   `GVTS_POS_DUMP=1`. json on stdout, dump on stderr.
2. Filter the dump keeping **`GVTS_POS `, `GVTS_BB `, and `GVTS_CLUST_BB `** —
   all three. Dropping the cluster lines fabricates cluster-polygon diffs.
3. Render the port with `GVTS_POS_INJECT=<dumpfile>` via
   `test/corpus/render-one-json.ts <abs> <engine>`.
4. Compare with `compareJson(port, oracle, tol)` where `tol = 0.5` for
   neato/fdp/sfdp — the same tolerance `json-walk.ts:318` uses, so the verdict is
   directly comparable to the track's own.
5. Judge the oracle by output completeness, not exit code (native `dot` exits
   nonzero on mere warnings while emitting complete output).

Record `injectedDiffs` per (engine, id). This is a throwaway verification
harness: keep it in the scratchpad, commit only the evidence file.

## Write-set

- `plans/attribute-and-address-new-divergences/evidence/json-transfer.md`
- `plans/attribute-and-address-new-divergences/decision-journal.md`

No harness or artifact changes.

## Read-set

- [decisions.md#d3](../decisions.md) — locked decision and its rationale
- `test/golden/compare-json.ts:86-110` — `JSON_TOLERANCE`, `JsonDiff`,
  `JsonDiffKind` (`structural | numeric | value | parse`)
- `test/corpus/json-walk.ts:315-322` — the per-engine tolerance the track uses
- `test/corpus/attribute-divergence.ts:296-345` — the oracle+dump recipe to mirror
- `plans/decision-journal.md`, the 2026-07-29 row "json-surface injection
  attribution: 113/115 EARNED" — the prior run of this exact check, including both
  traps

## Interface contract (consumed by T5, T6)

`evidence/json-transfer.md` must contain:

```
| engine | id | injectedDiffs | kinds | transferVerified |
```
`transferVerified = (injectedDiffs === 0)`. T5 absorbs only verified ids; T6 takes
the rest.

## Acceptance criteria

1. **Given** an id exonerated on xdot, **when** the injection is compared with
   `compareJson` at ±0.5, **then** `injectedDiffs === 0` and it is marked
   verified.
2. **Given** the dump is captured, **when** it is filtered, **then**
   `GVTS_CLUST_BB` lines are retained — assert the dump line count matches the
   oracle's emitted `GVTS_*` line count.
3. **Given** an id does not verify, **when** recorded, **then** it is marked
   `transferVerified: false`, excluded from T5, and handed to T6. That is
   **S13** — surface it rather than absorbing it.
4. **Given** a verdict differs between two runs of the same id, **then** treat it
   as **S11** (ULP-nondeterminism), record both runs, and do not "fix" the port.

## Observability requirements

N/A. The evidence file *is* the observable artifact and is the reason this task
exists — an unverified acceptance is indistinguishable from a vacuous one.

## Rollback

**Reversible** — documentation only; nothing generated or consumed by tooling.

## Commit

`docs(corpus): record json-surface transfer evidence for exonerated ids`
Body: the verified/unverified split and any id handed to T6.
