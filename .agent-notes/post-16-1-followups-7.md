# post-16-1-followups-7 mission — observations (2026-10-30/31)

## Observation: native mode=ipsep with constraints is nondeterministic run to run
- **Context**: T5 harness and T8 probes (`diredgeconstraints`, VPSC).
- **Finding**: C++ VPSC orders `std::set<Block*>` (`blocks.h:37`) and `CmpNodePos` ties by
  heap address. One native harness input gave 3 results under default env, `X=1` and
  `MallocNanoZone=0`. 40 native `-v` runs gave 2 (`dired-true`), 3 (`dired-hier`),
  4 (`dired-hier-sep`) and 21 (`big-dired`) distinct traces, which depart from each other
  at iteration 2–3. Native also aborts (`libc++abi … Cycle Error!`, rc 134) on a random
  DAG with `diredgeconstraints=true` + `overlap=ipsep`, and segfaults (rc 139) on
  `diredgeconstraints=hier` with no level boundaries (`size_t` wrap).
- **Impact**: compare directed-edge ipsep probes against a set of native runs, not one
  fixture; follow-up 106.
- **Confidence**: High

## Observation: C process globals map to registerRenderState containers, not new parameters
- **Context**: T2 (`UserShape` list) and T9 (`Gvimagepath`) both stopped on write-set, each
  proposing to thread a graph through out-of-set callers.
- **Finding**: C's `user_shape` list and `Gvimagepath` are process globals, and
  `safefile(const char *)` takes no graph. A module-level `const` container reset by
  `registerRenderState` (`src/common/render-state.ts`) and set unconditionally at
  graph init reproduces native without touching callers. ADR-2's per-context rule covers
  caller-installed hooks only.
- **Impact**: before widening a write-set to pass a graph, check whether the C value is a
  process global.
- **Confidence**: High

## Observation: a JS assignment expression into a typed array yields the unrounded value
- **Context**: T8 `buildLap1` (`constrained_majorization_ipsep.c:328`).
- **Finding**: `const v = (f32[i] = x * y)` gives the double `x*y`, while C
  `v = a[i] *= d` gives the stored float. A 1-ulp `degrees[]` error drifted the y CG by
  0.001 pt.
- **Impact**: wrap such expressions in `Math.fround` when porting float code.
- **Confidence**: High

## Observation: neato MODEL_* constants have two numberings
- **Context**: T8.
- **Finding**: `init.ts`/`sgd.ts`/`constrained-majorization.ts` use C `defs.h`
  (CIRCUIT=1, SUBSET=2, MDS=3); `stress.ts` defines MDS=1, CIRCUIT=2, SUBSET=3.
- **Impact**: never pass a `stress.ts` MODEL_* to the cola driver or `checkModel`.
- **Confidence**: High

## Observation: native loadimage targets are renderer names, not device names
- **Context**: T6.
- **Finding**: `-Tplain` runs on the `dot` renderer and `-Tcmapx`/`imap` on `map`
  (`gvrender_core_dot.c:775`, `gvrender_core_map.c:273-276`), so `gvloadimage` looks up
  `png:dot` / `png:map`. Only json lacks a core loader, so only `-Tjson` warns. Resolver
  bytes shorter than HDRLEN (20) are FT_NULL even with a valid magic prefix.
- **Impact**: the port's `renderer.type` is the device name; map it before table lookups.
- **Confidence**: High

## Observation: tooling details found this mission
- **Context**: every landing.
- **Finding**: `compareXdot` tests `delta > tolerance` strictly, so a one-printed-unit
  xdot difference (delta 0.01000000000005) fails at 0.01 and needs ~1e-9 slack. Under
  vitest 4 / v8 coverage a source hint must be `/* v8 ignore next -- @preserve */`
  (esbuild strips the plain form; `src/index.ts:45`'s hint lacks `@preserve`). vitest
  hides `console.log` from passing tests here; dump to a file. The shell `grep` is ugrep
  and silently misses some patterns; use `/usr/bin/grep`. Bytediff of a task whose new
  modules are unreferenced is trivially identical: compare bundle hashes first.
- **Impact**: saves a bytediff and avoids false probe failures.
- **Confidence**: High

## Observation: pre-existing duplicates and misplacements left in place
- **Context**: T7, T10.
- **Finding**: `computeApspPacked`/`computeWeightedApspPacked` exist in both `bfs.ts:110,129`
  and `stress-kernel.ts:44,59` (T7 imports `bfs.ts`'s). The three `kkutils.c` helpers live
  in `stress-models.ts`, `stuff.c:new_array` in `lu.ts`, and C `fmax`/`fmaxf` in
  `quad-prog-solve.ts:129`. `remapIn/OutConstraints` (`csolve_VPSC.cpp`) are private to
  `quad-prog-vpsc-overlap.ts`. `init.ts:mapModelToStress` is referenced only by a test.
- **Impact**: candidates for a dedicated cleanup PR.
- **Confidence**: High
