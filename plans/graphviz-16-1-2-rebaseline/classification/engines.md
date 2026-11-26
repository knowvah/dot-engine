<!-- SPDX-License-Identifier: EPL-2.0 -->
# T12b — non-dot engine results changed by the 16.1.1 → 16.1.2 oracle move

Inputs: the 28 walk tables `$BASE/diff/{parity,json-parity,map-parity,plain-parity}-<engine>.tsv` for circo, osage,
patchwork, twopi, neato, fdp, sfdp (`$BASE` = `~/git/knowvah/rebaseline-1612`; json and map for circo, twopi, neato,
fdp, sfdp regenerated after the `2784` and fdp map re-walks), plus `attribution-{twopi,fdp,sfdp,neato}.tsv` and
`oracle-errors-<engine>.tsv` (7). Rows whose old and new differ: **2089** = walk tables 2038 (28 × 71 roster rows:
53 entered, 18 left; plus 50 transitions on ids present in both) + attribution 44 + oracle-errors 7. Each row is in
exactly one group below (`$BASE/t12b/groups.tsv`, one line per row, column 1 the group; built by
`$BASE/t12b/group.mjs` from `changed.tsv` and `changed-aux.tsv`). Native
runs: worktree root as cwd (the harness's), 16.1.1 carried `GVBINDIR=/tmp/ghl1611-carried-all`, 16.1.2 carried
`/tmp/ghl1612-carried-all` (`config8` present in both). Scratch evidence: `$BASE/t12b/` (`nat/`, `cl/`,
`census/`, `r2784/`).

| group | issue | C change | ids | rows | direction |
|---|---|---|---|---|---|
| E1 roster: entered, port fixed by `fbb98c92` | #158 | none | 34 | 921 | entered pass/conformant |
| E2 roster: entered, port fixed by `70995139` | #160 | none | 4 | 102 | entered pass/conformant |
| E3 roster: entered, port fixed by `007a93ee` | #164 | none | 1 (`2783`, osage, patchwork) | 8 | entered pass/conformant |
| E4 roster: entered, 16.1.1-added inputs | #148 | none | 14 | 376 | entered pass/conformant |
| E5 roster: left (dot render skip) | #299 | `19b33b581` `cmd/dot/dot.c:main` | 18 | 514 (504 walk + 10 attribution) | left |
| S1 16.1.2 render skip on the engine | #299 (fdp also #256) | `19b33b581` `cmd/dot/dot.c:main` | 5 | 25 (20 walk + 5 oracle-errors) | worse: pass → oracle-error, `native-crash` |
| S2 fdp `mapc` cluster test | #303 | `51fe00a1a` `common/utils.c:mapc` | 1 (`2717`) | 6 (4 walk, 1 attribution, 1 oracle-errors) | native crash fixed; port diverges |
| T1 native render time at the 300 s format-walk cap | none (harness timing) | none | 2 (`2783` plain, `1652`) | 6 | `2783` plain entered oracle-error, `1652` better |
| A10 `2783` port-error | accepted class A10 | none | 1 | 15 (5 walk, 5 json, 5 map) | entered port-error |
| C1 fdp `2239` native crash, both versions | #316 | none | 1 | 5 (4 walk + 1 oracle-errors) | entered oracle-error, `native-crash` |
| J1 json subgraphs matched by anonymous name | #231 | none | 2 | 10 | entered diverged |
| F1 fdp node named like a cluster | #224 | none | 6 (`2768*`, `2769*`) | 18 (12 walk + 6 attribution) | entered diverged; attribution `drift-exonerated` (misleading, see F1) |
| P1 port commit on main `f43eded0` via the comparator | #315 | none | 1 (`graphs-clustlabel`) | 5 (3 walk + 2 attribution) | worse: pass → diverged; attribution `not-cleared` |
| P2 port commit on main `f43eded0` | #242 (fixes #210) | none | 1 (fdp `2242`) | 3 (2 walk + 1 attribution) | better |
| P3 port commit on main `f22bf3d9` | #175 | none | 1 (osage map `graphs-xx`) | 1 | better |
| P4 port commit on main `f43eded0` via the comparator, plus the harness's name-keyed cluster bb | #211 | none | 1 (fdp `1436`) | 1 (attribution) | `drift-exonerated` → `not-cleared` |
| AT stale old attribution: port commit `007a93ee` | #164 | none | 3 (twopi `2643`, `2168_5`, `2183`) | 3 (attribution) | `not-cleared` → absent (better) |
| V1 native variance | none | none | 17 | 25 (19 walk + 6 attribution) | shuffles |
| A1 entered diverged, drift-exonerated | A1 drift class | none | 13 sfdp (incl. `2239`) + twopi `2239` | 45 (31 walk + 14 attribution) | entered diverged, `drift-exonerated` |

Rows per issue: #158 921 (34 ids); #160 102 (4); #164 11 (4: E3 `2783`, AT 3); #148 376 (14); #299 539 (23: E5 18,
S1 5); #303 6 (1); #231 10 (2); #224 18 (6); #315 5 (1); #316 5 (1); #242 3 (1); #175 1 (1); #211 1 (1);
A10 class 15 (1); A1 drift class 45 (13); native timing (T1) 6 (2); native variance (V1) 25 (17). Total 2089.

