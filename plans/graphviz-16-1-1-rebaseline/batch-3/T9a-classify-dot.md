# T9a — classify dot changes (debugger, opus; read-only)

## Context
Batch 2a regenerated the dot survey (`parity.json`) and the dot format walks (agwrite `-Tdot`, xdot, json, map,
plain) against 16.1.1. `src/` is unchanged (T2 proved the bundle identical), so every changed verdict comes from
native. Your job: tie each to the 16.1.1 change that caused it. Read [agent-common.md](../agent-common.md) and
the method in [overview.md](overview.md).

## Inputs
- `$BASE/diff/{parity,dot-parity-dot,xdot-parity,json-parity,map-parity,plain-parity-dot}.tsv` and
  `$BASE/diff/T3-gate.txt` (path of `$BASE` in your prompt).
- 16.1.0 oracle: `~/git/graphviz/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl`. 16.1.1: `~/git/graphviz-16.1.1/build/cmd/dot/dot`, `/tmp/ghl1611`.
- Inputs: `test/corpus/corpus-manifest.json` paths under `~/git/graphviz/tests` (AD-1).
- Issue triage: `gh issue view N` for #149–#165 (likely dot ones: #149 write order, #150 update_bb_bz, #151
  checkpath, #152 tree_adjust, #153 compass angles, #154 non-finite guards, #155 HTML IMG, #158 flat_reorder,
  #159 flat_edges, #160 empty ranks, #161 make_regular_edge, #162 aux edge too long, #163 compact, #165
  splineintersectsline).
- C history: `git -C ~/git/graphviz log -p 16.1.0..16.1.1 -- lib/<dir>/<file>.c` (read-only).

## Write-set
`plans/graphviz-16-1-1-rebaseline/classification/dot.md` only (the orchestrator creates the directory).

## Acceptance criteria
- Given every row of the dot diff tables, then it appears in exactly one group in `dot.md`.
- Given each group, then it names an issue or `NEW:`, the C commit and `file:function`, a one-sentence mechanism
  and an example hunk from the native 16.1.0 vs 16.1.1 diff.
- Given `oracle-error` transitions, then each is confirmed by a native exit-status change (crash → success).
- Return only the group table and the counts per issue — no preamble, no trailing summary.

## Observability / rollback
N/A — read-only. Reversible.
