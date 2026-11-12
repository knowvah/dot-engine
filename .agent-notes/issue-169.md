# issue-169 mission — observations (2026-11-11)

## Observation: native exits 1 when only `agerrorf` fired, and still prints the layout
- **Context**: pinning native's stderr for `ordering=bogus` on a node, a node default and the graph.
- **Finding**: native 16.1.0 prints `Error: ordering 'bogus' not recognized...` and the complete,
  unchanged layout on stdout, and exits **1** (`agerrorf` raises the error count `dot` returns).
  The brief had recorded exit 0.
- **Impact**: a harness that treats a non-zero native exit as "no output" drops a valid layout for
  any input that reaches an `agerrorf`; compare stdout regardless. The port has no exit status.
- **Confidence**: High (re-run on all three probes after the oracle preflight).

## Observation: an `agseterrf` callback receives C's pieces, not lines
- **Context**: the brief asked for "captured messages equal the `.err` file split into lines".
- **Finding**: `outToUser` (`src/common/agerr.ts:133`) hands a user error function the pieces C's
  `out` writes (`Error`, `: `, the message), so one stderr line arrives as several calls.
- **Impact**: pin stderr in tests as `pieces.join('')` against native's stderr text.
- **Confidence**: High

## Observation: after a macOS update the load gate cannot be waited out
- **Context**: gate 6 asks for `uptime` at or below 12 before native runs.
- **Finding**: 25 minutes after the reboot the 1-minute load was still 22-26, from `fseventsd`,
  `mds` and `mdworker_shared` (Spotlight re-indexing) with no survey or native sweep running; a
  ten-minute wait did not bring it down. `$TMPDIR` is also emptied by the reboot, so base bundles
  and scratch copies from before it are gone.
- **Impact**: a resumed session rebuilds its `$TMPDIR` artifacts first. For a short, uncapped native
  comparison the load does not change the result (24 renders took 4.1 s); a capped scan does lose
  ids (`1652`, 8155 input lines, hit a 120 s port cap in a marker scan).
- **Confidence**: Medium (one reboot observed)

## Observation: `mincross-build.branch.test.ts` sits at the complexity hook's file cap
- **Context**: the brief placed a new test there.
- **Finding**: the file is 458 lines; two more tests took it to 503 and the hook blocked the edit
  (it caps a colocated `src/` test file at 500). `ordering.test.ts` has the same `mkNode`/`mkCtx`
  helpers and room.
- **Impact**: plan new `doOrdering*` tests into `ordering.test.ts`.
- **Confidence**: High
