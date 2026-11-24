# Survey: what the change reaches, and how it was chosen

## Reach

The change is one argument in `writePlain` (`src/render/map.ts`): the pad
handed to `jobViewport` becomes `job.pad`, not `{ x: 0, y: 0 }`. Only plain and
plain-ext call `writePlain`, on every engine. `job.pad` there is `pad=` or the
plain renderers' `defaultPad` of 0 (`src/gvc/device.ts:455`). So the output
can change only when:

1. the graph sets `pad=` (parsed to a non-zero value), and
2. the zoom depends on the pad: `size=` is set and the padded drawing is
   bigger than it (or smaller in both axes with `size="...!"`), or the bb is
   empty (sz ≤ 0.001 takes the size, but the pad makes sz non-zero).

`viewport=` with a Z overrides the zoom, so `pad=` does not reach it
(`viewport-pad` probe). Only the `graph` line changes; node and edge lines
print layout coords.

## Probes

`probes/*.gv`, 16 inputs, run by `probe.ts` under the 8 engines × plain,
plain-ext (stdout and stderr). Chosen by the branches of `init_job_viewport`'s
fit and `parseGraphPad`'s forms:

- Pad changes Z: `repro` (the issue's), `pad-xy` (`"x,y"` form),
  `pad-pushes-over` (fits without pad, not with it), `pad-negative`, `filled`
  (`size="10,10!"`), `empty` (sz ≤ 0.001), `landscape` (`rotate=90`),
  `clusters`.
- Pad does not change Z: `pad-zero`, `pad-no-size`, `size-no-pad`,
  `pad-size-fits`, `filled-no-pad`, `empty-no-pad`, `viewport-pad`,
  `pad-junk` (`pad=abc`, unparsed, so the default 0).

Planning, base `25b341d3` against the prototype: base 132/256 equal native,
prototype 256/256; no row moves away (`results/probe-prototype.tsv`,
`.tally`). The test (`src/render/plain-pad.test.ts` in `prototype.diff`)
pins the probes under dot and neato against `native/`.

## Corpus (gate 6)

Chosen by attribute: the applicable manifest ids whose file sets `pad`
(regex `(?<![A-Za-z_])"?pad"?\s*=` on the file text). Three ids: `1879`,
`2082`, `2592`. Only `1879` also sets `size` (`survey-ids.tsv`), so only it
can move. All three run under the 8 engines × plain, plain-ext with
`probe.ts` against a directory of symlinks to the corpus files
(`results/survey.tsv`):

- `1879` × dot: base `out`, prototype `eq`. The graph line goes from
  `graph 0.43259` to native's `graph 0.42766`; every other line already
  equalled native. `plain-parity-dot.json` records it as a pass because the
  delta (0.005) is inside the 0.01 tolerance: a toward-native change.
- `1879` × fdp: `out` on both. The port throws `splines=compound ... is not
  supported yet` (unchanged).
- `1879` × sfdp: `out` on both, 905 differing lines, an accepted A1 layout
  divergence (`attribution-sfdp.json`). The graph line is `graph 1` on base,
  head and native (the drawing fits the size), so the change does not reach
  it.
- `1879` × neato, circo, twopi, osage: `err` on both (stderr only, the
  missing `1879.png` image and engine warnings, unchanged).
- `2082`, `2592`: no `size`, identical rows on both bundles.

`2592` is the one pad id on the smoke list; the smoke bytediff ran it.

## Re-running

```
mkdir -p $TMPDIR/i198/survey
# symlink <id>.gv -> the corpus file for 1879, 2082, 2592
#   (paths: test/corpus/corpus-manifest.json, under ~/git/graphviz-16.1.1/tests)
ENGINES=dot,neato,fdp,sfdp,circo,twopi,osage,patchwork \
  npx tsx plans/issue-198-plain-pad/harness/probe.ts $TMPDIR/i198/survey \
  $TMPDIR/i198/base.mjs $TMPDIR/i198/head.mjs > .../results/survey-head.tsv
```

Run `probe.ts` from inside `harness/` or with paths as above; it resolves the
oracle from `test/corpus/oracle-paths.mjs`.
