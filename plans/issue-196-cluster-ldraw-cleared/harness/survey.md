# Survey: what the change reaches, and how it was chosen

## Reach

The change runs in the xdot writer (`-Txdot`, the inner xdot render of
`-Tjson`) and in the shared agwrite serializer (`-Tdot` too):

1. `endCluster`/`endGraph` record `''` for a labelled cluster or root whose
   label buffer is empty. A drawn label records what it recorded before.
   Reached by: an invisible labelled cluster (`style=invis`, inherited too), a
   label whose spans draw nothing (`"\n"`, `" "`), and a later render after
   the cluster was hidden.
2. `renderedDraws`' `??` changes only an object with a recorded `''`, which
   (1) alone produces.
3. The serializer prints a root's own `_ldraw_=""` and a cluster's held empty
   value, under `clusterLdraw`'s rule. Reached by (1), and by an input that
   stores `_ldraw_=""` on the root or a cluster (`-Tdot` too).

Engines: every engine that emits clusters (dot, fdp, osage) for (1); every
engine for a root label. svg, plain and the map formats do not read draw
strings.

## Probes (`probes/`, matrix in `probe.ts`)

Chosen by path: #140's open fixtures (`ldraw-cleared`, `ldraw-newline`,
`ldraw-fresh`, and `hide-cluster` in the unit test); #140's controls, which
must stay equal (`empty-buffer`, `stored-input`); the serializer rule's cases:
nested invisible clusters (`nested-invis`), a root that draws its label over
nested hidden clusters (`root-drawn-nested`), a root's own empty value with
direct (`root-empty-cluster`) and nested (`deep-root-empty`) clusters, plain
subgraph parents holding `""` and a string (`plain-parent`), an inherited
label (`inherited-label`); stored empty values (`root-empty-stored`,
`cluster-empty-stored`); a `" "` label hidden and drawn (`space-label`).

Added at execution (the `print` flag, decisions.md "Execution amendment"): a
root `"\n"` label whose body never declares `_ldraw_`, alone (`root-nl-only`),
over a `"\n"` cluster (`root-nl-fresh`), over nested clusters that inherit the
label (`root-fresh-nested`), and over a cluster that declares `_ldraw_` first
(`root-nl-cluster-decl`); the `graph [_ldraw_=""]` statement form
(`root-graph-stmt`); and the two-render `hide-root-nl` in the unit test (the
root's written-back empty value must still not print). `oos-pinned-ldraw`
(#305) is out of scope: its `-Tdot` rows differ on base and head alike.
`oos-html-empty-label` became `html-empty-label` when #292 was fixed here,
with `html-empty-root` (`label=<>` on the root) and `html-empty-fresh` (a
`label=<>` cluster with no stored string). Execution results, 22 in-scope
probes: `results/probe-head.tsv` (dot, fdp, osage), 264 rows, base 138 equal
to native, head 258; `results/probe-head-other-engines.tsv` (neato, twopi,
circo, sfdp, patchwork), 440 rows, base 348, head 436. The rows left are
#293's, unmoved: the `-Tdot` rows of `plain-parent` and `root-drawn-nested`,
and their `-Txdot` rows under patchwork. No row moves away from native.

The paragraph below is planning's; `oos-html-empty-label` no longer exists.

Out of scope, reported but not counted: `oos-html-empty-label` (#292) and
`oos-seeded-ldraw` (#293). Each differs on base and prototype for a reason in
decisions.md AD-3. `oos-html-empty-label`'s xdot and json rows move one line
away from native on the prototype (decisions.md AD-1 consequences).

Planning results (`results/probe-prototype.tsv`, engines dot, fdp, osage ×
formats dot, xdot, json, svg): 168 in-scope rows, base 96 equal to native,
prototype 162. The 6 left are the `-Tdot` rows of `plain-parent` and
`root-drawn-nested` (#293), unmoved.

## Corpus (gate 6)

Two id files, every manifest id with status `applicable`, one id per input
file:

- `survey-reach-ids.txt` (28 ids, `dot,fdp,osage`): an input that holds
  `_ldraw_`, or `cluster` with `invis`, or `label="\n"`, or `cluster` with
  `label=""`. These are the inputs that can reach (1) or (3).
  `tree-share-examples-world` (16 MB) is left out: it times out on both
  bundles at 300 s (#195 journal rows 3-4), and the change cannot reach it:
  it has no subgraph and no graph label (`cluster` and `invis` appear only in
  host names).
- `survey-control-ids.txt` (230 ids, `dot`): the other inputs with `cluster`
  and `label`. A labelled cluster whose label draws text must not change.

Commands (after the smoke run, load ≤ 12):

```
BD_FORMATS=xdot,json,dot,svg BD_CAP_MS=300000 \
  npx tsx test/tools/bytediff.ts <base.mjs> <head.mjs> \
  plans/issue-196-cluster-ldraw-cleared/harness/survey-reach-ids.txt <reach.json>
BD_FORMATS=xdot,json BD_CAP_MS=300000 \
  npx tsx test/tools/bytediff.ts <base.mjs> <head.mjs> \
  plans/issue-196-cluster-ldraw-cleared/harness/survey-control-ids.txt <control.json>
```

Results (0 diffs; the capped jobs and why they cannot reach the change): journal row 3.
