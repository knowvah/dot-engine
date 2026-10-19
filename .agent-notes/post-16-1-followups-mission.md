# post-16-1-followups mission — observations (2026-10-16)

## Observation: a failed dot edge is routed twice, doubling routing-failure stderr
- **Context**: T4 per-id count check of pathplan `prerror` lines vs native.
- **Finding**: dot 2470, 2796, 2471 print exactly 2× native's `triangulation failed`,
  `in routesplines, Pshortestpath failed` and the new T4 messages. Stack traces
  (T4 agent): first `splines-groups.ts:121` `dispatchEdgeGroup` -> `routeLoneEdge`, then
  `edge-route.ts:512` `routeDotEdges` -> `routeLoneEdge` again after no spline was
  installed. The pre-T4 port baseline already shows the doubling.
- **Impact**: stderr parity gap; whether the second routing can change SVG is unchecked.
- **Confidence**: High for the doubling, Medium for the exact call chain.

## Observation: the port never prints `in label of <kind> <name>`
- **Context**: T6/T7 (HTML label errors and size warnings).
- **Finding**: C `labels.c:make_label` prints `agerr(AGPREV, "in label of %s %s\n")` after
  a failed or rv=1 HTML label. `grep "in label of" src` is empty; `makeHtmlLabel`
  (`htmltable-pos.ts:559`) swallows lexer errors in a bare `catch` and has no object name.
- **Impact**: any ported HTML-label diagnostic needs kind/name plumbing to match native.
- **Confidence**: High

## Observation: 2516's yacc `htmlerror` is thrown but never printed
- **Context**: T6 corpus check.
- **Finding**: native prints `Error: Syntax error: non-space string used before <TABLE> in
  line 1`; the port throws `HtmlParseError` at `htmltable-parse.ts:535` and prints nothing.
- **Impact**: stderr gap; same print site as above.
- **Confidence**: High

## Observation: neato's ortho path has its own string-keyed concentrate set
- **Context**: T10 (ortho `seen` -> `PointSet`).
- **Finding**: `src/layout/neato/splines.ts:598-607` re-implements ortho.c:1221-1229's
  dedup with `Set<string>`; only `ortho-adapter.ts` (dot) was in item 11's list.
- **Impact**: last port-only point set for this C site.
- **Confidence**: High

## Observation: iterative-engine tolerance hides drift that flips borderline routing
- **Context**: T5 count check, neato 241_0 (walk `pass`).
- **Finding**: node positions differ from native by ~0.3 pt (inside the 0.5 tolerance,
  `engine-walk.ts:329`); that flips the point location for one edge, so the port prints
  one extra multispline warning. Same edge geometry shape on both sides.
- **Impact**: stderr counts on iterative engines are not a reliable parity signal.
- **Confidence**: High

## Observation: sfdp 2168_3's extra warning comes from the router's corridor polygon
- **Context**: T5 count check (xdot identical to native, port 2 warnings vs native 1).
- **Finding**: the port's two corridor polygons, fed to native `libpathplan`
  `Pshortestpath` via a C harness (`cc -I lib/pathplan -I build/lib/pathplan -L
  build/lib/pathplan -lpathplan`, points printed with JS shortest round-trip repr),
  also fail on both. So the polygon (mkRouter/triPath/mkPoly) differs, not pathplan.
- **Impact**: reusable technique: run the native library on port-dumped inputs to split
  a divergence at a library boundary without instrumenting the native build.
- **Confidence**: High

## Observation: makeGraphDataC lacks C's weight and direction branches
- **Context**: T11 `PointMap` comparison (equivalent).
- **Finding**: C `makeGraphData` also accumulates `eweights[idx] += ED_factor` (haveWt,
  `neatoinit.c:798`) and sets `ewgts = 1.0` for haveDir; `makeGraphDataC`
  (`src/layout/neato/init.ts`) handles haveLen only. Reachability in the port's
  supported modes unchecked.
- **Impact**: possible unported branch.
- **Confidence**: Medium

## Observation: "logs nothing" golden tests break when native-faithful warnings land
- **Context**: T7.
- **Finding**: `test/golden/pt-issue-29.test.ts:49` allows only the metrics warning;
  native prints `Warning: table size too small for content` 4× on that input.
- **Impact**: porting any warning needs those tests' allow-lists updated with it.
- **Confidence**: High

## Observation: worktree setup for bundling
- **Context**: batch 2/3 agents.
- **Finding**: a fresh worktree needs `node_modules` symlinked and `npm run parser:regen`
  (generates `src/parser/dot.js`) before esbuild can bundle. Native prints
  `Warning: Warning: no hard-coded metrics ...` (double prefix) where the port prints one.
- **Confidence**: High

## Observation: /tmp/ghl/config8 can vanish while the plugin symlinks survive
- **Context**: T14 survey, 2026-10-17.
- **Finding**: `/tmp/ghl` kept its 6 plugin symlinks but lost `config8` (dir mtime 00:00),
  so native dot printed `Format: "svg" not recognized. No formats found.` and the survey
  recorded 946/950 `oracle-error`. `rules-gate` still printed `GATE PASS`, because
  oracle-error rows are not compared. The survey's `$TMPDIR/dot-corpus-oracle` cache was
  gone too. `GVBINDIR=/tmp/ghl dot -c` regenerates `config8`.
- **Impact**: before trusting a survey, check `counts.oracle-error` (normally a handful),
  not just `GATE PASS`; check `dot -Tsvg` works, not only `dot -V`.
- **Confidence**: High for the symptom and the fix; the deleting process is unknown.