## Facts behind every group

- **Port unchanged, native unchanged except where named.** The only native changes the tables show are S1 (render
  skip) and S2 (`2717` crash fix). Every other changed row has byte-identical native output on 16.1.1 and 16.1.2
  (or the same multimodal output set, V1), so the change comes from the roster, the walk's timing, native
  nondeterminism, or a port commit on main after the old registries' last write (`138b15bf`, 2026-11-21, for all
  28 engine registries; `git log 138b15bf..c6d794a9 -- src` lists 27 commits).
- **Roster (E1-E5).** All 28 tables share one entered set of 53 ids (md5 `1dfea704`) and one left set of 18
  (md5 `09335a4a`), the same sets as dot's G3-G8: every format and engine walk reads its ids from `parity.json`'s
  conformant set (`engine-walk.ts`, `json-walk.ts`, `map-walk.ts`, `plain-walk.ts`). See `classification/dot.md`
  "Why ids entered" / "Why ids left". Entered ids that are not pass/conformant on an engine are classified by their
  own cause (T1, A10, C1, J1, F1, A1), not by the roster.
- **Attribution runs only on walk rows with status `diverged`** (`attribute-divergence.ts:494`). The old attribution
  files were generated on 2026-11-13 (committed at `1df582e7`) from the walks of that day, not from the old walks
  (`138b15bf`, 2026-11-21), so an attribution row can move because the walk roster of 2026-11-13 differed (AT, V1).
  The new attribution ran against pristine 16.1.2 (`1834aa72`, the `GVTS_POS_DUMP` build); the walks use the
  carried build. On the ids checked here (fdp `1436`; twopi `2643`, `2168_5`, `2183`) both give the same xdot.
- **Hidden 16.1.2 changes in engine output:** see "Census" below.

## E1-E4 — roster: ids that entered (#158, #160, #164, #148)

