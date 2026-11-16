# T1: update_bb_bz stops refining after 10 levels

## Context

Graphviz 16.1.1 `lib/common/emit.c:735-776`:

```c
static void update_bb_bz_core(boxf *bb, const pointf *cp, size_t recurse) {
  if (/* any cp[i] outside bb */) {
    if (check_control_points(cp)) { /* expand bb by cp[0..3] */ }
    else {
      if (!recurse) { return; }
      pointf left[4], right[4];
      Bezier(cp, 0.5, left, right);
      update_bb_bz_core(bb, left, recurse - 1);
      update_bb_bz_core(bb, right, recurse - 1);
    }
  }
}
void update_bb_bz(boxf *bb, const pointf *cp) {
  const size_t ATTEMPTS = 10;
  update_bb_bz_core(bb, cp, ATTEMPTS);
}
```

The port, `src/common/splines-geom.ts:93-109`, is the 16.1.0 shape, with
unbounded recursion.

## Task (TDD)

1. **Red:** in `src/common/splines.test.ts`, inside `describe('updateBbBz')`, add
   two cases from [AD-2](../decisions.md#ad-2-pin-values-from-native-1611s-own-update_bb_bz).
   Each starts from bb `{ ll: {x:0,y:0}, ur: {x:0,y:0} }` and asserts all four
   coordinates with `toBe`:
   - curve `(0,0) (3e6,1e6) (-2e6,5e5) (10,7)` → ll `(-413400.40513363667, 0)`,
     ur `(921725.5469250213, 577351.0327252895)`;
   - curve `(0,0) (-3e7,1e8) (7e7,-2e7) (100,5)` → the bb stays `(0,0)-(0,0)`.

   Comment each with `// native 16.1.1 update_bb_bz (harness/native-bb.c of
   plans/issue-150-update-bb-bz-limit)`. Run the file. Both must fail on the
   base: the first with `-487275.449564131`, the second with
   `-5781496.982492765`.
2. **Green:** in `splines-geom.ts`, port AD-1. Rename today's body to a
   non-exported `updateBbBzCore(bb: Box, cp: Point[], recurse: number): void`.
   Add `if (recurse === 0) return;` after the `checkControlPoints` branch and
   before `left`/`right` are allocated, so the order matches the C. Pass
   `recurse - 1` to both recursive calls. The exported
   `updateBbBz(bb: Box, cp: Point[]): void` calls `updateBbBzCore(bb, cp, 10)`
   through a named constant (push-forward picks the name). Keep the doc comment.
   Each function gets its own `@see lib/common/emit.c:update_bb_bz_core` or
   `@see lib/common/emit.c:update_bb_bz`, and the comment names upstream 2780.
3. Add the third case: curve `(0,0) (1e17,7e17) (-1e17,3e17) (5,7)` → bb stays
   `(0,0)-(0,0)`. Comment it as the case that hangs native 16.1.0 and the base.
   Do not run it on the base: a synchronous loop blocks vitest's timeout.
4. Run `npx vitest run src/common src/layout/dot src/layout/pack`. Every test
   must pass, the existing `AC3` case among them, unchanged.
5. Gates 1-6 (README), then the journal, the #150 comment and the squash in the
   README.

## Write-set

- `src/common/splines-geom.ts` (`updateBbBz` and a new `updateBbBzCore` only)
- `src/common/splines.test.ts` (the `updateBbBz` describe block only)
- `plans/decision-journal.md` (one row),
  `plans/issue-150-update-bb-bz-limit/decision-journal.md`, the batch table in
  this brief's README and `batch-1/overview.md`
- `.agent-notes/issue-150.md` (only if novel)

## Read-set

- `src/common/splines-geom.ts:41-109`
- `src/common/splines.test.ts:1-10,75-95`
- `~/git/graphviz-16.1.1/lib/common/emit.c:722-776`
- `cd ~/git/graphviz && git show 81c6b5484`
- [harness/native-bb.c](../harness/native-bb.c), to re-derive a value:
  `cc -O2 native-bb.c -L ~/git/graphviz-16.1.1/build/lib/gvc -lgvc
  -Wl,-rpath,$HOME/git/graphviz-16.1.1/build/lib/gvc -o $TMPDIR/nbb`, then
  `$TMPDIR/nbb x0 y0 x1 y1 x2 y2 x3 y3`

## Interface contracts

None. `updateBbBz(bb, cp)` keeps its signature. The core is not exported.

## Acceptance criteria

- Given each of the three AD-2 curves and an all-zero bb, when `updateBbBz` runs,
  then the bb equals native 16.1.1's to the bit, and the call returns (no hang).
- Given the AC3 curve, when `updateBbBz` runs, then the bb is
  `-5, -5, 6.25, 10.15625`, as before.
- Given `src/common/splines-geom.ts`, when reading `updateBbBzCore`, then the
  `recurse === 0` return sits after the refined check and before the split, as in
  `emit.c:759-761`.
- Given the smoke list, when the base and head bundles are compared, then every
  job is identical.
- Given the targeted ids, when the base and head bundles are compared, then every
  job is identical.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue150-head.mjs`. Build the base from `git archive
<base>`, extracted under `$TMPDIR`, with `node_modules` symlinked and `npm run
parser:regen`, and copy its bundle to `$TMPDIR/issue150-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue150-base.mjs $TMPDIR/issue150-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue150-bytediff.json
```

Expected: identical on every job. At planning, the depth detector saw 508
top-level `updateBbBz` calls across the 49 smoke ids, and none reached depth 10
([harness/detector-smoke.txt](../harness/detector-smoke.txt)).

## Targeted survey

**How the ids were chosen:** the bound changes output only when a segment is
still unrefined after 10 halvings. That needs a control point about 2.1e6 pt off
its chord, or coordinates large enough that halving stalls (the 277x family). A
native 16.1.1 `-Tplain` sweep of all 982 applicable inputs measured each graph's
size ([harness/native-large.txt](../harness/native-large.txt)). The list
[harness/candidates.tsv](../harness/candidates.tsv) holds:

- every input over 1000 in on a side, among them `2108` (12092 in), `2222`
  (58178 in) and `2784` (3e16 in);
- the 277x family, `2776_1` included.

The 17 inputs with no native output in 20 s were run through the detector at
planning. Three are parse errors, and `1783` finishes with no hit. `1864` runs out
of memory in the port, and 12 hit the 120 s cap without printing a depth-10 hit.
They are left out here because they cap. `2471` is in the list: it may cap on
both sides.

Run on the bundles from gate 5:

```
cut -f1 plans/issue-150-update-bb-bz-limit/harness/candidates.tsv > $TMPDIR/issue150-ids.txt
BD_ENGINES=dot BD_FORMATS=svg,xdot,plain npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue150-base.mjs $TMPDIR/issue150-head.mjs $TMPDIR/issue150-ids.txt \
  $TMPDIR/issue150-survey.json
```

Expected, from the planning reach check: `diffs: []`. A job capped on one side
only is a stop. The 277x jobs end in the port's #151 `InternalError` on both
sides. Since the head equals the base on every job, each row's distance from
native is unchanged. Journal the job counts. For one input (`2108`), also record
that native 16.1.1 and the head agree on the graph line of `-Tplain` (the bb).

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
