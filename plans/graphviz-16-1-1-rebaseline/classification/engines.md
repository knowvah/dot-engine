<!-- SPDX-License-Identifier: EPL-2.0 -->

# T9b: non-dot engine verdict changes, 16.1.0 to 16.1.1, traced to causes

Stop 5: **does not fire.** Every one of the 184 rows of `rows.tsv` has a cause. Stop 6: **does not
fire.** The only group above 50 rows (P1, 87 rows) has a traceable `src/` commit on `main`. Only one
group comes from 16.1.1 C: #164 (21 rows, 6 ids). No `NEW:` group. No AD-4a group is a regression,
so none needs an issue.

| group | issue | C change | ids | direction |
|---|---|---|---|---|
| C1 ortho permutation from libc `rand()` | #164 | `b99490ece` `lib/ortho/partition.c:generateRandomOrdering` → `lib/util/random.c:gv_permutation` | circo `1658`, `1880`, `1990`; twopi `2168_5`, `2183`, `2643` (21 rows) | pass/conformant → diverged (13); pass/conformant → oracle-error (5, `1658`); oracle-error → diverged (5, `1880`)… see C1 |
| P1 port commit on main: `2be35fce` | none (AD-4a, improvement) | none: native byte-identical | 80 neato json + 7 neato map rows (87) | accepted (84) / diverged (3) → conformant |
| P2 port commit on main: `29bc689e` | none (AD-4a, improvement) | none: native identical | fdp json `graphs-b145`, `graphs-fdp` (2) | accepted → conformant |
| P3 port commit on main: `12dddc48` | none (AD-4a, improvement) | none: native byte-identical | sfdp attribution `241_0` (1) | not-cleared → drift-exonerated |
| B1 format walks older than the id's survey entry | none (baseline staleness) | none: native byte-identical | `894589` json/map/plain × 7 engines (21) | `<absent>` → X |
| B2 sfdp class acceptance newer than the walks | none (baseline staleness) | none: native byte-identical | sfdp json 9, map 3 (12) | diverged → accepted |
| B3 fdp class acceptance dropped after the walks | none (baseline staleness) | none: native variance only | fdp json `tree-doc-infosrc-plugins`, map `2621` (2) | accepted → diverged |
| V1 native variance; probe newer than the baseline | none (native variance) | none: run sets overlap | fdp json 10, twopi json 5 (15) | accepted/diverged → oracle-nondeterministic |
| V2 native variance; draw luck | none (native variance) | none: run sets overlap | xdot fdp 5, sfdp 1, twopi 4; map fdp 2 (12) | both directions |
| H1 walk oracle cap 300 s | none (harness cap) | none | `2784` json × 5; fdp `2371` json/map; fdp `1652` map; circo `2371`, `2471` plain (10) | both directions |
| H2 walk port budget 3600 s | none (harness cap) | none: native byte-identical | twopi plain `tree-share-examples-world` (1) | timeout → pass |
| S0 scope follows survey | none | none | 1092 rows outside `rows.tsv` (35 ids left, 4 entered) | `X → <absent>`, `<absent> → X` |

## Counts per issue

| issue | rows | ids |
|---|---|---|
| #164 | 21 | 6 (circo 3, twopi 3) |
| #149–#163, #165 | 0 | none. #156 (neato double Laplacian/CG) and #157 (fdp ctr) were the triage targets; no row needs them (P1, V1, V2) |
| none: port commits on main (AD-4a) | 90 | P1 87, P2 2, P3 1. All improvements |
| none: baseline staleness | 35 | B1 21, B2 12, B3 2 |
| none: native variance | 27 | V1 15, V2 12 |
| none: harness caps | 11 | H1 10, H2 1 |
| none: scope follows survey | 1092 | S0 (not in `rows.tsv`) |

Rows per table: json 129, map 24, parity 16, plain 15, attribution 1, oracle-errors-walk 2 (184).

Evidence lives in `$BASE/t9b/` (`$BASE` = the mission scratchpad `rebaseline-1611`):
`r/<old|new>/<engine>/<fmt>/<id>.<run>` (native renders, banner stripped; `.rc` = exit status and
seconds, `.err` = stderr), `analysis.tsv` (run hash sets per row), `classify.py` (row → group),
`pc/` (scratch port copy with the gated #164 counterfactual), `cfout/`, `atout/`, `bis/` (port
renders at older `main` commits), `att/` (`241_0` injection).

