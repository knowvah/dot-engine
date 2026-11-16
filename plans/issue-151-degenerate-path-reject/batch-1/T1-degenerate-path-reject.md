# T1: reject an all-degenerate path as checkpath does

## Context

Graphviz 16.1.1 `lib/common/routespl.c:632-652`:

```c
static int checkpath(size_t boxn, boxf *boxes, path *thepath) {
  /* remove degenerate boxes. */
  size_t i = 0;
  for (size_t bi = 0; bi < boxn; bi++) { /* skip |dy| < .01 or |dx| < .01 */ }
  boxn = i;

  if (boxn == 0) {
    agerrorf("in checkpath, all bounding boxes are below threshold\n");
    printpath(thepath);
    return 1;
  }
  ba = &boxes[0];
  ...
```

`printpath` (`:763-775`) is `fprintf(stderr, …)`: `"%zu boxes:\n"`, one
`"%zu (%.5g, %.5g), (%.5g, %.5g)\n"` per box `< pp->nbox`, then
`"start port: (%.5g, %.5g), tangent angle: %.5g, %s\n"` and the same for
`end port`. The last field is `constrained` or `not constrained`.

Before that, `adjustregularpath` (`lib/dotgen/dotsplines.c:1991-2006`) runs
`i` from `fb - 1` to `lb` over `P->boxes`, whatever `P->nbox` is. On the 277x
inputs `add_box` has dropped every box (`LL.y == UR.y ≈ 7.286e17`), so
`nbox == 0`, while `fb - 1 .. lb` is `0 .. 1`. Those slots are dead
([AD-1](../decisions.md#ad-1-widenpathboxes-skips-slots-at-or-past-pnbox)).

In the port:

- `widenPathBoxes`, `src/layout/dot/edge-route-faithful.ts:288-299`, reads
  `P.boxes[i].ll` on an empty array and throws.
- `checkPath`, `src/common/splines-routespl.ts:168-191`, has no `bn === 0`
  branch, and it would throw at `boxes[0].ll`.

## Task (TDD)

1. **Red (unit):** in `src/common/splines-routespl.test.ts`, add a
   `describe('checkPath rejects an all-degenerate path (#151)')` with
   `console.error` spied through `vi.spyOn(console, 'error')`, as
   `src/layout/dot/routing-failure-once.test.ts:71` does:
   - **empty path:** `nbox: 0`, `boxes: []`, start `(0, 7.286e17)` and end
     `(0, 7.286e17)`, both `theta 0` and unconstrained. `checkPath(0, [], pp)`
     returns `true`. The spy's calls, joined, are exactly these lines, which
     native 16.1.1 printed on `2773_1`
     ([harness/native-stderr.txt](../harness/native-stderr.txt)):
     ```
     Error: in checkpath, all bounding boxes are below threshold
     0 boxes:
     start port: (0, 7.286e+17), tangent angle: 0, not constrained
     end port: (0, 7.286e+17), tangent angle: 0, not constrained
     ```
   - **sub-threshold boxes:** two boxes, `(0,0)-(10,0.005)` and
     `(3,1)-(3.004,9)`, `nbox: 2`, start `(1.5, 2.25)` with `theta -π/2`,
     constrained. It returns `true`. The box lines are `0 (0, 0), (10, 0.005)`
     and `1 (3, 1), (3.004, 9)`. The start line ends `tangent angle: -1.5708,
     constrained`. `pp.nbox` stays 2, as C never writes the count back.

   Both cases fail on the base: the first throws, and the second prints nothing.
2. **Red (render):** create `src/layout/dot/degenerate-path-reject.test.ts`,
   with the SPDX header and a doc comment naming upstream 2773 and #151. Inline
   `~/git/graphviz-16.1.1/tests/2773_1.dot` (5 lines) as the source. Spy on
   `console.error` and `console.warn`, then call `renderSvg(src, 'dot')`. Assert:
   - no throw;
   - the captured lines equal native's 5 lines for `2773_1`, in order (the 4
     above, then `Error: lost 0 Se3ffa81011d69e3db000538bf02fa1d0 edge`);
   - the SVG has exactly 1 `<g id="edge`, as native's does.

   On the base it throws `Cannot read properties of undefined (reading 'll')`.
3. **Green:**
   - `widenPathBoxes`: add `if (i >= P.nbox) continue;` as the first statement of
     the loop, with a comment on why C's writes there are dead. Cite
     `dotsplines.c:338` (the preallocation) and the AD-1 audit in short.
   - `checkPath`: add the AD-2 branch right after `removeDegenerateBoxes`, and add
     the non-exported `printPath(pp: Path): void`, with
     `@see lib/common/routespl.c:printpath`. Import `gfmt5` from
     `../render/dot/xdot-ops.js`. Update `checkPath`'s doc comment to cite
     upstream 2773-2778.
4. Run `npx vitest run src/common src/layout/dot src/pathplan`. Every test must
   pass, the `checkPath keeps C's stale box count` block among them, unchanged.
5. Gates 1-6 (README), then the AD-3 follow-up issue, the journal, the #151
   comment, and the squash in the README.

## Write-set

- `src/layout/dot/edge-route-faithful.ts` (`widenPathBoxes` only)
- `src/common/splines-routespl.ts` (`checkPath`, a new `printPath`, one import)
- `src/common/splines-routespl.test.ts` (one new `describe` block, imports)
- `src/layout/dot/degenerate-path-reject.test.ts` (new)
- `plans/decision-journal.md` (one row),
  `plans/issue-151-degenerate-path-reject/decision-journal.md`, the batch table
  in this brief's README and `batch-1/overview.md`
- `.agent-notes/issue-151.md` (only if novel)

## Read-set

- `src/layout/dot/edge-route-faithful.ts:285-330`
- `src/common/splines-routespl.ts:1-30,80-100,160-195,407-420`
- `src/common/splines-routespl.test.ts:1-30,77-155`
- `src/render/dot/xdot-ops.ts:330-360` (`gfmt5`)
- `src/common/agerr.ts:1-20,185-190`
- `~/git/graphviz-16.1.1/lib/common/routespl.c:290-320,632-670,763-775`
- `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:330-340,1928-2021,2068-2094`
- `cd ~/git/graphviz-16.1.1 && git show 94719107c`

## Interface contracts

None. `checkPath(boxn, boxes, pp): boolean` keeps its signature, and `true` still
means failure. `printPath` is not exported.

## Acceptance criteria

- Given a path with `nbox` 0, when `checkPath` runs, then it returns `true` and
  prints native's 4 lines, in order, with no throw.
- Given a path whose boxes are all under 0.01 thick, when `checkPath` runs, then
  it prints every box at `%.5g`, returns `true`, and leaves `pp.nbox` unchanged.
- Given `2773_1`, when the port renders it with `-Tsvg`, then stderr equals native
  16.1.1's 5 lines and the SVG has the one edge native draws.
- Given the smoke list, when the base and head bundles are compared, then every
  job is identical.
- Given the 7 in-scope ids, when the head is compared with native, then svg,
  xdot, plain, cmapx and stderr are equal. Json differs only by #185/#199.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue151-head.mjs`. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked and
`npm run parser:regen`, and copy its bundle to `$TMPDIR/issue151-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue151-base.mjs $TMPDIR/issue151-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue151-bytediff.json
```

Expected: identical on every job. At planning,
[harness/detector.sh](../harness/detector.sh) saw no widening read past `nbox`
on the 49 smoke ids ([harness/detector-smoke.txt](../harness/detector-smoke.txt)).
A smoke id that reaches the new `checkPath` branch would have thrown on the base.

## Targeted survey

**How the ids were chosen:** the change is reachable only through a path whose
boxes all drop, at `add_box` (exactly zero area) or at `checkpath` (under 0.01).
The ids are:

- the 8 inputs that the #147/#148 classification lists for #151 (the 277x
  family, `2778` and `2780`);
