# issue #171: notes from surveying stderr

## Observation: stderr captured through `agseterrf` omits console-only messages
- **Context**: Comparing the port's stderr with native's on the 70 corpus
  inputs that mention `record` (issue #171, gate 6), with the port's stderr
  taken as the pieces handed to an `agseterrf` callback.
- **Finding**: Messages C prints with `fprintf(stderr)` and the port prints
  with `console.warn` never reach the callback. `src/pathplan/shortest.ts:248-260`
  (`triangulation failed`, `destination point not in any triangle`) is one such
  site, so `tests/1332.dot`, `tests/graphs/structs.gv` and
  `graphs/directed/structs.gv` show a stderr difference under that harness that
  is the capture method, not a missing message. Native's lines also carry the
  build's absolute source path (`lib/pathplan//<abs>/shortest.c:333:`).
- **Impact**: A stderr survey built on `agseterrf` must discount `prerror`
  lines, or capture the console as well, before reading a `DIFF` as a defect.
- **Confidence**: High

## Observation: three `record` corpus inputs do not finish inside a survey cap
- **Context**: Same survey, `-Kdot -Tdot`, three runs in parallel.
- **Finding**: `tests/2646.dot` (3.0 MB) takes 5 min 19 s per port render when
  run alone (native finishes well inside 150 s). `tests/1864.dot` (14.8 MB)
  exceeds 150 s natively and the port exhausts V8's default heap.
  `tests/2834.dot` (0.7 MB) exceeds 150 s on both sides. A brief's
  `harness/compare.mjs` (copied from issue #170) has no timeout, so a
  `grep`-selected file list that includes them blocks.
- **Impact**: Take these three out of a targeted survey list and run `2646`
  alone and uncapped; `1864` and `2834` cannot be compared on this machine.
- **Confidence**: High

## Observation: `twice.c` silences stderr
- **Context**: Running the no-free relayout probe for the
  `docs/process-statics.md` row.
- **Finding**: `plans/post-16-1-followups-9/harness/T11/twice.c:137` calls
  `agseterr(AGMAX)`. "With stderr on" in the doc means building a copy with
  that line removed.
- **Impact**: A probe of a once-per-process warning needs that edit, or it
  reports no warnings at all.
- **Confidence**: High
