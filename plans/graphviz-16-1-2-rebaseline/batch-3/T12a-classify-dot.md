# T12a — classify dot changes (debugger, opus; read-only)

## Context
Batch 2a regenerated the dot survey (`parity.json`) and the dot format walks (agwrite `-Tdot`, xdot, json, map,
plain) against the 16.1.2 carried oracle. `src/` is unchanged (T5 proved the bundle identical), so every changed
result comes from native, from #299's render skip, or from registry staleness. Tie each to its cause. Read
[agent-common.md](../agent-common.md) and the method in [overview.md](overview.md).

## Inputs
- `$BASE/diff/{parity,dot-parity-dot,xdot-parity,json-parity,map-parity,plain-parity-dot}.tsv`,
  `$BASE/diff/T7-gate.txt` (vs the fresh 16.1.1 survey `9007464d`) and `T7-gate-committed.txt` (path of `$BASE`
  in your prompt). The survey table is built against `parity-9007464d.json`, so survey staleness is already out.
- 16.1.1 carried `~/git/sseely/graphviz-carried/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl1611-carried`. 16.1.2
  carried `~/git/sseely/graphviz-carried-1612/build/cmd/dot/dot`, `/tmp/ghl1612-carried`.
- Inputs: `test/corpus/corpus-manifest.json` paths under `~/git/graphviz-16.1.2/tests` (identical to 16.1.1's
  for every walked id, AD-1).
- Issue triage: #295 body and #299 (render skip), #300 (`flat_edges` self loops), #301 (`conc_slope`), #302
  (`reallyroutespline`); #295's "no port change expected" list (`do_ordering_node`, `restore_best`, `rank_t.an`,
  `beginpath`/`endpath`, `sort_place`, cgraph node set, neatogen `s1`) — a change from one of those is a finding.
- C history: `git -C ~/git/graphviz log -p -w 16.1.1..16.1.2 -- lib/<dir>/<file>.c` (read-only).

## Write-set
`plans/graphviz-16-1-2-rebaseline/classification/dot.md` only (the orchestrator creates the directory).

## Acceptance criteria
- Given every row of the dot diff tables, then it appears in exactly one group in `dot.md`.
- Given each group, then it names an issue, `#299`, `port commit on main <sha>` or `NEW:`, the C commit and
  `file:function` (none for the main-commit group), a one-sentence mechanism and an example hunk.
- Given `oracle-error` transitions, then each is confirmed by a native exit-status change (crash → success, or
  output → render skip).
- Return only the group table and the counts per issue — no preamble, no trailing summary.

## Observability / rollback
N/A — read-only. Reversible.
