# T12b — classify engine changes (debugger, opus; read-only)

## Context
Batches 2a and 2b regenerated the 7 engine walks, their json/map/plain walks, attribution (fdp, neato, sfdp,
twopi) and the oracle-error registries against the 16.1.2 carried oracle. `src/` is unchanged. Tie every changed
result to its cause. Read [agent-common.md](../agent-common.md) and the method in [overview.md](overview.md).
There is no fresh 16.1.1 engine baseline at main's port (AD-4): expect "port commit on main" groups, as #147's
T9b found (`2be35fce` moved 73 neato json/map rows).

## Inputs
- `$BASE/diff/parity-<engine>.tsv`, `{json,map,plain}-parity-<engine>.tsv`, `attribution-<engine>.tsv`,
  `oracle-errors-<engine>.tsv`.
- 16.1.1 carried with `GVBINDIR=/tmp/ghl1611-carried-all`; 16.1.2 carried with `/tmp/ghl1612-carried-all`.
- Issue triage: #295, #299, #301 (`conc_slope`), #302 (`reallyroutespline`), #303 (fdp `mapc`,
  `is_a_cluster`; check against #224), neatogen `s1` (`6217ad7ba`, `f3c6d7641`: no change expected).
- Native nondeterminism: fdp, sfdp, neato, twopi need ≥8 native runs per side before a difference is real; one
  `2784` render at a time (up to 67 GB).
- C history: `git -C ~/git/graphviz log -p -w 16.1.1..16.1.2 -- lib/{neatogen,fdpgen,sfdpgen,circogen,twopigen,osage,patchwork,common,pathplan}/` (read-only).

## Write-set
`plans/graphviz-16-1-2-rebaseline/classification/engines.md` only.

## Acceptance criteria
- Given every row of the engine diff tables, then it appears in exactly one group in `engines.md`.
- Given each group, then it names an issue, `#299`, `port commit on main <sha>`, `native variance` (with the run
  counts) or `NEW:`, plus the C commit and `file:function` where native changed, a one-sentence mechanism and an
  example hunk.
- Given attribution class changes, then each is explained by a group (T13 acts on them).
- Return only the group table and the counts per issue — no preamble, no trailing summary.

## Observability / rollback
N/A — read-only. Reversible.