- **Cause:** as `classification/dot.md` G4 (`fbb98c92`, #158), G5 (`70995139`, #160), G7 (`007a93ee`, #164), G8
  (`483fb1d6`, #148): the committed `parity.json` that fed the old rosters (2026-11-12 survey, 16.1.0 tree) did not
  list them as conformant; T7's survey does. No engine-side change.
- **Ids:** E1 the 34 of dot G4; E2 `2756`, `2756_1`, `2759`, `2759_1` (json `2759` everywhere and json `2759_1` on
  osage, patchwork, fdp are J1); E3 `2783` (osage and patchwork, all 4 tables; the other 5 engines are A10, plain T1);
  E4 the 14 of dot G8 (fdp `2768*`/`2769*` walk and json are F1; sfdp `2765`, `2765_1` walk and json are A1).
- **Rows:** E1 921 (34 × 28 = 952, less 31 non-pass rows: 11 sfdp ids × walk + json and 2 sfdp map rows = 24 in
  A1, twopi `2239` × 3 in A1, fdp `2239` × 4 in C1), E2 102 (112 less J1's 10), E3 8, E4 376 (392 less F1's 12 and
  sfdp `2765`, `2765_1` × walk + json in A1).
- **Example** (`parity-sfdp.tsv`, `parity-osage.tsv`):

```
121	-	pass
2783	-	pass        (osage)
2765	-	diverged    (sfdp: A1, not E4)
```

## E5 — roster: ids that left (#299)

- **Cause:** dot's render skip (`19b33b581`) made these 18 ids oracle-error in T7's `parity.json`, so no walk visits
  them. Old verdicts: pass/conformant 467, accepted 12, diverged 15, oracle-nondeterministic 6, port-error 4.
- **Ids (18, every table):** `1213-1`, `1213-2`, `1323`, `1323_1`, `1328`, `1332`, `1581`, `1879`, `1939`, `2470`,
  `2471`, `2516`, `2619`, `2619_1`, `2619_2`, `2796`, `2825`, `graphs-structs`.
- **Note for T13:** accepted entries keyed on these ids (twopi `2470`; sfdp `1879`, `2619_1`; json sfdp `1323`,
  `1332`, `1879`, `2470`, `2471`, `2619_1`, `2796`, `2825`; json twopi `2470`; map sfdp `1879`, `2619_1`; plain
  twopi `2470`) now have no walk row. The engines lose coverage of these ids because of a dot-only skip: 89 of the
  126 (id, engine) pairs still render natively on 16.1.2 (see "Census", last paragraph).
- **Attribution (10 rows):** sfdp `1323`, `1332`, `1879`, `2470`, `2471`, `2619_1`, `2796`, `2825` and twopi
  `2470`, `2471`: `drift-exonerated` → absent (no walk row, so no attribution row).
- **Example** (`parity-sfdp.tsv`): `1323	diverged	-`, `2619_1	diverged	-`.

## S1 — 16.1.2 render skip on the engine (#299)

- **C change:** `19b33b581` `cmd/dot/dot.c:main` (mechanism as dot.md G1: `agreseterrors()` after
  `gvLayoutJobs`; any `agerr` error during layout skips `gvRenderJobs`).
- **Native evidence** (`-Txdot`, `$BASE/t12b/nat/`): 16.1.1 exit 1 with a document, 16.1.2 exit 1 with 0 bytes;
  stderr identical across versions.

| engine | ids | first error | C `file:function` | 16.1.1 bytes |
|---|---|---|---|---|
| twopi | `2095` | `twopi: use of weight=0 creates disconnected component.` | `twopigen/circle.c:circleLayout` | 108521 |
| fdp | `1221`, `1767`, `2721`, `graphs-b53` | `node "…" is contained in two non-comparable clusters "…" and "…"` | `fdpgen/layout.c:deriveGraph` | 554, 2581, 506, 6882 |

- **Rows (25):** each id in the walk, json, map and plain tables (pass/conformant → oracle-error), and each id in
  `oracle-errors-{fdp,twopi}.tsv` (absent → `native-crash`). The classifier has two classes only (`native-crash` =
  every attempt failed, `timeout-flake`; `oracle-error-classifier.ts:43`), so a render skip is labelled
  `native-crash`; these five exit 1 with no output, they do not crash.
- **Port side:** the port prints the twopi error (`src/layout/twopi/circle.ts:336`); it does not print the fdp error
  (#256), so it could not mirror the skip on fdp until #256 lands.
- **Example hunk:** as dot.md G1 (`cmd/dot/dot.c`, `if (r == 0) { gvRenderJobs(...) }`).

## S2 — fdp `2717`: 16.1.2's `mapc` fix (#303)

- **C change:** `51fe00a1a` "common mapc: fix divergent definition of what indicates a cluster",
  `lib/common/utils.c:mapc` (upstream 2717, 2187).
- **Mechanism:** `mapc` now asks `findCluster` and `is_a_cluster` (so `subgraph domestic_cats { cluster=true }` is a
  cluster) instead of `startswith(name, "cluster")`; 16.1.1 treated `domestic_cats` as a node, which crashed fdp;
  16.1.2 renders. The port still uses the prefix test (`src/layout/fdp/cluster-edges.ts` `mapc`) and adds a node
  `domestic_cats`.
- **Native evidence:** `-Kfdp -Txdot 2717.dot`: 16.1.1 exit 139, 0 bytes; 16.1.2 exit 0, 2456 bytes.
- **Rows (6):** walk, json, plain oracle-error → diverged; map oracle-error → conformant (no href; the map holds only
  the root area); `oracle-errors-fdp.tsv` `native-crash` → absent; `attribution-fdp.tsv` absent → `not-cleared`
  (base 119 diffs, 29 left after injecting native positions: the port's extra node `domestic_cats` is a structural
  difference positions cannot remove, as expected for #303).
- **Example** (new rows): json `firstDiff "node:domestic_cats[missing-object]"`, maxΔ 368.5 at
  `cluster:domestic_cats/_draw_`; plain `[extra] domestic_cats/node: port=present native=<absent>`.

## T1 — native render time at the 300 s format-walk cap (no issue: harness timing)

- **Mechanism:** the json, map and plain walks cap a native render at 300 s and record a timeout as a sticky
  oracle-error (`oracle-env.ts:recordOracleFailure`, `timedOut: true`); the error text is stderr's first line
  (`json-walk.ts:271`). `2783` and `2784` (one node 3e16 pt tall, `splines=ortho`; A10's input shape) take 180-410 s
  natively on the pack-based engines, so their rows flip with machine load. They are not render skips: 16.1.2 only
  warns (`scan.l` `agwarningf`, level 0), so `agreseterrors()` returns 0 and it renders.
- **`2784` (resolved, no longer a changed row):** one native run (twopi json, 16.1.2) exited 0 after 200.5 s (71.6 GB
  resident, 119 GB peak) with output byte-identical to the 16.1.1 json the old walk cached (215 s). After the 15
  timeout records were moved aside and json + map were re-walked alone, all 10 rows are back to their 16.1.1 verdicts
  (6 accepted, 4 port-error, `Map maximum size exceeded`).
- **`2783`:** never walked before. The engine walk (1 h cap) recorded native 183-407 s; every json, cmapx, imap,
  plain failure record of the first walks is `timedOut: true` at 302-320 s. Re-walked alone (concurrency 1, load 2
  to 6, 2026-11-25 22:24 → 23:42) after moving those records aside: json and map finish under the cap on all five
  engines and the rows become A10 port-errors (10 rows); plain still times out at 301-305 s on all five (the plain
  walk renders `plain` and `plain-ext` together; sfdp `plain-ext` alone finished, port-error). The 5 plain rows stay
  here.
- **`1652` fdp map:** the 16.1.1 cmapx failure record is a timeout at 300003 ms; the 16.1.2 render finished in 243 s
  (cmapx) and 240 s (imap). Not run natively (do-not-run list).
- **Rows (6):** `2783` plain × circo, twopi, neato, fdp, sfdp (entered oracle-error); fdp map `1652`
  (oracle-error → conformant).
- **Example** (`failures/16.1.2/twopi/plain/2783.json`): `{"err":"oracle exit null","ms":304687,"capMs":300000,
  "timedOut":true}`.

## A10 — `2783` port-error (accepted class A10)

- **Mechanism:** the same as A10 for `2784` (`docs/known-divergences.md#a10…`): faithful `pack.c` placement needs
  ~2e9 `PointSet` cells; V8 caps a `Map` at 2^24 and the port throws. Same input shape and same error text.
- **Rows (15):** engine walk, json and map of circo, twopi, neato, fdp, sfdp: entered `port-error`, `err "Map
  maximum size exceeded"` (osage, patchwork pass: E3; plain is T1). Not yet in `accepted-divergences-engines.json` (T13).
- **Example:** `{"id":"2783","status":"port-error","oracleMs":240147,"err":"Map maximum size exceeded"}` (twopi).

## C1 — fdp `2239`: native crashes on both versions (#316)

- **Native evidence:** `-Kfdp`, xdot and json, 9 runs per version per format: 16.1.1 17/18 exit 139 (one json run
  exited 0 with a full 409142-byte document), 16.1.2 18/18 exit 139. The crash is nondeterministic and predates
  16.1.2; no 16.1.2 commit touches it (`51fe00a1a`'s message lists a `findCComp` out-of-bounds write it did not
  fix, a candidate, not verified).
- **Rows (5):** walk, json, map, plain: entered oracle-error (json/map/plain errMsg is stderr's first warning line,
  exit 139); `oracle-errors-fdp.tsv` absent → `native-crash` (3 attempts, all failed). `2239` is a G4 id; on the
  other six engines it entered pass/conformant or A1 (twopi, sfdp).
- **Example:** 16.1.1 fdp json exit codes `0 139 139 139 139 139 139 139 139`; 16.1.2 `139` × 9.

## J1 — json `2759`, `2759_1`: cluster correlation by anonymous name (#231)

- **C change:** none; native `-Tjson` byte-identical on both versions for both ids on all 7 engines.
- **Mechanism (new evidence for #231):** the port's json writer re-renders xdot, re-parses it, and matches each
  subgraph of the laid-out graph to the re-parsed one **by name** (`src/render/json.ts:collectDrawLookup`,
  `correlate`, `xgSub.subgraphs.get(nm)`). Anonymous names are renumbered by the re-parse (the xdot text has a
  different object order, and agwrite inlines irrelevant anonymous subgraphs), so the match goes to the wrong
  subgraph or to none: the cluster under an anonymous `%5` is never correlated and loses `bb`/`_draw_` (#231's
  signature, osage, patchwork, fdp, dot), or the inner `%7` takes the attrs of the re-parsed `%7`, which is the
  `rank=same` block (circo, twopi, neato, sfdp).
- **Evidence** (`$BASE/t12b/rk4.mts`): subgraph names in the source vs the port's own xdot re-parsed:

```
source        : %5 { cluster { %7 %9 } }  %13 [rank=same]
neato xdot    : %3 { cluster }            %7  [rank=same]   -> port json %7 gets rank=same
osage xdot    : %3 { cluster { %5 %7 } }  %11 [rank=same]   -> cluster never matched: no bb/_draw_
```

- **Rows (10):** json `2759` on all 7 engines (`cluster:%7/rank[missing]` on circo, twopi, neato, sfdp;
  `cluster:cluster/_draw_[missing]` on osage, patchwork, fdp); json `2759_1` on osage, patchwork, fdp. Present since
  at least `138b15bf` (the port json is identical there).

## F1 — fdp `2768*`, `2769*`: a node named like a cluster (#224)

- **C change:** none; native xdot and json byte-identical on both versions.
- **Mechanism:** each input declares a node `cluster_x` (or `cluster0b0`) and a subgraph of the same name under
  `packmode=array`. Native fdp puts the node at the origin and lays the cluster out where the node would be; the port
  keeps the node and leaves the cluster empty: #224's corpus `2841` signature.
- **Rows (18):** walk and json of `2768`, `2768_1`, `2768_2`, `2769`, `2769_1`, `2769_2` (entered diverged), and
  their 6 attribution rows (absent → `drift-exonerated`, e.g. `2768` base 42 diffs, 0 after injection).
- **The `drift-exonerated` verdict does not mean A1 drift here.** Injection copies native's node positions and
  cluster boxes (`GVTS_POS`, `GVTS_CLUST_BB`) into the port, which overwrites exactly the field #224 gets wrong
  (native node `cluster_x` at exactly `0,0`, port cluster box `0,0,0,0`). The difference is deterministic (census:
  one output in 3+3 runs) and structural, not a last-bit drift. If T13 lets the computed A1 class absorb these 6
  ids, #224 loses its corpus witnesses; they belong on #224.
- **Example** (`2768_2`, native vs port xdot):

```
native: bb="0,0,128,52"     cluster_x bb="-3.9968e-15,0,70,52"  node cluster_x pos="0,0"
port:   bb="0,0,92.869,36"  cluster_x bb="0,0,0,0"              node cluster_x pos="46.434,18"
```

## P1 — `graphs-clustlabel`: port commit on main `f43eded0` changed the comparator (#315)

- **Not a native change:** native `-Txdot` and `-Tsvg` byte-identical on 16.1.1 and 16.1.2 for all 7 engines; the
  twopi oracle cache holds the same md5 from 2026-10-20 to 2026-11-25. The port's xdot is identical at `138b15bf`
  and `c6d794a9`.
- **Mechanism:** `test/golden/compare-xdot.ts` parses both sides with the port's `parse` and lists every subgraph
  whose attrs hold a draw key (`collectGraphs`). `f43eded0` ("inherit every graph attribute as agmakeattrs does",
  #242) seeds inherited graph attrs into each subgraph, so the native's anonymous block `{ graph [label=""]; c; b }`
  inherits the root's `_draw_` and becomes object `cluster:%1`. The port's xdot has no such block: on circo, twopi
  and sfdp its agwrite inlines the anonymous subgraph (`src/render/dot/agwrite.ts:123 irrelevantSubgraph` loops over
  the child's **own** attrs only, and `%1` has none, so the parent's `label=cluster0` is never compared), whereas
  C's `irrelevant_subgraph` (`lib/cgraph/write.c:409`) compares every index of the root dict (`""` vs `cluster0`)
  and writes it. On neato, fdp, osage, patchwork the port writes the block and passes.
- **Bisect** (comparator from each commit, same port and native xdot): `138b15bf`, `21834bdc`, `9245f471`,
  `f43eded0^` pass; `f43eded0`, `997f66f5`, `c6d794a9` `diverged 1 cluster:%1[missing-object]`.
- **Rows (5):** engine walk of circo, twopi, sfdp (pass → diverged); attribution twopi and sfdp absent →
  `not-cleared` (1 diff before and after injection: a missing object, which positions cannot supply). The port's xdot
  difference predates the oracle move; the comparator now sees it. Related to #260 (the converse case).
- **Example hunk** (native vs port, circo xdot, inside `subgraph cluster0`):

```diff
-		{
-			graph [label=""];
-			c	[_draw_="c 7 -#000000 e 279 18 27 18 ", …];
-			b	[_draw_="c 7 -#000000 e 27 18 27 18 ", …];
-		}
+		c	[_draw_="c 7 -#000000 e 279 18 27 18 ", …];
+		b	[_draw_="c 7 -#000000 e 27 18 27 18 ", …];
```

## P2 — fdp `2242`: port commit on main `f43eded0` (#242; fixes #210)

- **Mechanism:** `cluster_ff` sits in an anonymous subgraph with `graph [margin=12]`; seeding every inherited graph
  attribute gives `finalCC` the margin 12 native reads (#210's diagnosis). `f43eded0`'s own message records "2242
  under fdp now equals native".
- **Evidence:** native identical on both versions (8 runs each, one output); port xdot vs native: `138b15bf` …
  `f43eded0^` `diverged 826 [graph]/_draw_/op[2].filled_polygon[3]: 523.45 vs 625.45`; `f43eded0`, `c6d794a9` pass.
- **Rows (3):** walk diverged → pass; json accepted → conformant; attribution `drift-exonerated` → absent (no longer
  diverged). #210 can close; T13 drops 2242's json acceptance.

## P3 — osage map `graphs-xx`: port commit on main `f22bf3d9` (#175)

- **Mechanism:** `f22bf3d9` ("print -0 in imagemap coords as native's %.0f does") rounds map coordinates half to
  even with C's transform; the one accepted 1 px difference goes.
- **Evidence:** native cmapx identical on both versions and in every cache since 2026-10-20; bisect over the 27
  commits: `573c2c7b` `diverged 1 area[271].coords[2]: 2655 vs 2654`, `f22bf3d9` pass; with `573c2c7b`'s `src` and
  `f22bf3d9`'s `compare-map.ts` it still diverges, so the `src` change did it.
- **Rows (1):** map accepted → conformant.

## P4 — fdp `1436` attribution `drift-exonerated` → `not-cleared` (#211)

- **Not native variance:** native fdp `1436` gives one xdot in 8 runs of pristine 16.1.2 (with `GVTS_POS_DUMP=1`, one
  dump in 8) and the same xdot in 8 runs of carried 16.1.2 (`$BASE/t12b/a1436/`); the census found it identical on
  16.1.1 and 16.1.2.
- **Not a port change:** the port's xdot, plain and injected, is byte-identical at `138b15bf` and `c6d794a9`.
- **Mechanism:** two collisions on duplicate cluster names. `1436` has 7 subgraphs named `cluster` (most inside
  anonymous wrappers). (1) Before `f43eded0` the comparator's inventory, keyed `cluster:<name>`, kept only one of the
  `cluster` subgraphs, so the injected render passed (`f43eded0^` comparator: pass). With `f43eded0`, anonymous
  wrappers inherit their parent's `_draw_` and become their own objects (`cluster:%11`), so the boxes of the other
  `cluster` subgraphs are compared too. (2) The injection hook maps `GVTS_CLUST_BB` lines by cluster name
  (`src/layout/neato/splines.ts`, `clustByName`), so all six `cluster` lines land on one subgraph and the others keep
  the port's own boxes. The remaining 66 diffs are those boxes (`cluster/_draw_`, `cluster/bb`, e.g. native
  `bb="0,-3.1974e-14,920.23,498"` vs injected port `bb="0,108.59,966.94,559.59"`).
- **Reading:** neither the old nor the new verdict is evidence. `1436` is #211's input (fdp lays out a different
  component sequence from native), a known non-drift difference. The harness gap (name-keyed cluster-bb injection)
  is worth a line on #211 or #317.
- **Evidence:** comparator bisect on the same injected port xdot: `f43eded0^` pass, `f43eded0` `diverged 66
  cluster:%11/_draw_/op[1].unfilled_polygon[1]: 108.59 vs 0`; un-injected 438 → 534 diffs (walk 432 → 528).
- **Rows (1):** `attribution-fdp.tsv` `1436	drift-exonerated	not-cleared`.

## AT — twopi `2643`, `2168_5`, `2183`: stale old attribution, port commit `007a93ee` (#164)

- **Mechanism:** all three are `splines=ortho` inputs. The 2026-11-13 walk (and the attribution generated from it)
  had them diverged; `007a93ee` (ortho segment order from libc `rand()`, #164, 2026-11-16) made them pass, so the
  old walks (2026-11-21) and the new walks have them pass and the new attribution has no row.
- **Evidence:** port bisect over the 18 `src` commits between `1df582e7` and `138b15bf` against native 16.1.2:
  `2643` diverged 12 (`edge:l_stop->l_run#0 … 175.16 vs 212.72`) through `28b3764c`, pass from `007a93ee`;
  `2168_5` and `2183` likewise (diverged 6 and 120 at `28b3764c`, pass at `007a93ee`). Pristine and carried 16.1.2
  give the same xdot on all three.
- **Rows (3):** `attribution-twopi.tsv` `not-cleared` → absent.

## V1 — native variance (no issue)

- **Mechanism:** these engines are nondeterministic on these ids natively (several distinct outputs per version);
  the walk's cached draw and its re-draws landed differently in the two walks. The map and plain walks have no
  nondeterminism probe (#317), so a rare native variant there reads as `diverged`.
- **Runs** (`$BASE/t12b/nat/<ver>/<engine>.<fmt>/<id>.rN.out`, distinct-output md5 prefixes : count):

| engine fmt id | runs 1611/1612 | 16.1.1 | 16.1.2 | rows |
|---|---|---|---|---|
| twopi xdot graphs-newarrows | 16/16 | 7262ee:15 f009ed:1 | 7262ee:11 f009ed:4 5ff2ca:1 | walk diverged → nondet |
| twopi xdot linux.x86-arrows_dot | 16/16 | 7262ee:12 f009ed:3 5ff2ca:1 | 7262ee:10 f009ed:6 | walk diverged → nondet |
| twopi xdot tree-graphs-directed-oldarrows | 8/8 | 30fa83:8 | 30fa83:8 | walk diverged → nondet (walk saw 2 draws) |
| twopi xdot windows-newarrows | 16/16 | 2ed68c:15 6719c4:1 | 2ed68c:14 c96859:2 | walk diverged → nondet |
| twopi json graphs-arrowsize | 16/16 | f13981:13 975be1:2 5a8fd2:1 | f13981:13 975be1:3 | nondet → accepted |
| twopi json graphs-newarrows | 16/16 | 66020c:13 1ab0d0:3 | 66020c:12 1ab0d0:4 | accepted → nondet |
| twopi json linux.x86-arrows_dot | 16/16 | d787f8:13 b876bb:3 | d787f8:14 b876bb:2 | nondet → accepted |
| twopi json nshare-arrows_dot | 8/8 | d787f8:7 b876bb:1 | d787f8:6 b876bb:2 | nondet → accepted |
| twopi json share-newarrows | 16/16 | 6b6ca9:12 39e875:2 a8b8ca:2 | 6b6ca9:12 a8b8ca:4 | accepted → nondet |
| neato xdot tree-graphs-undirected-ngk10_4 | 16/16 | 6c6fd4:8 098427:7 7beb63:1 | 6c6fd4:13 098427:2 7beb63:1 | walk nondet → pass |
| fdp xdot tree-graphs-undirected-ngk10_4 | 16/16 | 76d044:10 631620:5 289b5a:1 | 76d044:14 631620:1 289b5a:1 | walk nondet → pass |
| fdp json tree-graphs-undirected-ngk10_4 | 16/16 | 8ca86d:10 a9795c:5 5d8a5a:1 | 8ca86d:11 5d8a5a:3 a9795c:2 | conformant → nondet |
| fdp xdot tree-doc-infosrc-plugins | 16/16 | d114b8:14 6f2afd:2 | d114b8:12 6f2afd:3 a53ecf:1 | walk nondet → diverged |
| fdp xdot graphs-b124 | 16/16 | 8121ba:16 | 8121ba:16 | walk nondet → pass (old walk saw 2 draws) |
| fdp json share-b124 | 16/16 | efdbe6:16 | efdbe6:16 | conformant → nondet (new walk saw 2 draws) |
| sfdp xdot linux.x86-neatosplines_neato | 16/16 | bc85bf:11 9508b5:5 | bc85bf:10 9508b5:5 4428a8:1 | walk pass → nondet |
| sfdp xdot linux.x86-neatosplines_neato1 | 16/16 | 261a01:9 d6bb26:5 97a376:2 | 261a01:15 d6bb26:1 | walk nondet → pass |
| fdp xdot 1652 | not run | — | walk probe: 3 distinct draws | walk pass → nondet |
| fdp json 2371 | not run | — | old walk probe: 4 distinct draws | nondet → conformant |

- **Same set of outputs on both versions?** The dominant output is the same on every id. After 16 draws per side,
  8 ids still show a rare variant (1-3 in 16) on one side only; going from 8 to 16 draws closed 2 of the 9 such
  gaps seen at 8 and opened 1, which reads as sampling, not a version change. No 16.1.2 commit touches
  `twopigen` or `sfdpgen`; `fdpgen` has only type changes and clang-format (`46a2d7af0`, `3a4142dee`,
  `704a546e9`, `fbb52b742`); `neatogen` only scope and `s1` refactors; `mapc` (S2) changes only non-prefix
  clusters. The census below finds no deterministic id whose output moved.
- **Rare variants the walk caught:** `graphs-b124`/`share-b124` (identical files? no: `graphs/b124.gv` and
  `share/b124.gv` differ) gave one output in 32 runs, yet each walk saw a second draw (old walk on graphs-b124, new
  walk on share-b124: first diff 3023.15 vs 1639.51). fdp map `graphs-b29` and `nshare-root_twopi` (resolved, no
  longer changed rows): the cmapx the first 16.1.2 walk cached differed from 16 fresh draws (8 per version, one
  output each); after the cached draws were moved aside and re-walked, both are conformant again (#317).
- **Attribution rows (6):** twopi `linux.x86-arrows_dot`, `tree-graphs-directed-oldarrows` `drift-exonerated` →
  absent (walk now `oracle-nondeterministic`, so not attributed); twopi `graphs-arrowsize` → absent (walk
  `oracle-nondeterministic` in both old and new; diverged in the 2026-11-13 walk the old attribution read); twopi
  `macosx-arrows_dot` absent → `drift-exonerated` (walk `oracle-nondeterministic` on 2026-11-13, diverged in both old
  and new; the census found it nondeterministic, 1 and 2 outputs in 3 runs); fdp `2621` absent → `drift-exonerated`
  (walk `oracle-nondeterministic` at `1df582e7`, diverged at `138b15bf` and now; do-not-run list, not rendered); fdp
  `tree-doc-infosrc-plugins` absent → `drift-exonerated` (walk nondet → diverged, table above).
- **Rows (25):** 19 walk/format rows (table above, less the two map rows) and the 6 attribution rows.
- `1652` and `2371` were not rendered (brief's do-not-run list); their classification rests on the walks' own probe.

## A1 — entered diverged, `drift-exonerated` (A1 drift class)

- **Native:** byte-identical on both versions for every row (xdot, json, cmapx; `$BASE/t12b/entered-jobs.txt`).
  These are pre-existing port divergences, visible because the ids entered the roster.
- **Attribution (new, pristine 16.1.2):** all 14 `drift-exonerated` (absent → `drift-exonerated`): with native
  pre-routing positions injected, the port's xdot equals native, so the whole difference is in the iterative layout,
  the A1 drift class (`known-divergences.md#a1-drift-iterative-engines`; the class membership is computed from
  these rows).
- **Ids:** sfdp walk and json `1453`, `2239`, `2521`, `2765`, `2765_1`, `700813`, `graphs-ports`,
  `linux.x86-html2_dot`, `linux.x86-ports_dot`, `nshare-html2_dot`, `nshare-ports_dot`, `share-shells`,
  `windows-shells` (26 rows; first diff at `[graph]/_draw_`, bb 0.7-12 pt off, max 262 pt on `2765`); sfdp map
  `linux.x86-html2_dot`, `nshare-html2_dot` (2 rows, coords ≤ 8 px, the same layouts); twopi walk, json, plain
  `2239` (3 rows: one edge label 10.8 pt off in y); the 14 attribution rows (sfdp 13, twopi `2239`).
- **Rows (45):** 31 walk/format + 14 attribution.
- **Example** (`attribution-sfdp.json`): `{"id":"2521","verdict":"drift-exonerated","baseDiffs":208,
  "injectedDiffs":0}`.

## Census — hidden 16.1.2 changes in engine output

Native 16.1.1 carried vs 16.1.2 carried, `-Txdot`, exit code and stderr (build paths and line numbers masked),
worktree root as cwd, 60 s alarm (`$BASE/t12b/census/`, `census.sh`, `an.mjs`). Ids: every id of the new engine
walk with a native time under 5 s and not oracle-error, less the brief's do-not-run list and `2784`. One run per
version on circo, osage, patchwork; three per version on twopi, neato, fdp, sfdp.

| engine | ids | deterministic on both (3+3 runs) | identical across versions | differ | nondeterministic (set compare) |
|---|---|---|---|---|---|
| circo | 905 | 905 (1 run each) | 905 | 0 | — |
| osage | 921 | 921 (1 run each) | 921 | 0 | — |
| patchwork | 921 | 921 (1 run each) | 921 | 0 | — |
| twopi | 918 | 910 | 910 | 0 | 8 (arrows family; 1 equal set at 3 draws) |
| neato | 919 | 918 | 918 | 0 | 1 (`ngk10_4`) |
| fdp | 908 | 895 | 894 | **1: `2717`** (S2) | 13 (3 equal sets at 3 draws) |
| sfdp | 919 | 918 | 918 | 0 | 1 (`neatosplines_neato`) |

- **No hidden 16.1.2 change.** The only deterministic id whose native output moved is fdp `2717` (exit 139 → 0,
  `51fe00a1a`, S2). Every exit code was 0 on both versions except `2717` on 16.1.1.
- **#301 `conc_slope`** (`154365525`, `fe5ff99a6`): unreachable on these engines. `conc_slope` is called only from
  `beginpath`/`endpath` with `merge` set (`common/splines.c:377, 558`), and only `dotgen/dotsplines.c` calls
  `beginpath`/`endpath`. The census shows no change.
- **#302 `reallyroutespline`** (`fbd49b34f`, `pathplan/route.c`): reached through `Proutespline` from
  `neatogen/multispline.c`, `neatogen/neatosplines.c` and `common/routespl.c`; it changes behaviour only when the
  max-deviation scan finds no split point (16.1.1 then indexed `inps[-1]`). No census id took that path: 0 changes.
- **neatogen `s1`** (`6217ad7ba`, `f3c6d7641`) and the `compute_weighted_apsp_packed` scope changes: 0 changes on
  neato, fdp, sfdp, twopi, circo.
- **`mapc`** (`51fe00a1a`): `2717` is the only census input whose output it moves.
- Nondeterministic ids are the V1 ids plus `graphs-try`, `graphs-fdp`, `graphs-b7`, `bsdkernel`, `share-proc3d`,
  `windows-proc3d`, `share-b51`, `windows-b51`, `2620`, `windows-b29`, `2475_2` (fdp), `graphs-arrows`,
  `macosx-arrows_dot` (twopi): no row of theirs changed, and 3 draws cannot compare multimodal sets.

**The 18 ids that left (E5), rendered on every engine** (`left-results.txt`, one run per version): 89 of the 126
(id, engine) pairs exit 0 with a document on both versions (86 byte-identical; fdp `2470`, `2471`, `2796` are
nondeterministic, old walk `oracle-nondeterministic`); circo `2471` exceeds 60 s on both; 36 pairs are render skips
on the engine too (16.1.1 exit 1 with a document, 16.1.2 exit 1 with 0 bytes): `1879`, `2516`, `2619`, `2619_1`,
`2619_2` on all 7 engines (harness-cwd image errors and the html syntax error, dot.md G1/G2) and fdp `1332`.

## Attribution and oracle-error tables

Rows whose old and new differ: attribution twopi 11, fdp 11, sfdp 22, neato 0; oracle-errors fdp 6, twopi 1, the
other five engines 0. Each is in a group above:

| table | rows | group |
|---|---|---|
| attribution-sfdp | 13 ids absent → `drift-exonerated` | A1 |
| attribution-twopi | `2239` absent → `drift-exonerated` | A1 |
| attribution-sfdp, -twopi | 8 + 2 left ids `drift-exonerated` → absent | E5 |
| attribution-fdp | `2768*`, `2769*` absent → `drift-exonerated` (6) | F1 (#224, not A1) |
| attribution-fdp | `2717` absent → `not-cleared` | S2 |
| attribution-twopi, -sfdp | `graphs-clustlabel` absent → `not-cleared` | P1 |
| attribution-fdp | `2242` `drift-exonerated` → absent | P2 |
| attribution-fdp | `1436` `drift-exonerated` → `not-cleared` | P4 |
| attribution-twopi | `2643`, `2168_5`, `2183` `not-cleared` → absent | AT |
| attribution-twopi, -fdp | `graphs-arrowsize`, `linux.x86-arrows_dot`, `tree-graphs-directed-oldarrows`, `macosx-arrows_dot`, `2621`, `tree-doc-infosrc-plugins` | V1 |
| oracle-errors-fdp, -twopi | `1221`, `1767`, `2721`, `graphs-b53`, `2095` absent → `native-crash` | S1 (render skips, not crashes) |
| oracle-errors-fdp | `2239` absent → `native-crash` | C1 |
| oracle-errors-fdp | `2717` `native-crash` → absent | S2 |

Unchanged: neato's single row, `2371` `drift-exonerated` on both (re-run on pristine 16.1.2, base 429801 diffs, 0
after injection).