## Method

- Every row was rendered natively in its walk's engine and format: parity → `-Txdot`, json → `-Tjson`,
  map → `-Tcmapx` and `-Timap`, plain → `-Tplain` and `-Tplain-ext`. I ran 16.1.0 with
  `$BASE/ghl16-all` and 16.1.1 with `/tmp/ghl1611-all`, at most 4 renders at once (the external
  1-minute load stayed between 12 and 73 while I worked). Runs per version: 8 for fdp, sfdp, neato and
  twopi, 2 for circo. Rows whose native time is over 100 s got 1 timed run per version (cap and heavy
  rows), plus 8 runs for the fdp xdot rows `2371`, `graphs-b100` and `graphs-b104`.
- Outputs are grouped by a hash of the sorted lines. xdot needs this because 16.1.1 writes edges after
  nodes (#149). Pairs are compared with the walks' own comparators (`compareXdot`, `compareJson`,
  `compareCmapx`/`compareImap`, `comparePlain`) at the walks' tolerances (`$BASE/t9b/cmp.ts`).
- AD-4a: when native output does not change, I rendered the port at older `main` commits
  (`git archive` into `bis/` and `atout/`, then `render-one-*.ts`). I compared each render with the
  native output and bisected the `src/` commits between the baseline's commit and HEAD.
- Baselines were last written at different commits per file. The brief's `7d44fdf2`/`5c3e84d5` hold
  for parity-* and for circo/neato json/map/plain only. The others: json-parity-fdp `517de9a3`
  (2026-10-22), json-parity-sfdp `1d285563` (2026-10-14), json-parity-twopi `383a4f0e`
  (2026-10-21), map-parity-fdp/sfdp/twopi `efcfe454` (2026-10-14), plain-parity-fdp/sfdp
  `1d285563`. Several rows were also carried by resume from older runs (noted per group).

## C1: #164 ortho permutation now drawn from libc `rand()` (21 rows)

- **C change:** `b99490ece` `lib/ortho/partition.c:generateRandomOrdering` now calls
  `lib/util/random.c:gv_permutation`, a Fisher-Yates shuffle over unseeded libc `rand()`.
  `partition()` no longer calls `srand48(173)`.
- **Mechanism:** another permutation gives another Seidel trapezoidation. That changes the maze
  rectangles, the channels and so the ortho routes, for every `splines=ortho` graph. All 6 ids are
  `splines=ortho`.
- **Counterfactual (proof):** in `pc/src/ortho/partition.ts`, behind `CF164=1`,
  `generateRandomOrdering` returns `gvPermutation(n) + 1` (the port's existing `crand.ts`, Apple's
  minstd `rand()`; `rand.c` confirms that unseeded macOS `rand()` yields 16807, 282475249, …). Port
  `-Txdot` compared with native:

  | id | port vs 16.1.0 | port vs 16.1.1 | `CF164` port vs 16.1.1 |
  |---|---|---|---|
  | circo `1990` | SAME | DIFF 36 (ptCount 14 vs 8) | SAME |
  | twopi `2168_5` | SAME | DIFF 6 (0.39) | SAME |
  | twopi `2183` | SAME | DIFF 120 (187) | SAME |
  | twopi `2643` | SAME | DIFF 12 (43.18) | SAME |
  | circo `1880` | native SIGSEGV | DIFF 214 | SAME |
  | circo `1658` | SAME | native SIGSEGV | port `chanSearch` miss |

- **Crashes:** native 16.1.0 crashes on `1880` and 16.1.1 crashes on `1658`. Both stop at exit 139
  in `orthoEdges` (lldb: `orthoEdges+4984` at 16.1.0 and `+4912` at 16.1.1, NULL+0x18 / NULL+0x30
  right after the `dtsearch` calls). That is `ortho.c:assignSegs` → `chanSearch`, which dereferences
  a NULL `dtmatch` result, a segment that lies in no channel (the asserts are compiled out). I
  instrumented the port's `assignSegs` miss path, which skips the segment rather than crashing
  (pinned by `ortho-route.branch.test.ts:350`). Base port: one miss on `1880`, none on `1658`.
  `CF164` port: one miss on `1658` (`isVert comm=810.18 p=788.63,1508.69`), none on `1880`. So the
  same permutation change moves the crash from one input to the other.
