# issue-156: neato double Laplacian and `conjugate_gradient_d` (16.1.1)

## Observation: a harness linked against `libneatogen.a` gets the plugin's own code for an out-of-line function
- **Context**: T1 had to prove that a `-flto=thin` harness computes what the
  neato plugin computes, since LTO compiles each inlined site on its own.
- **Finding**: `conjugate_gradient_d` is out of line in the 16.1.1 plugin
  (`nm`: `t _conjugate_gradient_d`) and stays out of line in a harness built
  with the flags of `build/lib/neatogen/CMakeFiles/neatogen.dir/flags.make`.
  The two disassemblies are the same 758 instructions; with branch targets
  masked, 6 differ, all literal-pool, GOT or string offsets. A copy of
  `conjgrad.c` with calls recording `r.r`, `p.Ap` and `alpha` keeps the same
  floating-point instructions, and its x equals the untraced function's on
  288 systems. The untraced function gives x after every iteration without
  any instrumentation: call it once per `max_iterations` = 1..n.
- **Impact**: for an out-of-line kernel, compare the masked instruction
  sequence with the plugin's before trusting a harness; when it matches, the
  harness is the oracle. An inlined kernel still needs the relink technique
  (`post-16-1-followups-8.md`).
- **Confidence**: High

## Observation: `vtx_data` rows must share one allocation per field
- **Context**: the harness's `hier` mode segfaulted in
  `stress_majorization_with_hierarchy`; `imds` mode worked.
- **Finding**: `compute_y_coords` saves `graph[0].ewgts`, swaps in uniform
  weights, and restores by walking the saved pointer row by row
  (`opt_arrangement.c:82-86`). With one `calloc` per row the restore writes
  pointers into row 0's block and past it. `makeGraphData` allocates one
  block each for `edges`, `ewgts` and `edists`.
- **Impact**: a hand-built `vtx_data` graph needs the same layout. Building
  the harness against the previous oracle version and reproducing the stored
  fixtures (24 of 24 here) checks the inputs before the new version is read.
- **Confidence**: High

## Observation: `JSON.stringify` turns `-0` into `0`
- **Context**: `capture.mts` parsed the harness's JSON and wrote it back
  with `JSON.stringify`; the fixture round trip then failed on `c1554 smart`.
- **Finding**: C prints `-0` with `%.17g` and `JSON.parse` keeps the sign,
  but `JSON.stringify(-0)` is `"0"`. The stored coordinates have `-0`
  entries, and the unit tests compare with `toEqual`, which tells them apart.
- **Impact**: keep native stdout verbatim in capture files; format numbers
  for a `.ts` fixture with an explicit `Object.is(v, -0)` case.
- **Confidence**: High

## Observation: `*.d.test.ts` is a declaration file to `tsc`
- **Context**: the brief offered `conjgrad.d.test.ts` as the new test's name.
- **Finding**: `tsc` reads `name.d.<ext>.ts` as an ambient declaration file
  and fails with TS1254 and TS1183 on the first `const` and function body.
  vitest runs the file without complaint, so only gate 1 shows it.
- **Impact**: do not name a file `*.d.test.ts`; `conjgrad.dense.test.ts` is
  the name used.
- **Confidence**: High

## Observation: `mode=hier` native captures live in four fixture directories
- **Context**: the brief listed `__fixtures__/hier/`, `hier-imds.ts` and
  `hier-majorization.ts`. After the port, 15 tests in two other files failed.
- **Finding**: `__fixtures__/dim/hier-*` (23 cases) and
  `__fixtures__/models/hier-*` (11) are also `-Kneato` captures of
  `mode=hier`; `multi-component-attrs/hier-*` (5) too. Under 16.1.1, 12 of
  the `dim/` cases and 5 of the `models/` cases change in content, and only
  8 of those 17 move far enough to fail a 0.01 comparison. Native 16.1.1 also
  writes statements in another order than 16.1.0 (#149), so a byte diff flags
  every xdot file; comparing sorted lines separates order from content.
  One native run of `ipsep/{big-dired,dired-true,len-dired}` also differed
  from the stored files, but that is native's run-to-run VPSC variance
  (`post-16-1-followups-8.md`): 12 runs gave 10, 2 and 2 variants, the port's
  output is byte-identical on base and head, and it equals the majority
  variant of `dired-true` and `len-dired`.
- **Impact**: find stale captures with a sweep of every fixture input
  against the oracle, not by waiting for red tests; a tolerance hides small
  movers. Before reading a sweep difference as a version change, run the
  input several times and compare the port's base and head bytes.
- **Confidence**: High
