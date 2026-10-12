# T8 — dotgen + ortho behaviour changes

**Agent:** typescript-pro (model: opus). **Depends on:** T3. Follow
[area-task-protocol.md](area-task-protocol.md). **Perf gate** at land.

**Rollback:** Reversible. **Observability:** N/A — library code; the SLIs are
survey verdicts and the ratchet length.

## Context

16.1 dotgen: `mincross.c` (clang-format, `2770bb28c` leak-on-failure, failure
paths), `rank.c`, `dotsplines.c` (orthoEdges rc, lines 255-264), `1ae5c03b7`
cleanup1 use-after-free, `eec5068a6` topsort crash, fixLabelOrder
`agnnodes_z`. Ortho: `orthoEdges`, `mkMaze`, `partition`, `add_segment`,
`construct_trapezoids` can now report failure (`8a0691cf1`, `178fe6d2f`,
`312e49714`, `057e8779d`, `67bacf48e`, `92660ffca`, `3660b260e`, `3c01aaeb4`).
`955bcde23` reverted a monchain change, so diff the net effect, not the
intermediate commits. Port side: `src/layout/dot/*`
(incl. `ortho-adapter.ts`), `src/ortho/*`.

AD-6: mirror the failure path into the port's existing `dot_splines_` failure
channel. Before choosing the port behaviour, capture what native 16.1 does on a
failing ortho input: exit status, stdout (is an SVG still written?), stderr. Then
mirror that exactly. If the evidence contradicts AD-6, STOP 8.

## Acceptance

- Given every T3 row for T8, then each is ported with a test, or recorded as refactor-only with a reason.
- Given an input where 16.1 ortho routing fails, then the port's result
  (output/error/warnings) matches native.
- Given a crash fix where C now returns or recovers, when the port gets the
  same input, then it matches native instead of throwing.
- Given the corpus, then 0 regressions vs the 16.1 baseline, and perf ≤ 1.10×.

## Write-set

`src/layout/dot/*`, `src/ortho/*` + tests; `test/golden/known-failing.json` (removals).

## Commit

`fix(dot): mirror graphviz 16.1 dotgen and ortho failure handling`
