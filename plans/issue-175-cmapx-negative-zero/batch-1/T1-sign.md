# T1: red tests, C's transform and %.0f, gates, squash

## Context

The port's map coordinates lose native's `-0` in two places
([README](../README.md#objective)). `mapTransform` (`src/gvc/anchor.ts:254`)
computes `+0` at the page top, where C's `gvrender_ptf_A` computes `-0.0`. The
coordinate formatters in `src/render/map.ts:470-532` print with
`Math.round`/`String`, which drop the sign and round ties up. T1 ports the
transform's form (AD-1) and C's `%.0f` (AD-2).

## Steps

1. **Red.** Add `src/render/map-coords-sign.test.ts` (AD-4):
   - Unit: `printfFixed0` gives `-0` for `-0`, `-0.3` and `-0.5`; `0` for `0.5`;
     `2` for `1.5` and `2.5`; `-2` for `-2.5`. `cmapxCoordsRect` on points
     `{0,58.666…},{82.666…,-0}` gives `0,-0,83,59`. `cmapxCoordsCircle` and
     `cmapxCoordsPoly` each print a `-0` and a tie. `mapOutputImap` prints `-0`
     in its rect, circle and poly lines. `mapTransform` with a
     `buildMapCtx`-shaped context maps the graph area's upper-right corner to
     a y with `Object.is(y, -0)`.
   - Probes: inline `repro`, `dpi72`, `glabel`, `pad0`, `pinned`, `size` and
     `margin` from `../harness/probes/`, and native's stdout from
     `../harness/native/<probe>.gv.<engine>.<fmt>`, with a provenance comment
     (native 16.1.1, `-K<engine> -T<fmt>`, plugin dir, captured 2026-11-17).
     One case per probe × engine (dot, neato, fdp) × format (`cmapx`,
     `cmapx-np`, `imap`, `imap-np`; native spells them `_np`), expecting
     byte equality. Leave out `glabel`/fdp only if it is not byte-equal on the
     base. It was at planning, so keep it. Leave out `nodes`, `labels72` and
     `rotate` (#177, #247), with a comment.
   Run on the base: the `-0` cases fail, `margin` and the rows that were already
   byte-equal pass. Journal the counts.
2. **Green, the value (AD-1).** Change `MapCtx` to
   `{ bb, pad, translation, scale: Point, mapPolygon }`. Rewrite
   `mapTransform` as `applyScale(p, ctx.translation.x, ctx.translation.y,
   ctx.scale.x, ctx.scale.y)` and rewrite its doc comment (C form, the `clip`
   and `canvasBox.LL` stand-ins, no rotation: #247). Fill `buildMapCtx` as
   AD-1 says. Update the `MapCtx` fixtures and the `mapTransform` and
   `buildMapCtx` expectations in `src/render/map-renderers.test.ts` and
   `src/gvc/anchor.branch.test.ts` to the new shape, keeping each test's
   intent. `src/render/map.branch.test.ts` reads `ctx.scale` at lines 471 and
   480; change those reads to `ctx.scale.x` (and `ctx.scale.y` negative) with
   no net line growth. Vitest's `toEqual` compares numbers with `Object.is`,
   so an existing expectation of `0` at the page top now meets `-0`. Change
   such an expectation to `-0` only when C gives `-0.0` there (y at the top
   edge). Any other changed expectation is stop condition 6.
3. **Green, the text (AD-2).** Add `printfFixed0` to
   `src/util/printf-round.ts`. Use it in `cmapxCoordsRect`,
   `cmapxCoordsCircle`, `cmapxCoordsPoly` and `mapOutputImap`. Update the
   comments that say `Math.round`. Run the new and the touched tests; all pass.
   `wc -l src/render/map.ts src/gvc/anchor.ts`: at most 806 and 519 (stop
   condition 2).
4. **Check every probe.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js`). From the brief directory run
   `node harness/compare.mjs <base.mjs> <head.mjs> harness/probes/*.gv`.
   Pass: every row that was `DIFF` on the base only through `-0` lines is
   `same` on the head. `nodes` and `labels72` keep only the `edgeN-label` id
   lines (#177). `rotate` keeps its #247 lines; its `head` count may change
   only by lines that now equal native. No row that was `same` on the base is
   `DIFF` on the head. Journal the table.
5. **Comparator comment (AD-3).** Correct the header of
   `test/golden/compare-map.ts` (lines 11-21) to say the port prints with
   C's `%.0f` (`printfFixed0`). Comment only.
6. **Gates 1-6** (README). Record each in the journal.
7. **Diagnosis row.** Journal the artifact. Mechanism (both halves), origin
   (C `gvrender.c:154-175`, `emit.c:1550-1552`, `emit.c:3631-3633`,
   `gvrender_core_map.c:map_output_shape`; port `anchor.ts:254-259` and
   `map.ts:470-532` on the base), causal chain, and ruled out: the x bits (equal
   to native, `0x4054aaaaaaaaaaaa`); a formatter-only cause (the port's value is
   `+0`, `harness/trace-port.ts`); a layout cause (every other line of each
   probe is byte-equal); `margin.gv` (byte-equal on the base, because the
   margin moves the top off zero).
8. **Finish** (README, "Branch and commits"): tag, soft reset, one commit.

## Write-set

- `src/gvc/anchor.ts` (`MapCtx`, `mapTransform`, doc comments; no net growth)
- `src/render/map.ts` (`buildMapCtx`, the four coordinate writers, comments; no
  net growth)
- `src/util/printf-round.ts` (`printfFixed0`)
- `src/render/map-coords-sign.test.ts` (new)
- `src/render/map-renderers.test.ts`, `src/gvc/anchor.branch.test.ts`,
  `src/render/map.branch.test.ts` (the `MapCtx` shape only; no net growth in
  the last)
- `src/util/printf-round.test.ts` (only if `printfFixed0` cases fit better
  there; under 500 lines)
- `test/golden/compare-map.ts` (header comment only)
- `plans/issue-175-cmapx-negative-zero/harness/extra/` (new probes, only if
  push-forward needs them)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and the summary)
- `.agent-notes/issue-175.md` (only if novel)

## Interface contracts

- `printfFixed0(v: number): string`: C's `printf("%.0f", v)`. Equal to
  `printfFixed(v, 0)` except `printfFixed0(-0) === '-0'`. Non-finite values
  print as `printfFixed` prints them.
- `interface MapCtx { bb: Box; pad: Point; translation: Point; scale: Point;
  mapPolygon: boolean }`. `scale.y < 0` (Y goes down). Internal; producers:
  `buildMapCtx` and test fixtures. Consumers: `mapTransform` and the
  `compute*UrlMap` functions, which read `bb` and `pad` as before.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive <base>` in
`$TMPDIR` (`npm ci` or symlinked `node_modules`, `npm run parser:regen`,
`npm run build:js`, then copy `dist/index.js` to `base.mjs`). Build the head
bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i175-smoke.json
```

The default formats include `cmapx`. Pass: every changed output equals native,
or meets one of the queue rules' exceptions (list those rows). A smoke id
without an anchor has no area and cannot change. Any other change is stop
condition 3.

## Targeted survey

**Selection rule.** A coordinate reaches the changed code only through
`map_output_shape`, and only an object with `URL`, `href` or `tooltip` gets an
area. So: every corpus input that sets one of them
([../harness/survey-ids.txt](../harness/survey-ids.txt), 41 files) under dot,
and the 18 under 60 kB ([../harness/survey-small.txt](../harness/survey-small.txt))
under neato and fdp, in all four formats:

```
C=~/git/graphviz-16.1.1/tests
ENGINES=dot node harness/compare.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-ids.txt)
ENGINES=neato,fdp node harness/compare.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-small.txt)
```

Wait while `uptime` is above 12. A file whose native run times out (120 s)
is listed, not counted.

**Pass:** no row `same` on the base is `DIFF` on the head. For every row whose
`head` count differs from `base`, the changed lines equal native's. List the
rows that move to `same` (expected: `1880.dot`). List the rows still `DIFF`
with their cause (expected: `2258.dot`, #176) as toward-native changes, with
the diff-line counts on base and head. Journal the table.

## Observability / rollback

Observability: N/A (library: no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then every `-0` probe case
  and the `-0`/tie unit cases fail, and the cases already byte-equal pass.
- Given the fix, when `repro.gv` renders as `cmapx` under dot, then the graph
  area is exactly `<area shape="rect" id="graph0" href="x" alt=""
  coords="0,-0,83,59"/>`.
- Given the fix, when `pad0.gv` renders as `imap` under neato, then the output
  equals `harness/native/pad0.gv.neato.imap` byte for byte (node poly
  `36,-0`, cluster `rect c 0,-0 72,48`).
- Given the fix, when `compare.mjs` runs over the ten probes, then no row
  regresses and only `nodes`, `labels72` and `rotate` stay `DIFF`, through
  #177 and #247 lines only.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says. The finished log has exactly one commit after the base, with
  footer `Refs: #175`, and tag `issue-175/pre-squash` holds the per-task
  history.
