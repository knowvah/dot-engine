# Decisions: issue #164

## Background

Graphviz 16.1.1 (`b99490ece`) changes how ortho orders its segments before the
Seidel trapezoidation:

| | 16.1.0 | 16.1.1 |
|---|---|---|
| seed | `partition()` calls `srand48(173)` | no seeding |
| ordering | `generateRandomOrdering`: in-place swap with `drand48()` | `gv_permutation(n)` (`lib/util/random.c:15`): Fisher-Yates over `gv_random`, i.e. libc `rand()` with rejection, then `++` to make it 1-based (`lib/ortho/partition.c:134-143`) |
| stream | drand48, reseeded per `partition` | the process-global `rand()` stream, unseeded (= `srand(1)` on macOS) unless an earlier layout step seeded it |

`partition` draws two orderings, one per pass (`partition.c:677`, `:693`). When
the horizontal pass fails it returns before the second draw.

The port (`src/ortho/partition.ts`, base `208b8b84`) still has 16.1.0's code:
`srand48(SEED)` with `SEED = 173` (`:22-25`, `:274-276`) and the drand48 swap
(`:94-104`). `src/ortho/index.ts:26` re-exports `SEED`. The port already has a
bit-exact model of macOS `rand()` and of `gv_random`/`gv_permutation` in
`src/common/crand.ts` (minstd, `RAND_MAX` 2³¹−1, state reset per render by
`registerRenderState`), used by sfdp, neato and fdp.

**Maintainer ruling (2026-11-09, issue comment):** emulate macOS libc `rand()`
by calling `gvPermutation(n)` from `crand.ts`. The #147 and #148 comments then
measured that the permutation does change the output (5 corpus ids under circo
and twopi, and `2783` under dot).

## AD-1: port generateRandomOrdering as 16.1.1 has it

`generateRandomOrdering(n)` returns `gvPermutation(n)` with each entry
incremented, exactly as `partition.c:134-143`. `partition` loses its
`srand48(SEED)` call. The `SEED` constant, its export and the re-export in
`src/ortho/index.ts` are deleted, and so is the `random.js` import. The file
header and the comment above the two draws now describe the `rand()` stream.

[harness/counterfactual.patch](harness/counterfactual.patch) is this change
(src only, no tests).

`SEED` is not public API: `package.json` exports `.`, `./api` and `./render`,
and none of them reaches `src/ortho/index.ts`'s `SEED` (`grep` over
`src/index.ts`, `src/api/index.ts`, `src/render/index.ts`). Its only other users
are the two tests AD-3 deletes.

Rejected:

- **Keep drand48 and record a divergence.** Contradicts the maintainer's
  ruling, and leaves 6+ corpus ids diverged that the port can match.
- **A private ortho-only `rand()` stream.** C shares one stream. Under neato,
  fdp and sfdp, layout steps draw from `rand()` before ortho does, so a private
  stream would start at the wrong position.

## AD-2: one shared stream, no reseed

Ortho draws from the same `crand` state as every other `rand()` consumer, and
nothing reseeds it in `partition`. A fresh render starts from `srand(1)`
(`registerRenderState`), as a fresh native process does. Draw order is then the
C order by construction: fdp's coincident-node deltas, neato's `rand()`
consumers, sfdp's seeded `srand(random_seed)` and the prism overlap smoother
(`lib/sfdpgen/post_process.c:643`, port `overlap-prism.ts:418`, reachable from
any engine that removes overlaps) all run before splines, in both. dot draws
nothing before ortho, in C or in the port.

Removing `srand48(173)` also stops `partition` reseeding the drand48 stream. In
16.1.1 nothing in ortho touches drand48, so the port must not either.

## AD-3: tests from the 16.1.1 C, test-first

Expected values come from native 16.1.1's own `partition()` and
`gv_permutation`, linked from the oracle build's `libortho.a` and `libutil.a` by
[harness/partition-1611.c](harness/partition-1611.c)
([build-c.sh](harness/build-c.sh); output
[partition-1611.out](harness/partition-1611.out)). Every case starts from
`srand(1)`. [harness/port-cases.ts](harness/port-cases.ts) runs the same cases
on the port in the same format: on the counterfactual its output equals the C
output byte for byte (permutations, sorted rectangle sets, stderr lines, and the
next `rand()` after `partition`).

Unit tests that call `partition` directly must call `csrand(1)` first (in a
`beforeEach`, or before each call). The result now depends on the stream
position, and earlier tests in the file move it.

Red first, on the base, each failing for the stated reason:

1. **Stream** (`partition.test.ts`): after `csrand(1)`, `partition` on fixture
   `f2pair` leaves the stream so that the next `crand()` is **1264817709**
   (`f3chain` and `f3branch`: 1954899097). On the base it is 16807 (the first
   draw: base `partition` never touches `rand()`).
2. **Point cell** (`ortho-failure.test.ts`, "single point cell"): after
   `csrand(1)`, `partition([cell(box(0, 10, 0, 10))], box(-36, -26, 36, 46))`
   returns 4 rectangles and prints nothing: `box(-36,-26,0,10)`,
   `box(-36,10,0,46)`, `box(0,-26,36,10)`, `box(0,10,36,46)`. On the base it
   returns null and prints the segment and horizontal failure lines. Retitle the
   test: it no longer reports a failure.
