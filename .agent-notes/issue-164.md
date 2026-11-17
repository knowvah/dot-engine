# Issue #164: order ortho segments with libc `rand()` (graphviz 16.1.1)

## Observation: `partition` results depend on the `crand` stream position
- **Context**: Porting 16.1.1's `generateRandomOrdering` (`gvPermutation(n)` +
  1, no seed) into `src/ortho/partition.ts`.
- **Finding**: `partition` no longer seeds anything. It draws two orderings
  from the shared `crand` stream (one if the horizontal pass fails), so two
  calls in one process get different orderings. From `csrand(1)` a 2-cell
  input leaves the next `crand()` at 1264817709, a 3-cell input at 1954899097.
  `registerRenderState` resets the stream per render, so a full render is
  still deterministic.
- **Impact**: Any unit test that calls `partition`, `mkMaze` or `orthoEdges`
  directly and pins a result must call `csrand(1)` first. `ortho.test.ts`'s
  "two identical calls produce identical routing results" still passes, but
  its second call now runs on a different ordering than its first.
- **Confidence**: High (red test on the base: 16807; green on the head).

## Observation: bytediff sees stderr-only changes that a drawing compare misses
- **Context**: Gate 6 on `2783` under osage.
- **Finding**: `test/tools/bytediff.ts` compares each job's whole output,
  stderr section included. It lists all five `2783|osage` jobs as changed,
  while `engine-compare.sh` shows `base=head:y` for their drawings: only the
  messages moved (0 → 79 bytes, native's two trapezoid failure lines).
- **Impact**: A bytediff "diff" on a row whose drawing is unchanged is a
  message change; check the `--stderr--` section before looking for a layout
  difference.
- **Confidence**: High (measured: reach bytediff and the survey lines).

## Observation: native 16.1.1 has no output on circo `1447` and `1658`
- **Context**: The native survey for gate 6.
- **Finding**: `dot -Kcirco` exits 139 on both ids in svg, xdot, plain, json
  and cmapx, with empty stdout and stderr. The port renders both, and its
  svg, xdot, plain and json change with the new ordering (cmapx does not).
  The planning record says `1447` also crashes in 16.1.0 and that `1658` dies
  on a NULL `dtmatch` in `chanSearch`; neither was re-measured here.
- **Impact**: These two rows have no oracle. A change in their port output
  cannot be judged as toward or away from native.
- **Confidence**: High for the exit codes (measured); Medium for the crash
  site (from the planning record).

## Observation: the old silent-null `partition` input is undefined in native
- **Context**: Replacing the "returns null silently" test input.
- **Finding**: The planning record (decisions AD-5, #239) reports an ASan
  heap-buffer-overflow in `make_new_monotone_poly` (`lib/ortho/partition.c:249`)
  for `cell(box(10,20,10,30))` in `box(-26,-16,46,66)`, with results that vary
  by run. The harness output in `partition-1611.out` shows one clean run (6
  rectangles), which the port also gives. Not re-run under ASan here.
- **Impact**: Do not pin a `partition` expectation on a zero-width cell
  without checking native under ASan first. The test now uses a fuzzed
  two-cell input on which native returns the empty list.
- **Confidence**: Medium (planning evidence, not re-measured).
