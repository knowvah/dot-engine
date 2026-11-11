# Decision journal: issue #173

| Date | Task | Decision / result | Why | Review? |
|---|---|---|---|---|
| 2026-11-11 | start | Base is `cbf48285` (tip unchanged since planning). Planning's `$TMPDIR/i173/base.mjs` is byte-equal to a fresh `npm run build:js` of the base source. Oracle preflight (`oraclePreflight`, dot, `/tmp/ghl`) passed; the 18 files in `harness/native/` equal a fresh native run. | Startup checks the brief asks for. | no |
| 2026-11-11 | T1 red | `src/layout/dot/flat-adj-ranksep.test.ts` on the base source: 7 of 7 fail (six `-Tplain`, `two-labelled` `-Tdot`). | Step 2. | no |
| 2026-11-11 | T1 green | `Math.trunc(ranksep / 2)` at the six sites, each checked against its C line (`splines.c:415,428,486,618,631,684`); one comment per file. 7 of 7 pass. `compare.mjs`: every probe `head` 0 in `dot`, `xdot`, `plain`, every `headErr` `same` (table below). | AD-3. | no |
| 2026-11-11 | T1 push-forward: main-graph probes | The brief said planning found no main-graph probe. A scan of 4725 generated inputs (3 rankdirs × 9 `ranksep` values × 7 tail shapes × 25 edge shapes) found 105 where base and head differ in `-Tplain`: on all 105 the head equals native, on none did the base. A marker bundle showed they reach `B40`, `B53`, `E49`, `E58`; a second scan of 1080 flat inputs (`a:s -> c:n` over a top side) reached the two FLATEDGE sites 612 times, 35 changed, all 35 to native, the other 577 equal native on both. Six `main-*` probes were added to `harness/probes/` with native output in `harness/native/` (exit 0, stderr empty), and pinned in the test file (`-Tplain`). | The issue's "main graph: not probed" is now answered: the defect is not confined to the aux graph. Any odd main `ranksep` (0.32in = 23pt; or 0.25in / 0.07in with an edge label, halved to 9 / 3) shows it on a side-port edge. | yes: the issue's scope statement was too narrow; the fix is the same |
| 2026-11-11 | T1 mutation check | Reverting each of the six expressions alone makes at least one test fail: begin:40 → `main-begin-top-left`; begin:53 → the five `repro-*`, `main-begin-top-right`; begin:124 → `main-flat-begin`; end:49 → `main-end-bottom-left`; end:58 → `two-labelled` (both formats), `main-end-bottom-right`; end:124 → `main-flat-end`. The first `main-end-bottom-left` candidate (`a:ne -> b:sw`) also reached begin:53 and did not fail on end:49 alone, so it was replaced by `a -> b:sw` with a 3in head. | Each changed expression has a test that needs it. | no |
| 2026-11-11 | T1 write-set | Added files under `harness/`, outside the listed write-sets: six `main-*.gv` probes with their native `dot`/`xdot`/`plain` (T1), and `mark.mjs`, the gate 6 selection scan (T2). | The pinned constants need a provenance source, as the planned probes have. The launch prompt makes the write-set a plan. | no |
| 2026-11-11 | T2 red | New `applyFlatLabel` case (`nodesep` 23, `minlen` 1, `rw + lw` 50 and 25) on T1's head: fails, `expected 62 to be 61`. | Step 1; the aux `minlen` is one higher than C's. | no |
| 2026-11-11 | T2 green | `Math.trunc(edgeMinlen(e) * nodesep / 2)` at `position-aux.ts:202`, comment citing `int m0` (`position.c:222,276`). `position-aux.branch.test.ts` 62 of 62 pass. | AD-2. | no |
| 2026-11-11 | T2 no render change | `bytediff.ts` of the T1 head against the T1+T2 head on the 49 smoke ids: 1960 jobs, 1960 identical, 0 diffs, 0 capped. | Step 3: stricter than comparing two changed-row lists. Stop condition 5 not triggered. | no |
| 2026-11-11 | gate 1 | `npm run typecheck`: exit 0. | README gates. | no |
| 2026-11-11 | gate 2 | `npm test`: 574 files, 13535 tests, all passed (baseline 573 / 13521; +1 file, +14 tests). | | no |
| 2026-11-11 | gate 3 | `bash test/golden/gates.sh`: 5/5 PASS, exit 0. | | no |
| 2026-11-11 | gate 4 | `npx vitest run test/corpus test/docs`: 24 files, 2844 tests, all passed. | | no |
| 2026-11-11 | gate 5 | `bytediff.ts` base against head on the 49 smoke ids: 1960 jobs, 1960 identical, 0 diffs, 0 capped. No accepted-row or toward-native changes to list. | No smoke id reaches a side-port end box with an odd `ranksep` in a way that moves a spline. | no |
| 2026-11-11 | gate 6 selection | Marker bundle (`harness/mark.mjs`; a `$TMPDIR` copy of the head printing at each of the six halves when `ranksep` is odd, and at `m0` with the product's parity) over the 1197 applicable corpus and golden inputs, `-Kdot -Tdot`, 45 s cap, 6 lanes, 182 s. Marked: 1 id, `1949` (`B53` ×1, `E58` ×1). `m0`: 20 hits, all even, 0 odd (AD-2 holds on the corpus). Capped: 18 large ids (`1864`, `tree-share-examples-4elt`, `-world`, `1652`, `1718`, `2064`, `2095_1`, `2108`, `2343`, `2371`, `2471`, `2475_1`, `2593`, `2621`, `2646`, `2834`, `graphs-b100`, `graphs-b104`). None of the 18 sets `ranksep`, so their main `ranksep` is 36 or 18; an odd value then needs a labelled flat-adjacent group with a port, and only `2646` has ports on edges, with no edge label. They cannot reach the changed value. Selected: `1949` plus the nine ids that reach `makeFlatAdjEdges` (`1444`, `1444-2`, `1949`, `241_0`, `241_1`, `2437`, `graphs-ports`, `linux.x86-ports_dot`, `nshare-ports_dot`): nine distinct ids. | T2's rule: marker hits, plus the aux ids. | no |
| 2026-11-11 | gate 6 result | `compare.mjs` on the nine ids, `dot`/`xdot`/`plain`: every row `base` 0 and `head` 0, every `baseErr`/`headErr` `same` (table below). No id moves away from native; `1949` reaches the changed halves and its output is equal to native before and after. Load was 15 at the first check (another project's test run), so the comparison waited until it fell to 11. | Pass. | no |
| 2026-11-11 | other `int` halves | Read every C division on `GD_ranksep`/`GD_nodesep` under `lib/common` and `lib/dotgen` against the port: `class2.c:44` (`classify.ts:177`, floors), `dotsplines.c:274` (`Splinesep`, three sites truncate), `routespl.c:1006-1008` (`straight-edges.ts:256-257`, truncates), `rank.c:180` (`rank.ts:171`, floors), `dotsplines.c:2192,2213` (`/ 2.`, float in C and in the port). None left as a float where C is `int`. The issue's last line asks how `ranksep` is stored: `graph-init.ts:125,134` round with `points()` as `POINTS` does (`input.c:659,673`), the marker printed integers (23, 9, 3), and the aux and component copies assign the stored value. | The brief asks for a `follow-up` issue if one is found; none was. | no |

### T1: `compare.mjs`, base `cbf48285` against the T1 head

Columns: native line count, native lines missing from base, from head, stderr
against native.

```
input	format	lines	base	head	baseErr	headErr
main-begin-top-left.gv	dot	14	2	0	same	same
main-begin-top-left.gv	xdot	23	4	0	same	same
main-begin-top-left.gv	plain	5	2	0	same	same
main-begin-top-right.gv	dot	14	2	0	same	same
main-begin-top-right.gv	xdot	22	4	0	same	same
main-begin-top-right.gv	plain	5	2	0	same	same
main-end-bottom-left.gv	dot	14	5	0	same	same
main-end-bottom-left.gv	xdot	22	12	0	same	same
main-end-bottom-left.gv	plain	5	4	0	same	same
main-end-bottom-right.gv	dot	15	5	0	same	same
main-end-bottom-right.gv	xdot	24	13	0	same	same
main-end-bottom-right.gv	plain	5	4	0	same	same
main-flat-begin.gv	dot	24	9	0	same	same
main-flat-begin.gv	xdot	40	24	0	same	same
main-flat-begin.gv	plain	8	7	0	same	same
main-flat-end.gv	dot	25	3	0	same	same
main-flat-end.gv	xdot	41	7	0	same	same
main-flat-end.gv	plain	8	2	0	same	same
repro-multiline.gv	dot	21	2	0	same	same
repro-multiline.gv	xdot	34	4	0	same	same
repro-multiline.gv	plain	6	2	0	same	same
repro-w1.2.gv	dot	20	2	0	same	same
repro-w1.2.gv	xdot	32	4	0	same	same
repro-w1.2.gv	plain	6	2	0	same	same
repro-w1.25.gv	dot	20	2	0	same	same
repro-w1.25.gv	xdot	32	4	0	same	same
repro-w1.25.gv	plain	6	2	0	same	same
repro-w1.3.gv	dot	20	2	0	same	same
repro-w1.3.gv	xdot	32	4	0	same	same
repro-w1.3.gv	plain	6	2	0	same	same
repro-w1.4.gv	dot	20	2	0	same	same
repro-w1.4.gv	xdot	32	4	0	same	same
repro-w1.4.gv	plain	6	2	0	same	same
two-labelled.gv	dot	23	9	0	same	same
two-labelled.gv	xdot	37	22	0	same	same
two-labelled.gv	plain	6	5	0	same	same
```

### Gate 6: `compare.mjs`, base against the final head, nine corpus ids

```
input	format	lines	base	head	baseErr	headErr
1444-2.dot	dot	15	0	0	same	same
1444-2.dot	xdot	24	0	0	same	same
1444-2.dot	plain	5	0	0	same	same
1444.dot	dot	15	0	0	same	same
1444.dot	xdot	24	0	0	same	same
1444.dot	plain	5	0	0	same	same
1949.dot	dot	239	0	0	same	same
1949.dot	xdot	326	0	0	same	same
1949.dot	plain	45	0	0	same	same
241_0.dot	dot	76	0	0	same	same
241_0.dot	xdot	126	0	0	same	same
241_0.dot	plain	27	0	0	same	same
241_1.dot	dot	132	0	0	same	same
241_1.dot	xdot	196	0	0	same	same
241_1.dot	plain	39	0	0	same	same
2437.dot	dot	16	0	0	same	same
2437.dot	xdot	26	0	0	same	same
2437.dot	plain	5	0	0	same	same
ports.gv	dot	81	0	0	same	same
ports.gv	xdot	155	0	0	same	same
ports.gv	plain	45	0	0	same	same
ports_dot.gv	dot	81	0	0	same	same
ports_dot.gv	xdot	155	0	0	same	same
ports_dot.gv	plain	45	0	0	same	same
ports_dot.gv	dot	81	0	0	same	same
ports_dot.gv	xdot	155	0	0	same	same
ports_dot.gv	plain	45	0	0	same	same
```

The two `ports_dot.gv` blocks are `linux.x86-ports_dot` and `nshare-ports_dot`.
