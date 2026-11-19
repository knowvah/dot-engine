# Survey design: issue #242

## Probes

| Probe | What it pins | Path |
|---|---|---|
| `repro` | the issue's input: root `ordering=out`, cluster reads it | AD-1, `orderedEdges` on a cluster |
| `late` | `ordering=out` set after the cluster opens: not inherited | open-time snapshot (order rule) |
| `nested` | a cluster inside a cluster, both inherit | snapshot through a seeded parent |
| `local-off` | `ordering=""` in the cluster overrides the root | body wins over the seed |
| `rankset` | root `rank=same`: a plain subgraph inherits it and is a rank set | a non-label key read by dot's rank sets |
| `refed-bb` | root input `bb`/`lp`/`lwidth`/`lheight` and an unboxed `{rank=same}` | AD-2, `echoGraphAttr` must not echo seeded |
| `render-attrs` | root `bgcolor`, `style`, `color`, `penwidth`, `peripheries`; one cluster with its own `pencolor` | render reads on clusters |
| `pack` | #183's pack projection probe | seeded values survive `projectOne` |
| `reopen` | root `ordering=out` between two bodies of one cluster | #258's first-open rule with a non-label key |

`compare.mjs` runs each probe under all 8 engines as dot, xdot and svg (216
rows). At planning ([results/probes-planning.tsv](results/probes-planning.tsv)):
every dot and xdot row equals native on the head except `rankset` and
`reopen` under sfdp, which are equal on base and head (`headEqBase` yes);
every svg row is on the port's 3-line generator-header floor (or, for those
two sfdp rows, equal to base). Rows that move: `repro`, `nested`, `rankset`
under dot (dot, xdot, svg), all to native.

json is not in the probe TSV: the port's json is not formatted as native's,
so a line count misleads (#183's notes). json is covered by the unit suite
(the 19 cases AD-2 restores) and by the reach bytediff, whose json diffs are
judged with `test/golden/compare-json.ts`.

## Reach selection

`manifest-reach.mjs` parses every applicable manifest input with the base and
head bundles and lists the ids whose graph-attribute model (each graph's
`attrs` and `seededAttrs`, recursively) differs. The change alters output only
through what a subgraph's `attrs` holds, so an id with an equal model cannot
change. 227 of 982 ids differ ([results/reach-planning.txt](results/reach-planning.txt));
the most common newly seeded keys are `rankdir` (107 inputs), `size`,
`ranksep`, `splines`, `compound`, `bb`, `nodesep`, `style`, `bgcolor`,
`ratio`, `page`, `concentrate`, `ordering`, `packmode`.

## Reach bytediff

`test/tools/bytediff.ts` base against head over the 227 ids, 8 engines, 5
formats. At planning the 225 ids other than `2475_1`/`2475_2` ran (9000 jobs):
8952 identical, 8 diffs (`1472` under dot and `2242` under fdp, all 5 formats
but `cmapx`), 40 capped on both sides (`2621` TIMEOUT under circo, dot, fdp;
`2781_1` OOM under circo, fdp, neato, sfdp, twopi). The diff keys and the native
verdict of each are in [results/reach-bd-planning.txt](results/reach-bd-planning.txt).

`2475_1` and `2475_2` (9.7 MB and 0.6 MB; each job about 2 minutes per side)
did not run at planning. They seed only `rankdir=BT` into anonymous clusters,
and `rankdir` is read only on the root (`src/common/graph-init.ts:308`);
[extra/2475-shape.gv](extra/2475-shape.gv), the same shape in 6 nodes, is 40 of
40 jobs identical. The executor runs them (T1, targeted survey).

`1472` is judged by its UTF-8 control [extra/1472-utf8.gv](extra/1472-utf8.gv):
its remaining difference from native is #207's width gap on 0x80-0x9F bytes,
and with those bytes converted the head equals native in plain, xdot and dot.

## Smoke expectation

13 smoke ids are in the reach (`1896`, `2592`, `2717`, `graphs-b145`,
`graphs-compound`, `graphs-grdshapes`, `graphs-shells`, `graphs-style`,
`linux.x86-pack_neato1`, `linux.x86-pack_neato2`, `nshare-pack_neato1`,
`nshare-pack_neato2`, `tree-doc-neato-inet`); the reach bytediff found no diff
on any of them, and an id outside the reach cannot change. Gate 5 expects
every smoke job identical, 0 diffs.
