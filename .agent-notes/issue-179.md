# issue #179: a cluster's map area after its label's areas

## Observation: native fdp gives two outputs run to run on a 5-node, two-cluster input
- **Context**: extra probes `plans/issue-179-cmapx-cluster-area-order/harness/extra/{layers,rounded}.gv` (two top-level clusters, each with one node, plus `a -> c; a -> d`) under `-Kfdp`, graphviz 16.1.1.
- **Finding**: ten native runs of one command give two outputs, split between 5/5 and 9/1. The second cluster's coords move by one unit (`200,7,294,125` against `201,7,295,126` in cmapx; `-Tdot` shows a cluster `bb` starting at `3.9968e-15`). The port's output equals one of the two. `harness/rowcheck.mjs` takes one native sample, so the same row comes out `native` or `AWAY` by chance.
- **Impact**: `.agent-notes/gv16-triage.md` lists run-to-run fdp layouts for large corpus inputs (1879, 2621). It also happens on tiny cluster inputs. Before reading an fdp `AWAY` row as a regression, run native several times and compare the head with each distinct output (md5).
- **Confidence**: High (80 native runs, eight rows)

## Observation: `rowcheck.mjs` can say `AWAY` for a pure reorder toward native
- **Context**: extra probes `deep.gv` and `target.gv`; the head has native's line order and differs only in cell lines that #253 owns.
- **Finding**: the verdict compares base and head by LCS. When a change moves lines, the LCS may keep the native lines paired and count the one non-native line (here the #253 cell line, same text on base and head) as "added over base". That line is not in native, so the verdict is `AWAY`. The `tooltip` probe has the same shape and comes out `toward`, because there the LCS moves the native line.
- **Impact**: an `AWAY` row with a smaller `headDiff` than `baseDiff` needs a `diff` against native on both bundles. Masking the known-different attribute (` title="..."`, ` target="..."`) and comparing with `cmp` settles it.
- **Confidence**: High

## Observation: the map renderer takes a cluster's hot spot only at the anchor
- **Context**: removing `MapRendererBase.beginCluster` (AD-2).
- **Finding**: from #179 on, a cluster obj's `urlMapPts` is written only by `emitMapRect`, called from `beginClusterAnchor` (`src/gvc/device-cluster.ts`) when the cluster has a url or an explicit tooltip. An unanchored cluster's obj holds no map points, as in C (`map_begin_cluster` is `0`). 285 corpus inputs with clusters are unchanged under dot `-Tcmapx`.
- **Impact**: code that needs a cluster's rect on the map device must not read `job.obj.urlMapPts` outside an anchor.
- **Confidence**: High

## Observation: `2621.dot` costs more than 14 minutes per port render under dot
- **Context**: gate 6, set A. Native dot hits the 120 s cap on it in every format; native osage answers in under a second and native fdp in about 66 s.
- **Finding**: three port renders of `2621.dot` under dot (svg, cmapx, cmapx-np) were still running after 14 minutes each and were stopped. `test/tools/bytediff.ts` runs base then head per job, so one dot job costs twice that.
- **Impact**: do not put `2621` under dot in a targeted survey; its dot rows are native timeouts and are never judged. `harness/rowcheck.mjs` now takes `PORT_TIMEOUT_MS` for inputs like this.
- **Confidence**: Medium (the renders were stopped, not timed to the end)