- **Ruled out:** `db96c0ca3` (`circpos.c:position`, upstream 2866). That fix is a circo `parents`
  sizing fix, and the 1880 frames are in `orthoEdges`, not circo. Also ruled out: `9ac4b9e3d`
  (ortho vertex chains > 4, upstream 2783) and the `mkMaze` refactors. `CF164` alone matches 16.1.1 on all 5
  non-crashing ids, so these have no visible effect here. Native runs are deterministic (twopi 8/8 and
  circo 2/2 single hash per version).
- **Rows (21):** circo `1658` json, map conformant → oracle-error, parity pass → oracle-error, plain
  pass → oracleError, oracle-errors-walk `<not oracle-error>` → oracle-error. circo `1880` json, map,
  parity, plain, oracle-errors-walk oracle-error → diverged. circo `1990` json, parity, plain
  → diverged. twopi `2168_5` json, parity → diverged. twopi `2183` and `2643` json, parity, plain
  → diverged. The T7 attribution rows twopi `2168_5`, `2183`, `2643` `<absent>` → not-cleared are
  this group: injection cannot clear a routing change. 
- Note for #164: the existing `crand.ts` `gvPermutation` reproduces 16.1.1 exactly on these inputs.
  Once it is ported, `1658` becomes a case where native crashes and the port silently skips.
- Example (twopi `2643` `-Tplain`):
  ```
  < edge l_stop l_run 4 2.9544 0.25 2.4328 0.25 1.6003 0.25 1.0366 0.25 solid black
  < edge null l_stop 4 6.0564 0.25 5.5596 0.25 4.6819 0.25 4.0804 0.25 solid black
  > edge l_stop l_run 4 2.9544 0.25 2.9544 0.25 1.038 0.25 1.038 0.25 solid black
  > edge null l_stop 4 6.0564 0.25 6.0564 0.25 4.0823 0.25 4.0823 0.25 solid black
  ```

## P1: port commit `2be35fce` on main, neato stress kernel (87 rows)

- **Change:** `2be35fce` (2026-10-28) "run the fused stress kernel on the neato kD path"
  (`src/layout/neato/stress-kernel.ts`, `conjgrad-mkernel.ts`, `stress.ts`). It landed after the
  neato json/map walks (`5c3e84d5`, generated 2026-10-24T03:40). The neato xdot walk moved the same
  80 ids from diverged (`5c3e84d5`) to pass (`7d44fdf2`).
- **Native:** byte-identical between versions on every row: 16/16 runs give a single hash
  (90 neato json/map combos). #156 (`1936e80d6`) is therefore not involved. It changes
  `IMDS_given_dim`, `conjugate_gradient_d` and `sparse_stress_subspace_majorization_kD`, and none of
  these runs on the default `mode=major` path these ids take.
- **Proof:** port json at `2be35fce^` and at `2be35fce`, compared with native at the json walk's
  0.5 tolerance. On the 75 json ids under 3 s, `2be35fce^` gives DIFF on 75/75 and `2be35fce` gives
  SAME on 75/75. The same split holds on `1652`, `2621`, `graphs-b100` and `graphs-b104` json
  (`2108`: see note) and on all 7 map ids in cmapx and imap. The old diff counts reappear at
  `2be35fce^`: `2621` cmapx 5044 / imap 3828, `graphs-b100` 4 (1.10).
