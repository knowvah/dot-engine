# Survey: what the change reaches, and how it was chosen

## Reach

The change runs in `render`'s job setup and the emit walk, which every
engine and every format shares:

1. `viewport=` (new). It is reached only by an input that sets it. No
   applicable corpus input does: `graphs-viewport` is `graphs/viewport.gv`,
   whose file has no `viewport`. The C suite sets it with `-G` (tests.txt),
   and the `rtest-*` probes port that. So the probes are the only evidence
   that this half moves output.
2. The default path's arithmetic. sz is now `(UR + pad) - (LL - pad)`, where
   the base wrote `UR - LL + 2 * pad`, in the `size=` fit's Z. The SVG page
   extent is now `view × dpi / 72`, where the base had `sz × (Z × dpi / 72)`.
   Reached by any `size=`, `dpi`/`resolution`, `pad` or landscape input. The
   last-bit difference can move a ROUND only at a .5 boundary.
3. `edge_in_box` in the walk. An edge outside the clip no longer reaches
   `renderEdge`. That changes map `<area>`s and edge warnings for every
   format, and nothing in svg or xdot, which tested the gate already. With no
   viewport the clip holds every routed edge, except when a layout fails
   (`2784`, `2825`: the clip is degenerate) or a concentrated edge keeps a
   stale off-box label (`dot.ts:191-195`).

## Probes

`probes/*.gv`, 34 inputs, matrix in `probe.ts`. Chosen by form and
interaction:

- **Every parse form.** `focus-xy`, `focus-node`, `focus-quoted`,
  `unclosed-quote`, `empty-quotes`, `focus-missing-node`, `four-numbers`,
  `name-then-number`, `wh-only`, `whz`, `trailing`, `spaces`,
  `space-before-comma`, `hex-float`, `empty`, `garbage`.
- **Z and the view's size.** `zoom2`, `bigger`, `neg-focus`.
- **Each neighbour of the formula.** `size=` (`with-size`, `with-size-z`),
  `pad=`, `margin=`, `dpi=`, landscape (`landscape`), `layers`.
- **Emit gates.** `clusters` (clusters are not clip-gated), `edge-label`,
  `urls` (cmapx areas), `edge-color-warn` (warnings of an out-of-view edge).
- **Undirected node focus.** `undirected-node-focus`.
- **Upstream.** `rtest-viewport-*`: tests.txt's three `viewport` cases.

Commands (each after `uptime` ≤ 12):

```
H=plans/issue-197-viewport/harness
npx tsx $H/probe.ts $H/probes <base.mjs> <head.mjs> > $H/results/probe-head.tsv 2> $H/results/probe-head.tally
ENGINES=neato ONLY=rtest-viewport-300_300,rtest-viewport-300_300_1_200_620,rtest-viewport-300_300_2_200_620 \
  npx tsx $H/probe.ts $H/probes <base.mjs> <head.mjs> > $H/results/probe-head-rtest-neato.tsv 2> $H/results/probe-head-rtest-neato.tally
ENGINES=neato,fdp,circo,twopi,osage,patchwork,sfdp ONLY=focus-node,focus-xy,wh-only,zoom2,clusters,urls,edge-label,landscape \
  npx tsx $H/probe.ts $H/probes <base.mjs> <head.mjs> > $H/results/probe-head-other-engines.tsv 2> $H/results/probe-head-other-engines.tally
```

Planning results, base `fa380cee` against the prototype
(`results/probe-prototype*.tsv`, `.tally`):

| Matrix | Rows | Base equal native | Prototype equal native |
|---|---|---|---|
| dot, 34 probes × svg, xdot, json, cmapx, plain | 170 | 66 | 170 |
| neato, 3 `rtest-*` × 5 formats | 15 | 5 | 15 |
| 7 other engines, 8 probes × 5 formats | 280 | 98 | 280 |

No row moves from equal to different.

## Corpus (gate 6)

`survey-reach-ids.txt` has 199 ids, every one with manifest status
`applicable`, under the manifest's engine (dot). `survey-reach-scan.tsv`
records why each id is there:

- **Reach (2):** an input that sets `size=` (135 ids), `dpi=`/`resolution=`
  (6), `pad=` (3), or `rotate=`/`landscape=`/`orientation=` (27).
- **Reach (3):** an input with `URL=`/`href=` (41, so cmapx has areas to
  lose), `concentrate=true` (19), and `2784` and `2825` (failed layouts).

Engines: dot only. The changed code is downstream of layout, and the engine
only sets the bb and splines it reads. The smoke list runs all 8 engines
(gate 5), and the probe matrix samples 7 more.

```
BD_CAP_MS=300000 npx tsx test/tools/bytediff.ts <base.mjs> <head.mjs> \
  plans/issue-197-viewport/harness/survey-reach-ids.txt <reach.json>
```

Formats: bytediff's default (svg, xdot, json, plain, cmapx), 995 jobs.

Results: journal row 3 (planning: 995 jobs, 985 identical, 0 diffs, 10 capped,
`1652` and `2621` × 5 formats, TIMEOUT on both bundles).
