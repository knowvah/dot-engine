# Survey design: issue #190

## What can change

The fix changes behaviour only when `initNodeFromLabel` meets a node that
already has `n.info.label`. On a fresh record (first layout, or any layout
after `freeLayout`) the label is undefined, so the old and new code do the
same thing. Two kinds of input remain:

1. **No-free relayouts** (`ctx.layout` twice on one graph with no free). This
   is the issue. The [cases.txt](cases.txt) matrix covers it against the
   carried oracle, through [relabel.c](relabel.c) (native, one libgvc process)
   and [probe.ts](probe.ts) (port).
2. **A second `commonInitNode` on the same node within one layout.** C has none
   (`common_init_node` runs once per node per layout in every `doDot` branch,
   `lib/dotgen/dotinit.c:399-470`; neato, fdp, sfdp, circo, twopi, osage and
   patchwork run their init once). The [marker](marker.patch) prints
   `ISSUE190_REMAKE` whenever the layout-time maker meets an existing label.

## Reach set for single layouts ([reach-ids.txt](reach-ids.txt), 40 ids)

Chosen by attribute: the paths where a re-entry could hide are dot's pack
branches (components laid out per subgraph), HTML labels (warnings are
label-time), and node xlabels (made beside the label). The ids came from grepping
the corpus inputs (`test/corpus/corpus-manifest.json`, the pristine tree's `tests/`):

- `pack`/`packmode` set: 18 ids.
- `FIXEDSIZE` or `<IMG` in an HTML label: 21 ids.
- `xlabel`: 5 ids.

Ids that fall under more than one heading are listed once. Each runs on all 8 engines.
The planning marker run had 320 jobs, 0 remakes and 0 capped
([results/marker-planning.tsv](results/marker-planning.tsv)). Gate 6 also
compares base with head on these ids in plain and xdot.

## Matrix results at planning

| Run | Identical to native | Not identical |
|---|---|---|
| base `67f46a36` ([results/native-planning-base.tsv](results/native-planning-base.tsv)) | 18/46 | every relabel row except the record rows; the html stderr counts (native 6/9, port 2/3) |
| prototype ([results/native-planning-prototype.tsv](results/native-planning-prototype.tsv)) | 41/46 | fdp × 3 (stderr only, #256), nonascii × 2 (stderr only, AD-3) |

SVG rows are compared from `<g id="graph0">` on, because the prologue differs
by design (generator comment, line wrapping).

## Positive control

The marker fires on no-free relayouts: `relabel` under dot gives 2 lines (one
relayout, 2 nodes), and osage `warn3` gives 4.
