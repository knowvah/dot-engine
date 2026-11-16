# T1: finite-quotient guards (poly_inside, bend, vpsc alpha/beta)

## Context

Graphviz 16.1.1 replaces four "divisor is zero" guards with "quotient is
finite" guards, through two new helpers in `lib/util/overflow.h:142-174`
(`fdiv_overflow`, `fdivf_overflow`):

| Upstream | C site (16.1.1) | Port site (base `064266d2`) |
|---|---|---|
| `0d34ab7d6` | `lib/common/shapes.c:2466-2469` (`poly_inside` scale) | `src/common/poly-inside.ts:77-78` (fixedshape) and `:88-89` (`insideScale`) |
| `fb7f0feb3` | `lib/common/routespl.c:944-947` (`bend`) | `src/layout/dot/straight-edges.ts:188` |
| `0b24f6444` | `lib/neatogen/quad_prog_vpsc.c:114-115` (alpha) | `src/layout/neato/quad-prog-vpsc.ts:176` (`descentStep`) |
| `d8c1cc3c9` | `lib/neatogen/quad_prog_vpsc.c:145-146` (beta) | `src/layout/neato/quad-prog-vpsc.ts:198-200` (`lineSearchBeta`) |

Read the four commits with `git -C ~/git/graphviz show -w <sha>` (16.1.0's
tree holds the 16.1.1 history). Decisions: [AD-1](../decisions.md) to
[AD-5](../decisions.md).

## Task (TDD)

1. **Red, helpers.** In `src/util/overflow.test.ts`, add
   `describe('fdivOverflow / fdivfOverflow (overflow.h:fdiv_overflow)')`:
   - `fdivOverflow(1, 4)` is `0.25`; `fdivOverflow(0, 5)` is `0`
     (`Object.is(…, 0)`); `fdivOverflow(1, 0)`, `fdivOverflow(0, 0)`,
     `fdivOverflow(1e308, 1e-10)`, `fdivOverflow(NaN, 1)` and
     `fdivOverflow(Infinity, 2)` are `null`.
   - `fdivfOverflow(1, 1e-39)` is `null` (the float quotient is `inf`, the
     double one is not); `fdivfOverflow(3, 2)` is `1.5`;
     `fdivfOverflow(1, 3)` is `Math.fround(1 / 3)`; `fdivfOverflow(0, 0)`
     is `null`.
   Expected red: the imports do not exist.
2. **Red, call sites** (each must fail on the base; journal the failures):
   - `src/common/poly-inside.branch.test.ts`, in `insideScale flip and
     zero-size branches`: copy the existing "zero xsize" test with
     `lw: 5e-324` (a subnormal, not zero). 16.1.1 keeps `scalex = w` (20), so
     `{ x: 0.4, y: 0 }` is inside, as in the zero case. The base computes
     `20 / 5e-324 = Infinity` and answers `false`. Add the fixedshape twin:
     `flip: true`, `boxVerts(30, 1e-320)`, so `w / xsize = 60 / 2e-320`
     overflows; 16.1.1 keeps `scalex = w`. At planning the query point
     `{ x: 0.4, y: 0 }` (non-fixedshape) and `{ x: 0.1, y: 0 }` (fixedshape)
     were `false` on the base and `true` on the scratch head. Say
     the arithmetic in a comment.
   - `src/layout/dot/straight-edges.branch.test.ts`: in the 3-cycle `describe`,
     put B at `x = Infinity` (and a second case at `NaN`) and route C→A as a
     lone curved edge. The centroid's x is non-finite, so 16.1.1's `bend`
     returns early and every control point stays finite. The base writes `NaN`
     into `spl[1].x`/`spl[2].x`. At planning the head gave
     `[[0,0],[0,0],[0,54.3837],[0,78.6014]]` for both cases. Assert that each
     point is finite with x `0`, not the exact y values.
   - `src/layout/neato/quad-prog-vpsc.test.ts`, in `constrainedMajorizationVpsc`:
     the existing zero-matrix test with packed matrix `[-1e-39, 0, -1e-39]`
     instead of zeros. The denominator is about 2.5e-39 and the float quotient
     overflows, so 16.1.1 takes `alpha = 1`: `place` ends at `[0, -0.5]`, the
     same as the zero-matrix case. The base ends at `[-Infinity, Infinity]`
     (measured at planning).
   - Beta: no behaviour test ([AD-3](../decisions.md)).