- **ids, json (80):** `1332`, `1436`, `1447`, `1652`, `1949`, `1990`, `2095`, `2095_1`, `2108`, `2183`,
  `2193`, `2343`, `2475_2`, `2619_2`, `2620`, `2621`, `2852`, `graphs-Helvetica`, `graphs-Symbol`,
  `graphs-b100`, `graphs-b104`, `graphs-b15`, `graphs-b81`, `graphs-clust1`, `graphs-grammar`,
  `graphs-grdshapes`, `graphs-jcctree`, `graphs-mode`, `graphs-p`, `graphs-sl_box`,
  `graphs-sl_box_dbl`, `graphs-sr_box`, `graphs-sr_box_dbl`, `graphs-url`, `linux.i386-b102`,
  `linux.x86-arrows_dot`, `linux.x86-rankdir_dot1`, `linux.x86-rankdir_dot2`, `linux.x86-root_circo`,
  `linux.x86-root_twopi`, `macosx-arrows_dot`, `nshare-arrows_dot`, `nshare-dotsplines_dot`,
  `nshare-dotsplines_dot1`, `nshare-overlap_neato1`, `nshare-rankdir_dot`, `nshare-rankdir_dot1`,
  `nshare-root_circo`, `nshare-root_twopi`, `nshare-weight_dot`, `share-KW91`, `share-b102`,
  `share-b29`, `share-clust1`, `share-crazy`, `share-fig6`, `share-grammar`, `share-newarrows`,
  `share-ngk10_4`, `share-pgram`, `share-trapeziumlr`, `tree-contrib-dirgraph-linux`,
  `tree-contrib-java-dot-uml`, `tree-doc-dotguide-asde91`, `tree-doc-neato-jho`,
  `tree-graphs-directed-clust1`, `tree-graphs-directed-grammar`, `tree-graphs-directed-jcctree`,
  `tree-graphs-directed-polypoly`, `windows-b102`, `windows-b29`, `windows-clust1`, `windows-crazy`,
  `windows-fig6`, `windows-newarrows`, `windows-ngk10_4`, `windows-pgram`, `windows-train11`,
  `windows-trapeziumlr`, `windows-viewfile` (diverged → conformant: `2852`, `graphs-b100`,
  `graphs-b104`, none of which has a json registry entry; the rest were accepted).
- **ids, map (7):** `2621`, `graphs-url`, `linux.i386-b102`, `linux.x86-root_circo`,
  `linux.x86-root_twopi`, `nshare-root_twopi`, `share-b102`.
- Example (`graphs-clust1` json; native 16.1.0 = 16.1.1):
  ```
  cluster_c1 bb  2be35fce^: 197.96,0,373.82,215.1   2be35fce: 197.22,0,373.75,214.62   native: 197.22,0,373.75,214.62
  node a0 pos    2be35fce^: 120.68,299.85           2be35fce: 120.32,299.7            native: 120.32,299.7
  ```

## P2: port commit `29bc689e` on main, fdp json cluster-edge proxies (2 rows)

- **Change:** `29bc689e` (2026-11-06) "undo cluster-edge proxies in json as attach_attrs does". Before
  it, a first fdp json render printed the `__0:<cluster>` proxy node as a cluster member.
- **Native:** `graphs-b145` single hash 16/16; `graphs-fdp` has two variants that both versions
  produce (old 6/2, new 7/1).
- **Proof:** bisected over 135 `src/` commits from `517de9a3` (the json-parity-fdp baseline) to HEAD.
  At `bbd0b48d` both ids give DIFF; at `29bc689e` both give SAME.
- **ids:** fdp json `graphs-b145`, `graphs-fdp` (accepted → conformant).
- Example (port at `bbd0b48d` vs native): `cluster:cluster_foo/nodes[members]: port=__0:cluster_foo,label_foo native=label_foo`;
  `cluster:clusterA/nodes[members]: port=C,D,__0:clusterC,a,b native=C,D,a,b`.

## P3: port commit `12dddc48` on main, sfdp `241_0` attribution (1 row)

- **Change:** `12dddc48` (2026-10-22) "fuse DIST2 in addTriEdge and approxLen as clang does"
  (`src/layout/neato/multispline-router.ts`).
- **Why the old row was stale:** `241_0`'s attribution row (injected 5) is unchanged since the
  `d90c2b1b` run (generated 2026-10-15). The later `7d44fdf2` file carried it by resume.
- **Native:** `-Ksfdp -Txdot` is a single hash in 16/16 runs, and the `GVTS_POS_DUMP` dumps are
  byte-identical between versions.
- **Proof:** I injected the native positions into the port at each commit (`att/`, `bis.sh`). At
  `d90c2b1b` and at `abd00479` (the `src/` commit before `12dddc48`) the result is
  `DIFF n=5 edge:3->4#0/_draw_/op[1].unfilled_bezier[ptCount] 14 vs 8`. At `12dddc48`, `7d44fdf2`
  and HEAD it is SAME. Without injection, HEAD still has 7 diffs (= `baseDiffs`). So the walk
  diverges on both sides, which is the T7 "drift-exonerated" finding.
- **ids:** sfdp attribution `241_0` (not-cleared → drift-exonerated). It feeds `accepted-class.ts` (T10).

## B1: `894589` format walks predate its survey entry (21 rows)