3. **Silent null** (`ortho-failure.test.ts`): the old input
   (`cell(box(10,20,10,30))` in `box(-26,-16,46,66)`) is undefined behaviour in
   native 16.1.1 (AD-5), so it cannot pin anything. Replace it with **silentA**:
   cells `box(10,40,20,60)` and `box(40,0,40,10)` in `box(-26,-36,76,96)`.
   16.1.1 returns an empty list with empty stderr (the `LIST_DETACH` null). On
   the base it returns 19 rectangles. Found by
   [harness/partition-fuzz-1611.c](harness/partition-fuzz-1611.c) (seed 7,
   want 0); silentB (`box(0,30,10,40)`, `box(10,20,10,40)` in
   `box(-36,-16,46,76)`, base 12 rectangles) is the spare.

Re-pin, not red:

- `partition.test.ts` fixtures: `hperm`/`vperm` become the 16.1.1 orderings
  (`f2pair` `12 6 11 5 10 1 7 9 3 4 2 8` / `7 12 4 5 9 2 10 8 1 3 11 6`;
  `f3chain` and `f3branch` `16 7 3 14 6 1 2 12 9 15 4 13 11 10 5 8` /
  `9 11 15 3 13 4 2 6 1 10 7 5 14 12 16 8`), checked as
  `gvPermutation(nsegs)` + 1 twice after `csrand(1)`. The local `genOrder`
  (drand48) helper goes. The `rects` stay: 16.1.1 gives the same sets
  (`partition-1611.out`), and the counterfactual passes them.
- The other `ortho-failure.test.ts` cases (`2784`, vertical-only, well-formed,
  `mkMaze`, `orthoEdges`) keep their expectations, which 16.1.1 gives from
  `srand(1)` too. They gain the `csrand(1)` reset.
- Delete "SEED matches C srand48(173)" (`partition.test.ts:175`) and "SEED
  constant equals 173" (`ortho.test.ts:34`, and AC1 in its header list).
- Update the header comments of `partition.test.ts` and `ortho-failure.test.ts`:
  they say the values came from 16.1.0 / drand48.

## AD-4: how "equals native" is judged

[harness/engine-compare.sh](harness/engine-compare.sh) renders each (input,
engine) with the base bundle, the head bundle (`test/tools/bd-job.ts`) and native
16.1.1 (`/tmp/ghl1611` for dot, `/tmp/ghl1611-all` otherwise), in svg, xdot,
plain, json and cmapx, and counts `diff` lines against native after
[harness/normalize.mjs](harness/normalize.mjs) (copied from #163). A changed job
that is not equal to native gets the queue rules' toward-native check
([harness/toward.mjs](harness/toward.mjs)). It also records each side's stderr.

## AD-5: native undefined behaviour stays out

On the old silent-null input, native 16.1.1 writes past a heap buffer: ASan
reports a heap-buffer-overflow WRITE in `make_new_monotone_poly`
(`lib/ortho/partition.c:249`) into the 528-byte array `monotonate_trapezoids`
allocates (`:593`). Runs differ (a garbage `LL.x` of 8.4e-323, SIGKILL, SIGBUS,
or a clean 6-rectangle result). The port's arrays grow, so it always gives the
clean result. Nothing to port; filed as follow-up #239. The test drops that
input (AD-3 item 3).

`1658` under circo is the corpus face of the same family: native 16.1.1 crashes
(exit 139, NULL `dtmatch` in `chanSearch`), and the port's `assignSegs` miss
path renders it. That row changes from comparable to native-crash; recording it
is the maintainer's (AD-6).

## AD-6: scope

In: AD-1..AD-3 and the gates.

Out:

- Corpus records (`accepted-divergences*.json`, parity tables, attribution,
  engine exclusions) and the `docs/known-divergences.md` row. The maintainer
  updates them when the queue branch merges, as for #158, #162 and #163.
- Native's heap overflow (AD-5) and `1658`'s native crash.
- `lib/util/random.c`'s `random_big` (bound > `RAND_MAX`): not reachable,
  `nsegs` is 4·(cells+1).

## Rollback

Reversible: revert the squashed commit. No data model or public API change;
`SEED` was internal. Only `splines=ortho` output changes, toward 16.1.1.

## Operational readiness

- Observability: N/A (library; the only messages are C's existing ortho
  failure lines, which now fire where 16.1.1's fire).
- Scalability: `gvPermutation` is O(n) like the old swap, with rejection
  sampling that averages under 2 draws per element.
- Backwards compatibility: no API shape change. `splines=ortho` routes change
  to 16.1.1's, as they did for native users.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 ordering | `gvPermutation(n)` + 1, no seed, `SEED` deleted | keep drand48 + divergence; private stream | maintainer ruling on #164; cf equals the 16.1.1 C `partition()` on 10/10 cases |
| AD-2 stream | the shared `crand` state | reseed per `partition` | C has no reseed; `registerRenderState` models a fresh process |
| AD-3 tests | re-mint from 16.1.1 C; `csrand(1)` before each `partition` | keep 16.1.0 values | C harness output; 3 tests red on the base for the stated reason |
| AD-3 silent null | fuzzed silentA | keep the old input | the old input is native UB (ASan, AD-5) |
| AD-6 records | maintainer at merge | update corpus records here | same split as #158, #162, #163 |