3. **Green.**
   - `src/util/overflow.ts`: add the two helpers per AD-1 and AD-2, with doc
     comments in the style of `saddSaturate`'s.
   - `src/common/poly-inside.ts`: `scalex: fdivOverflow(w, xsize) ?? w` and
     `scaley: fdivOverflow(h, ysize) ?? h` in both branches of `insideScale`.
   - `src/layout/dot/straight-edges.ts:bend`: AD-4's guard and comment. Update
     its `@see` range to `lib/common/routespl.c:937-951`.
   - `src/layout/neato/quad-prog-vpsc.ts`: `descentStep` returns
     `-(fdivfOverflow(numerator, denominator) ?? 1.0)`, with C's
     `alpha = 1.0` fallback named in a comment. `lineSearchBeta` returns
     `fdivfOverflow(numerator, denominator) ?? 1.0`; replace its
     `is_exactly_zero` comment with one that quotes 16.1.1. Update the two
     `@see` ranges to 16.1.1's lines (alpha step ends at `:115`, beta at
     `:146`).
4. Re-run the four test files, then gates 1-6 (README). Journal each.
5. **Finish:** the README's squash step.

## Write-set

- `src/util/overflow.ts`, `src/util/overflow.test.ts`
- `src/common/poly-inside.ts`, `src/common/poly-inside.branch.test.ts`
- `src/layout/dot/straight-edges.ts`, `src/layout/dot/straight-edges.branch.test.ts`
- `src/layout/neato/quad-prog-vpsc.ts`, `src/layout/neato/quad-prog-vpsc.test.ts`
- `plans/issue-154-fdiv-overflow-guards/decision-journal.md`, the README's
  batch status, `plans/decision-journal.md`, `.agent-notes/issue-154.md`
  (only if novel)

## Read-set

- `~/git/graphviz-16.1.1/lib/util/overflow.h:125-174`
- `~/git/graphviz-16.1.1/lib/common/shapes.c:2430-2472`
- `~/git/graphviz-16.1.1/lib/common/routespl.c:937-951`
- `~/git/graphviz-16.1.1/lib/neatogen/quad_prog_vpsc.c:93-160`
- `src/util/overflow.ts`, `src/util/overflow.test.ts:1-40`
- `src/common/poly-inside.ts:45-95`, `src/common/poly-inside.branch.test.ts:1-90`, `:231-290`
- `src/layout/dot/straight-edges.ts:175-195`, `src/layout/dot/straight-edges.branch.test.ts:21-155`
- `src/layout/neato/quad-prog-vpsc.ts:155-225`, `src/layout/neato/quad-prog-vpsc.test.ts:251-270`

## Interface contracts

New, from `src/util/overflow.ts` (no other task consumes them):

```ts
/** null = C returned true (non-finite quotient; *res untouched). */
export function fdivOverflow(n: number, d: number): number | null;
/** float32: operands and quotient pass through Math.fround. */
export function fdivfOverflow(n: number, d: number): number | null;
```

Every other signature stays as it is. `insideScale`, `bend`, `descentStep`
and `lineSearchBeta` are module-private.

## Acceptance criteria

- Given `fdivfOverflow(1, 1e-39)`, when called, then it returns `null`, while
  `fdivOverflow(1, 1e-39)` returns a finite number (about 1e39).
- Given a polygon node with `lw + rw = 5e-324` and width 20 pt, when
  `polyInside` tests `{ x: 0.4, y: 0 }`, then it returns `true` (scalex = w).
