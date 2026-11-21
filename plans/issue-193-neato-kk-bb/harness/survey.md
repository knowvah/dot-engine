# Survey design: issue #193

## What can change

The fix changes behaviour only where `neatoPack` returns a negative value,
because only that path skips the recompute. That is `mode=KK` with no `pack`
(or a negative one) and no `packmode`, as `neatoinit.c:1371-1383` decides.
`neatoLayout` has no caller but the neato engine descriptor: twopi, circo,
sfdp and fdp do not run it.

- **Corpus:** 0 of the 1007 manifest ids contain `mode=KK` (case-insensitive
  scan of every input at planning). Single-layout corpus output cannot change,
  so the smoke bytediff is the corpus check, and a reach bytediff would have
  no ids.
- **Unit fixtures:** `src/layout/neato/__fixtures__/{models,dim}/*.gv` (88
  files, 21 of them KK) are the only repo inputs with `mode=KK`. On the
  prototype, the first `graph` line of every file native renders equals
  native (journal row 1). Native gives no stdout for 6 KK inputs
  (`kk-circuit`, `kk-disc-circuit`, `kk-disc-circuit-pack`,
  `kk-disc4-circuit-pack`, `kk-len-circuit`, `kk-len-mds`; the two checked,
  `kk-circuit` and `kk-len-mds`, segfault with exit 139), so the port's
  output on them is not checked.
- **Probes** ([probes/](probes/), 12 inputs × plain and xdot × 3 no-free
  layouts, [native-compare.sh](native-compare.sh)). Chosen by code path: the
  issue's triangle; KK with a tail, a self-loop, compass ports,
  `splines=true`, an edge label (`addXLabels` after routing), a graph label,
  disconnected components (Pack < 0 lays them out as one graph), and
  `ratio=fill` (`neato_set_aspect` scale). Controls for `Pack >= 0`:
  `mode=KK; pack=true`, the default mode, `sgd`.

## Matrix results at planning

| Run | Identical to native | Not identical |
|---|---|---|
| base `670a47d9` ([results/native-planning-base.tsv](results/native-planning-base.tsv)) | 6/24 | every KK no-pack row but `kk-self` and `kk-tail` plain, on renders 2-3; `kk-ratio` on render 1 too |
| prototype ([results/native-planning-prototype.tsv](results/native-planning-prototype.tsv)) | 24/24 | none |