`894589` became survey-conformant at `b2c10dea` (2026-10-27). It was diverged at `1d285563`. The
16.1.0 json/map/plain walks for all 7 engines were written on or before `5c3e84d5` (2026-10-24), and
none of the 21 files contains the id. Native json is byte-identical between versions for all 7
engines (one run each). Rows: json, map, plain × circo, fdp, neato, osage, patchwork, sfdp, twopi
(`<absent>` → conformant/pass. fdp json is `oracle-nondeterministic` and sfdp json is `accepted`,
because those engines draw again).

## B2: sfdp class acceptance written after the walks (12 rows)

- **Mechanism:** `classAcceptedIds` (`accepted-class.ts:110`) accepts every `drift-exonerated` id
  of `attribution-sfdp.json`. That file was first written with these ids at `d90c2b1b`
  (2026-10-15T01:09). The 16.1.0 sfdp json walk (`1d285563`, 2026-10-14T02:10) and map walk
  (`efcfe454`, 2026-10-14T16:50) are older, so they recorded `diverged`.
- **Native:** byte-identical between versions, a single hash in 16/16 runs for every row. Diff
  counts are unchanged (e.g. `2646` 1979265, world 3198828).
- **ids:** json `2413_2`, `241_1`, `2471`, `2646`, `2796`, `698066`, `graphs-b100`, `graphs-b104`,
  `tree-share-examples-world`; map `2413_2`, `graphs-b100`, `graphs-b104` (diverged → accepted).
- Example: `attribution-sfdp.json` `241_1`: absent at `1d285563`, `drift-exonerated` at `d90c2b1b`.
  json row `{"verdict":"diverged","diffCount":8}` → `{"verdict":"accepted","diffCount":8}`.

## B3: fdp class acceptance dropped after the walks (2 rows)

- **Mechanism:** at `5c3e84d5` the fdp xdot walk marked `tree-doc-infosrc-plugins` and `2621`
  `oracle-nondeterministic` (they had been diverged at `517de9a3`). Attribution covers only diverged
  rows, so `attribution-fdp.json` dropped both ids (`drift-exonerated` at `517de9a3`, absent at
  `5c3e84d5`), and neither has a per-id json/map registry entry. The 16.1.0 json walk (`517de9a3`)
  and map walk (`efcfe454`) predate the drop. The 16.1.1 walks' single probe saw one draw, so they
  record diverged.
- **Native:** variance only. json `tree-doc-infosrc-plugins`: old 3 hashes (5/2/1), new 2 (5/3), 2
  shared. `2621` cmapx: old 3 (6/1/1), new 2 (7/1), 1 shared. imap: old 3, new 5, 1 shared. Diff counts
  are unchanged (4790; cmapx 5044).
- **ids:** fdp json `tree-doc-infosrc-plugins`, fdp map `2621` (accepted → diverged).

## V1: native variance, nondeterminism probe newer than the baseline (15 rows)

- **Mechanism:** the walks re-draw the oracle on a divergence and mark ids whose draws differ
  (`86c27c70`, 2026-10-23, `oracle-nondeterminism.ts`). json-parity-fdp (`517de9a3`, 2026-10-22) and
  json-parity-twopi (`383a4f0e`, 2026-10-21) were written before it, so their divergences are
  recorded as accepted/diverged.
- **Evidence (json, 8 runs per version, distinct hashes):**
  fdp `2095_1` old 3 (6/1/1), new 1, 1 shared; `2108` old 8, new 6, 1 shared; `2470` old 3, new 5,
  1 shared; `2471` old 8/8 distinct, new 8/8 distinct (every run unique on both sides); `2475_2` old 5,
  new 6, 1 shared; `2620` old 7, new 5 (native SIGSEGV in 2/8 old and 4/8 new); `2621` old 3, new 4,
  2 shared; `2796` old 4, new 4, 2 shared; `graphs-b51` old 3, new 4, 2 shared; `windows-proc3d` old 5,
  new 4, 2 shared. twopi `graphs-arrows` 2/2 (both shared); `graphs-arrowsize` 2/1; `graphs-newarrows`
  2/1; `linux.x86-arrows_dot` 2/1; `macosx-arrows_dot` 1/2. All overlap.
- **ids:** fdp json `2095_1`, `2108`, `2470`, `2471`, `2475_2`, `2620`, `2621`, `2796`, `graphs-b51`,
  `windows-proc3d`; twopi json `graphs-arrows`, `graphs-arrowsize`, `graphs-newarrows`,
  `linux.x86-arrows_dot`, `macosx-arrows_dot`.