- Given a curved lone edge whose cycle centroid has x = ±∞ or NaN, when
  `makeStraightEdges` routes it, then every control point is finite.
- Given a 2×2 matrix with diagonal −1e−39, when `constrainedMajorizationVpsc`
  runs one iteration from `[1, -1]` with `b = [0.5, -0.25]`, then `place` is
  `[0, -0.5]`.
- Given the smoke ids, the survey ids and the five probes, when bytediffing base
  and head, then every job is identical.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and
copy `dist/index.js` to `$TMPDIR/issue154-head.mjs`. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked
and `npm run parser:regen`, and copy its bundle to `$TMPDIR/issue154-base.mjs`.
Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue154-base.mjs $TMPDIR/issue154-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue154-bytediff.json
```

Expected: identical on every job.

## Targeted survey

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt),
18 ids): [harness/scan-fdiv.mjs](../harness/scan-fdiv.mjs) lists every
applicable corpus input whose text reaches a site with unusual operands:
`splines=curved` (`bend`; 1 id), `fixedsize=shape` (the polyBB scale branch;
1 id), `width`/`height` 0 (poly_inside's xsize/ysize at zero; 17 ids, 16 kept), and
neato `mode=ipsep`/`hier` (vpsc; 0 ids). Every input reaches `insideScale`'s
ordinary branch, and the smoke list covers that. No corpus input sets
`mode=ipsep`, so the probes stand in for vpsc. `1652` (240 KB, zerosize) is left out:
at planning every job of it timed out at 120 s on both bundles, dot included
(load 13-20), so it compares nothing. The list holds the other 18.

The probes ([harness/probes/](../harness/probes/)): `ipsep.gv` and
`ipsep-diredge.gv` (neato `mode=ipsep`; alpha/beta), `curved-dot.gv` and
`curved-neato.gv` (`bend` on 3-cycles, multi-edges, a loop), `shape-scale.gv`
(`fixedsize=shape`, zero-size polygons, `rankdir=LR`). At planning, a counting
copy of the head bundle showed every site reached: `bend` 7 times on both
curved probes; alpha/beta 2524 and 7 times on the ipsep probes; both
`insideScale` branches on `shape-scale` under dot and neato.

```
H=plans/issue-154-fdiv-overflow-guards/harness
BD_FORMATS=svg,xdot,plain,json,cmapx npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue154-base.mjs $TMPDIR/issue154-head.mjs $H/survey-ids.txt \
  $TMPDIR/issue154-survey.json
for p in ipsep:neato ipsep-diredge:neato curved-dot:dot,neato \
         curved-neato:neato,dot shape-scale:dot,neato; do
  BD_ENGINES=${p#*:} BD_FORMATS=svg,xdot,plain,json,cmapx npx tsx test/tools/bytediff.ts \
    $TMPDIR/issue154-base.mjs $TMPDIR/issue154-head.mjs --file $H/probes/${p%%:*}.gv \
    $TMPDIR/issue154-probe-${p%%:*}.json
done
```

Expected, as at planning: see the README's Evidence section. A cap is not a
diff: re-run a capped job alone with `BD_CAP_MS=570000` and journal it.

**Head vs native on the probes:** run `oraclePreflight` for `dot`
(`/tmp/ghl1611`) and `neato` (`/tmp/ghl1611-all`), then for each probe and
engine above, and for xdot, plain and cmapx, compare
`GVBINDIR=<dir> ~/git/graphviz-16.1.1/build/cmd/dot/dot -K<engine> -T<fmt>`
with `npx tsx test/tools/bd-job.ts $TMPDIR/issue154-head.mjs <probe> <engine>
<fmt>`, cut exactly at `\n--stderr--`. At planning the scratch head equalled
native byte for byte on all 18. The head must too.

## Observability

N/A. C prints nothing on these paths.

## Rollback

Reversible: revert the commit. No format, data or API change.
