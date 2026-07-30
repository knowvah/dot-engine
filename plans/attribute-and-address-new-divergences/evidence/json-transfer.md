<!-- SPDX-License-Identifier: EPL-2.0 -->
# T4 evidence — json-surface transfer of the xdot exonerations

Run 2026-07-30. Satisfies [D3](../decisions.md): an id may only be absorbed by the
json/map A1-drift class once the exoneration is demonstrated **on the surface
where the diverged row actually lives**, not inherited from xdot.

## Result — 6/6 verified

| engine | id | injectedDiffs | kinds | transferVerified |
|---|---|---:|---|---|
| neato | `2621` | 0 | — | yes |
| fdp | `2621` | 0 | — | yes |
| fdp | `tree-graphs-directed-arrows` | 0 | — | yes |
| sfdp | `2621` | 0 | — | yes |
| sfdp | `tree-doc-infosrc-fixed` | 0 | — | yes |
| sfdp | `tree-graphs-directed-arrows` | 0 | — | yes |

`kinds` is empty because there were no diffs left to classify. All six are cleared
for T5; none goes to T6, so T6 is skipped under P4.

## Method

Identical to `attribute-divergence.ts`'s experiment, with the comparator swapped:

1. One oracle invocation per pair: `-K<engine> -Tjson` with `GVTS_POS_DUMP=1`
   (json on stdout, dump on stderr). Validity judged by output completeness, not
   exit code — native `dot` exits nonzero on mere warnings.
2. Dump filtered keeping **all three** prefixes: `GVTS_POS `, `GVTS_BB `,
   `GVTS_CLUST_BB `.
3. Port rendered via `render-one-json.ts <abs> <engine>` with
   `GVTS_POS_INJECT=<dumpfile>`.
4. `compareJson(port, oracle, 0.5)` — the same tolerance `json-walk.ts:318`
   applies to the iterative engines, so a verdict here is directly comparable to
   the track's own verdict.

## AC2 — proof that no dump line was dropped

This is the check that matters most, because a dropped line does not make the
harness fail — it makes it **fabricate** a divergence. Dropping `GVTS_CLUST_BB`
leaves the port recomputing cluster boxes from its own solve, and the resulting
"expected" values are literally the discarded dump lines. That produced 8 false
cluster-polygon findings on 2026-07-29.

Lines kept per pair, and the cluster lines among them:

| dump | lines kept | of which `GVTS_CLUST_BB` |
|---|---:|---:|
| `fdp-2621` | 1419 | 4 |
| `neato-2621` | 1414 | 0 |
| `sfdp-2621` | 1414 | 0 |
| `fdp-tree-graphs-directed-arrows` | 96 | 0 |
| `sfdp-tree-graphs-directed-arrows` | 95 | 0 |
| `sfdp-tree-doc-infosrc-fixed` | 4 | 0 |

Cross-checked against a fresh oracle invocation: `fdp/2621` emits **1419**
`GVTS_*` lines and the harness kept **1419** — nothing dropped. `fdp/2621` is the
meaningful case here since it is the only pair with cluster lines at all (4), and
`fdp` is the engine that emits them.

## Why this check is not redundant with T3

T3 proves the port reproduces the oracle's **xdot** given the oracle's positions.
The json emitter carries fields xdot never compares (`pos`, `bb`, attribute
echoes), so a json-only defect could in principle hide behind an xdot
exoneration. Running the experiment against `compareJson` closes that gap for
these six rather than assuming it away. In PR #37 the same check held for 113/115
ids — but only because it was run, and running it is what exposed the filter bug
above.