- #157 (`3135d895a`, `fdp_tLayout` ctr `-0.0` → `+0.0`) cannot explain any of these. It changes only
  the sign of a zero.

## V2: native variance, cached-draw luck (12 rows)

The walk caches one oracle draw and re-draws only on a divergence. Whether a row passes, diverges or
is nondeterministic depends on which variant each version's walk drew. Run sets (8 per version, distinct
hashes; "cache" = the walk's own cached draw in `~/.cache/dot-engine/oracle/xdot-oracle/<engine>/<sig>/`):

- xdot fdp `graphs-fdp` old 2 (6/2), new 2 (7/1), both shared; old cache = the minority variant.
- xdot fdp `linux.i386-b102` 8/8 single hash in each version, but the 16.1.0 walk's cached draw
  (`f2168026`) differs from that hash, so 16.1.0 has at least 2 outputs (24 more old runs: §H-runs).
- xdot fdp `2371`, `graphs-b100`, `graphs-b104`: see §H-runs.
- xdot sfdp `linux.x86-neatosplines_neato` old 3 (3/3/2), new 3 (6/1/1), all 3 shared.
- xdot twopi `graphs-arrowsize` 2/2, `macosx-arrows_dot` 2/2, `nshare-arrows_dot` 2/2,
  `windows-newarrows` 2/2. Both variants appear in both versions, and every walk cache is in its run
  set.
- map fdp `2620` conformant → oracle-error: native SIGSEGV is itself nondeterministic. cmapx crashes
  4/8 old and 5/8 new; imap 7/8 old and 5/8 new. The 16.1.1 failure record
  (`failures/16.1.1/fdp/imap/2620.json`, `timedOut:false`, 105 ms) is a crash draw.
- map fdp `windows-b29` diverged → conformant: see §H-runs.

## H1: walk oracle cap 300 s (10 rows)

The json, map and plain walks kill the oracle at `*_ORACLE_TIMEOUT_MS` = 300 000 ms (the same value
at every baseline commit; `oracle exit null` is the kill). These ids take close to or over that, so
which side of the cap a run lands on depends on load. The walks' sticky failure records give the
times directly. 16.1.0: `fdp/json/2784` 307 548 ms and `sfdp/json/2784` 307 048 ms
(`timedOut:true`). 16.1.1: `circo/json/2784` 305 266 ms and `fdp/cmapx/1652` 300 004 ms
(`timedOut:true`). Native times measured here (one run per version; `2784` alone, the rest 4-way
concurrent; 2026-11-14, 1-min load as recorded by each run):

| id | engine/format | 16.1.0 s (load) | 16.1.1 s (load) | output |
|---|---|---:|---:|---|
| `2784` | circo json | 218.5 (4.1) | 227.1 (12.2) | identical (`1f77e3b6`) |
| `2784` | fdp json | 217.7 (14.6) | 205.8 (19.1) | identical (`140ea94a`) |
| `2371` | fdp json | 246.6 (25.9) | 249.5 (21.6) | differ (`23be21fc` / `5dbe8aae`): fdp `2371` varies natively, see §H-runs |
| `2371` | fdp cmapx | 243.2 (25.9) | 244.4 (20.9) | identical (`d8d00933`) |
| `1652` | fdp cmapx | 327.8 (20.3) | 249.0 (21.5) | identical (`d1c2997b`) |
| `2371` | circo plain | 138.1 (23.8) | 128.1 (18.6) | identical (`85b2fb07`) |
| `2471` | circo plain | 172.7 (25.0) | 168.4 (22.1) | identical (`20073cb0`) |

