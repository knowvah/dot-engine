# T1: carry the flat-adjacent aux rc to dotSplines_, tests, gates, squash

## Context

`make_flat_adj_edges` returns a failed aux mincross, position or splines rc,
and `dot_splines_` returns it, so the layout fails (AD-1..AD-4). The port
reads the failure as a decline and routes on.
[../harness/prototype.diff](../harness/prototype.diff) is the working
prototype. It meets every behaviour check below, but not the comments, the
tests or the budgets in step 2.

## Steps

1. **Red.** Write `src/layout/dot/splines-flat-adj-rc.test.ts`, following
   `src/layout/dot/flat-adj-record-warning.test.ts`: `parse` + `render`,
   stderr captured with `agseterrf` and reset in `afterEach`, sources and
   expected native text inline, with a provenance header naming the carried
   oracle and the capture date. Cases:
   - `p1`, `p4`, `p5`, `p9`, `p10` (`../harness/probes/`): `render(…, 'dot')`
     equals `../harness/native/<p>.dot` byte for byte.
   - The same five: stderr has exactly one `Error: Edge length ` line,
     followed by `Check for overwide node(s).\n`, and nothing else (no
     `triangulation failed`). Match the number with `[0-9.]+`, because #274
     will change it.
   - `p4`: the edge `c -> a`, which sorts after the failing group, has no
     spline (`e.info.spl` unset after `layout`/`render`). That is
     `dot_splines_`'s early return, as distinct from the fall-through.
   - Unit: `makeFlatAdjEdges` on `p1`'s flat group returns `-1`
     (`dotPosition`'s rc), not `1`, and installs no spline. Build it the way
     `src/layout/dot/splines-flat.branch.test.ts` builds its graphs, or
     through the pipeline up to position. Pick whichever needs fewer mocks
     (at most 2).
   - Control: `p3` renders byte-equal to `../harness/native/p3.dot`, with
     empty stderr.

   Run it on the base and journal the counts. Expect the `p1`/`p4`/`p5`/`p9`/
   `p10` render and stderr cases and the unit case to fail, and `p3` to pass.
2. **Green.** Apply AD-1..AD-4. The prototype is the reference. Add a
   `@see` comment where the shape is not obvious: in `routeFlatEdge` and
   `routeFaithfulSidePort` (the `null`/`0`/rc contract, AD-2, and
   `dotsplines.c:1535`), in `routeEdgeGroups` (`:418-424`), and in
   `dotSplines_`'s early return (`:418-424`, what it skips). Replace the stale
   `makeFlatAdjEdges` doc sentence "returns 0 on success" with the rc
   contract. **Budgets** (`~/.claude/hooks/check-complexity.py` blocks an
   edit that breaks them; lizard at `~/.claude/hooks/.venv/bin/lizard`):

   | Item | Base | Prototype | Must be |
   |---|---|---|---|
   | `splines.ts` lines | 546 | 547 | ≤ 546 |
   | `splines-flat.ts` lines | 561 | 564 | ≤ 561 |
   | `edge-route.ts` lines | 479 | 489 | ≤ 500 |
   | `routeFaithfulSidePort` CCN | 9 | 11 | ≤ 10 |
   | `dispatchEdgeGroup` NLOC | 28 | 31 | ≤ 30 |
   | `routeFlatEdge` CCN | 16 | 16 | ≤ 16 (already over; must not grow) |

   Suggested moves: lift the adjacent branch of `routeFaithfulSidePort` into
   a helper (say `routeFlatAdjGroup(e, g, run): number | null`); lift
   `dispatchEdgeGroup`'s flat branch into a helper returning the rc; trim
   comment lines in `dotSplines_` and around `makeFlatAdjEdges` to pay for
   the added code lines. Never drop a `@see` or a C reference to save a
   line.
3. **Existing tests.** Run `npm test`. Planning found none that pin the
   fall-through: the prototype passed unedited. A test that does pin it is
   push-forward: update it to native and journal it. Any other failure is a
   gate failure.
4. **Probes.** Preflight
   (`npx tsx plans/issue-187-flat-adj-rc/harness/preflight.ts`), build the
   bundles (see [Bytediff](#bytediff)), then from the repository root:

   ```
   H=plans/issue-187-flat-adj-rc/harness
   node $H/compare.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs \
     $(ls $H/probes/*.gv | sort -V) > $H/results/probes-head.tsv
   cmp $H/results/probes-planning.tsv $H/results/probes-head.tsv
   ```

   Pass: byte-identical. That means 36 rows, with `headEqNative` `yes` on
   every dot and xdot row except `p7` (#275) and `p8` (dot and xdot equal,
   stderr #276); every svg row 3 lines off native on each side; `headErrNum`
   `same` on all rows except `p8`'s.
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** a failed aux mincross or position in `makeFlatAdjEdges`
     came back as `1`, and `routeFaithfulSidePort` read any non-zero result
     as "declined". So `routeFlatEdge` tried other routers, and the group
     loop, with no result code, routed every later edge and the layout went
     on to postprocess. C returns the rc through `make_flat_edge` and
     `dot_splines_`, and the layout fails.
   - **Origin:** port `src/layout/dot/splines-flat.ts:367-371`,
     `src/layout/dot/edge-route.ts:376-377`,
     `src/layout/dot/splines-groups.ts:123,195-199`,
     `src/layout/dot/splines.ts:521-524` (base `98aa9373`). C
     `lib/dotgen/dotsplines.c:1211-1240`, `:1535-1536`, `:418-424`.
   - **Causal chain:** `p1`'s aux graph is laid out with its rank axis
     rotated. The `:s`/`:n` port offset is 2.88e9 pt, so `make_edge_pairs`'s
     aux edge exceeds `INT_MAX` (#162) and `dotPosition` returns -1.
     `makeFlatAdjEdges` returns 1, and `routeFaithfulSidePort` returns
     false. A later router fits a spline (`triangulation failed`) and
     `gvPostprocess` translates the layout, so `bb` and `pos` move and the
     edge gets a `pos` native lacks.
   - **Ruled out:** the main-graph position failure (`p2` fails in main
     `dot_position`, not the aux graph: base and head equal, both equal
     native); routes with no aux failure (`p3`, and the 90 reach jobs,
     identical); the `Edge length` number (#274: a separate `int`
     saturation in `make_edge_pairs`, masked by `headErrNum`); `p7`'s extra
     `pos` (#275: native omits it because `State < GVSPLINES`, while its svg
     draws the edge).
7. **Finish** (README, "Branch and commits").

## Write-set

- `src/layout/dot/splines-flat.ts` (`makeFlatAdjEdges`)
- `src/layout/dot/edge-route.ts` (`routeOneEdge`, `routeEdgeNonForward`,
  `routeFaithfulSidePort`, `routeFlatEdge`, `routeForwardEdge`,
  `routeLoneEdge`, new helpers)
- `src/layout/dot/splines-groups.ts` (`dispatchEdgeGroup`, `routeEdgeGroup`,
  `routeEdgeGroups`, new helper)
- `src/layout/dot/splines.ts` (`dotSplines_`)
- `src/layout/dot/splines-flat-adj-rc.test.ts` (new)
- any existing `*.test.ts` that pinned the fall-through (push-forward, journalled)
- `plans/issue-187-flat-adj-rc/harness/results/` and `harness/extra/`
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README
  and `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-187.md`, `.agent-notes/issue-137.md` (the rc
  observation)

## Read-set

- `src/layout/dot/splines-flat.ts:90-107,350-385`
- `src/layout/dot/edge-route.ts:170-200,240-280,355-479`
- `src/layout/dot/splines-groups.ts:90-199`
- `src/layout/dot/splines.ts:480-546`
- `src/layout/dot/index.ts:150-190` (callers already handle the rc)
- `src/layout/dot/flat-adj-record-warning.test.ts`,
  `src/layout/dot/splines-flat.branch.test.ts:1-60,395-420`
- `~/git/graphviz-16.1.1/lib/dotgen/dotsplines.c:228-487,1130-1240,1505-1540`

## Interface contracts

No public interface changes; every touched function is internal to
`src/layout/dot/`.

- `routeOneEdge(e, g, run): number` and `routeLoneEdge(e, g, run): number`:
  `0`, or C's non-zero rc.
- `routeFlatEdge`, `routeFaithfulSidePort`: `number | null` (AD-2).
- `routeEdgeGroups(g, edges, multisep, et): { rc: number; runOrigs: Set<Edge> }`.
- `makeFlatAdjEdges(...)`: `0`, or the first non-zero of aux
  `dotMincross`, `dotPosition`, `dotSplines_`.

`routeOneEdge` is called directly by `edge-route-splines.test.ts`. Its return
value is ignored there, which still typechecks.

## Bytediff

This is queue gate 5. Build the base bundle from `git archive 98aa9373` in
`$TMPDIR`: symlink `node_modules`, run `npm run parser:regen` and
`npm run build:js`, and copy `dist/index.js` to `base.mjs`. Build the head
bundle from the working tree (`npm run build:js`, copy to `head.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i187-smoke.json
```

**Expect** every job identical and 0 diffs: no smoke id fails an aux layout.
A capped job means load, so re-run it alone. Any diff is stop 3.

## Targeted survey

**Selection rule.** Output can change only where `makeFlatAdjEdges` runs,
since every other path returns `0` as before. #137's marker survey found
every corpus and golden input that calls it: 10 inputs, 27 calls, all
successful. #137's 8 labelled fixtures add the labelled aux case. Gate 6 has
two parts:

1. **Reach** (base against head, all must be identical):

   ```
   H=plans/issue-187-flat-adj-rc/harness
   npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
     $H/reach-ids.txt $TMPDIR/i187-reach.json
   for f in test/golden/inputs/c90-dot-flat-adj-both-arrows.dot $H/fixtures/f*.gv; do
     BD_ENGINES=dot npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs \
       $TMPDIR/head.mjs --file $f $TMPDIR/i187-$(basename $f).json
   done
   ```

   Pass: 45 + 9 × 5 = 90 jobs, 90 identical (as at planning).
2. **Probes** against native: step 4's TSV equals planning's.

Why these probes: [../harness/survey.md](../harness/survey.md).

## Observability / rollback

Observability: N/A. This is a library with no logs, metrics or traces;
native's stderr text is the only signal, and it is unchanged. Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

1. **Given** `p1`, **when** rendered `-Tdot`, **then** the output equals
   native's byte for byte (no `pos` on `a:s -> b:n`, `bb="-27,0,99,2.88e+09"`),
   and stderr is the one `Edge length` error with no `triangulation failed`.
2. **Given** `p4`, **when** laid out, **then** `c -> a`, which sorts after
   the failing group, gets no spline, and the `-Tdot` output equals native's.
3. **Given** `p5` (`dir=back`), `p9` (undirected) and `p10`
   (`compound=true`, cluster), **when** rendered `-Tdot`, **then** each
   equals native's.
4. **Given** the 10 reach inputs and the 8 fixtures, **when** bytediffed base
   against head, **then** 90 of 90 jobs are identical, and the smoke bytediff
   shows 0 diffs.
5. **Given** the four touched source files, **when** measured, **then** every
   budget in step 2 holds and gates 1-4 pass.