- two controls that reach `checkPath`'s other failure handling: `1332`, whose
  lost edge is the stale-count corridor, and `2723`, which the ledger groups with
  `2778`.

**Base vs head:**

```
BD_ENGINES=dot BD_FORMATS=svg,xdot,plain,cmapx,json npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue151-base.mjs $TMPDIR/issue151-head.mjs \
  plans/issue-151-degenerate-path-reject/harness/survey-ids.txt $TMPDIR/issue151-survey.json
```

Expected, from the planning run: 50 jobs, identical 10 (`1332` and `2723`), and
diffs 40 (the 8 targets: base THROW, head output). No job capped.

**Head vs native:** for each of the 7 in-scope ids and each format, run
`GVBINDIR=/tmp/ghl1611 ~/git/graphviz-16.1.1/build/cmd/dot/dot -T<fmt>` and
`node test/tools/bd-job.ts $TMPDIR/issue151-head.mjs <file> dot <fmt>`. Split
bd-job's output at `--stderr--`, then compare:

| Format | Expected |
|---|---|
| svg | equal once the `<!-- Generated by … -->` comment is dropped and runs of spaces and newlines are squeezed (`tr -s ' \n' ' '`): the port wraps the `<svg` tag differently |
| xdot, plain, cmapx | equal, apart from bd-job's trailing newline |
| json | structurally equal, except `/name` (`%1`, #185) and, on `2778`/`2780`, a subgraph's `nodes` order (#199) |
| stderr | native's lines minus `syntax ambiguity` warnings, with pathplan's `lib/pathplan/<path>/shortest.c:NNN: ` prefix stripped |

Record the counts in the journal. `2776_1` is listed under AD-5, not compared.

## Observability

N/A for metrics. The new stderr lines are the C's own diagnostics (AD-2).

## Rollback

Reversible: revert the commit.