All 14 runs exit 0. The fdp and `2784` rows take 206–328 s natively, on either side of the 300 s cap
(`1652`'s 16.1.0 run is over it), and neither version is consistently slower. The circo `2371` and
`2471` plain runs take 128–173 s even at load 19–25, so the capped 16.1.0 rows carried from the
`1d285563` walk were cap hits under that walk's load, not a 16.1.0 slowness. The flips run in both
directions (fdp `2371` json/map oracle-error → conformant, fdp `1652` map conformant →
oracle-error), as a load-dependent cap predicts. Hashes use the
engines.md method (sha1 of the sorted non-empty lines).

- `2784` (port-side: the port's `Map maximum size exceeded` is accepted only for circo in the json
  registry, so fdp/neato/sfdp/twopi surface as port-error once the oracle finishes).
- fdp `2371` json and map: the 16.1.0 rows date from the `1d285563` walks (2026-10-14) and were
  carried by resume.
- circo `2371` and `2471` plain: same origin (`1d285563`, carried through `91ba5c47` and `5c3e84d5`).
- **ids:** json `2784` × circo (accepted → oracle-error), fdp/neato/sfdp/twopi (oracle-error →
  port-error); json fdp `2371`, map fdp `2371` (oracle-error → conformant); map fdp `1652`
  (conformant → oracle-error); plain circo `2371`, `2471` (oracleError → pass).

## H2: walk port budget 3600 s (1 row)

twopi plain `tree-share-examples-world` timeout → pass. Native `-Tplain` and `-Tplain-ext` are a
single hash in 8/8 runs of each version, identical across versions. The plain walk's port budget is
max(3600 s, 3 × native) = 3600 s. The port's twopi world render takes 2261 s (`383a4f0e`), 1737 s
(`7d44fdf2`) and 2749 s (HEAD) in the xdot walks (`portMs`), so a 3600 s timeout is a load-dependent
cap flip. The timeout row dates from the `1d285563` walk and was carried by resume.

## S0: scope follows survey (1092 rows, not in `rows.tsv`)

Engine and format walks take the survey's conformant ids. The 35 ids that left (T9a S1 + `1314`) and
the 4 that entered (`1581`, `2475_1`, `2854_1`, `2855`) give 1092 rows across the 28 engine diff
tables: left with pass 475, conformant 472, accepted 16, diverged 13, oracle-error 3, oracleError 1;
entered with pass 51, conformant 48, diverged 9, oracle-error 2, oracle-nondeterministic 1,
oracleError 1. Counted from `$BASE/diff/*-<engine>.tsv` against `scope-change.txt`; not re-rendered.
T9a F1 explains them.

## §H-runs

Native runs of the V2 rows, 2026-11-14 (`$BASE/t9b/runs/`, `$BASE/t9b/hruns.py`, 4 at a time,
1 h cap, all exit 0). Counts are runs per distinct output hash.

| row | 16.1.0 | 16.1.1 | shared | reading |
|---|---|---|---|---|
| xdot fdp `linux.i386-b102` | 32/32 `5c7e71b8` | 8/8 `5c7e71b8` | 1 | The 16.1.0 walk's cached draw `f2168026` did not recur in 32 runs: a rare native variant (under ~9 % at 95 % confidence). V2 holds. |
| xdot fdp `2371` | 5 variants (`86a7f89f` ×4, 4 singletons) | 4 variants (`86a7f89f` ×5, 3 singletons) | 1 | Varies on both sides with a shared majority. V2 holds. |
| xdot fdp `graphs-b100` | 2 (`f763483b` ×7, `937e915b` ×1) | 1 (`f763483b` ×8) | 1 | Minority variant seen at 16.1.0. V2 holds. |
| xdot fdp `graphs-b104` | 2 (`f763483b` ×7, `9367b5f6` ×1) | 1 (`f763483b` ×8) | 1 | Same as `graphs-b100`. V2 holds. |
| map fdp `windows-b29` cmapx | 8/8 `765c0bb4` | 8/8 `765c0bb4` | 1 | See below. |
| map fdp `windows-b29` imap | 8/8 `4eb0cdde` | 8/8 `4eb0cdde` | 1 | imap was conformant on both sides. |

**`windows-b29` cmapx (diverged → conformant).** Native gives one output in 16 of 16 runs across the two
versions, and the 16.1.1 walk's cached draw (`map-oracle-fdp/5e317f4b3c86`) is the same `765c0bb4`.
The diverged row (`diffCount` 4, `area[44]`, maxΔ 25) was written fresh by the `1d285563` walk
(2026-10-14); the `5dd4ac0a` walk before it (2026-07-28) had it conformant. **Ruled out:** a port
change. The port exported at `1d285563` (`git archive`, `$BASE/b29/old`) and HEAD both render
`-Kfdp -Tcmapx` conformant to `765c0bb4` at the walk's ±1 tolerance (`$BASE/b29/r.mts`). **Ruled
out:** a rebuilt oracle. The 16.1.0 binary and plugins date from 2026-10-12 09:31, before that walk.
That leaves a native variant the October walk drew, which 16 runs did not reproduce (under ~17 % at
95 % confidence). V2 holds.
