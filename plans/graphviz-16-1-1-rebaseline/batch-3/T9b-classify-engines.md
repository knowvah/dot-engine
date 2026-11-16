# T9b — classify engine changes (debugger, opus; read-only)

## Context
Batches 2a/2b regenerated the 7 non-dot engines' walks (svg parity, json, map, plain), attribution and
oracle-error registries against 16.1.1. `src/` is unchanged, so every changed verdict comes from native. Tie each
to its 16.1.1 cause. Read [agent-common.md](../agent-common.md) and the method in [overview.md](overview.md).

## Inputs
- `$BASE/diff/{parity,json-parity,map-parity,plain-parity}-<engine>.tsv`, `$BASE/diff/attribution-<engine>.tsv`,
  `$BASE/diff/oracle-errors-<engine>.tsv` (path of `$BASE` in your prompt).
- 16.1.0 oracle with `$BASE/ghl16-all`; 16.1.1 with `/tmp/ghl1611-all`.
- Nondeterminism: fdp, sfdp, neato and twopi vary run to run on some ids. Compare against ≥8 native runs of each
  version before calling a change; an id whose 16.1.0 and 16.1.1 run sets overlap is "native variance", not a change.
- Issue triage: #156 (neato double-precision Laplacian/CG), #157 (fdp ctr `-0.0`), #164 (ortho libc `rand()`),
  #152/#154/#165 (shared routing), plus the shared-geometry issues listed in T9a.
- C history: `git -C ~/git/graphviz log -p 16.1.0..16.1.1 -- lib/{neatogen,fdpgen,sfdpgen,circogen,twopigen,osage,patchwork,ortho,pathplan,common}` (read-only).

## Write-set
`plans/graphviz-16-1-1-rebaseline/classification/engines.md` only.

## Acceptance criteria
- Given every row of the engine diff tables, then it appears in exactly one group (including a "native variance"
  group with its run evidence).
- Given each group, then it names an issue or `NEW:`, the C commit and `file:function`, a one-sentence mechanism
  and an example hunk.
- Given attribution class changes, then each is explained by its group (e.g. #156 moves neato drift).
- Return only the group table and the counts per issue — no preamble, no trailing summary.

## Observability / rollback
N/A — read-only. Reversible.
