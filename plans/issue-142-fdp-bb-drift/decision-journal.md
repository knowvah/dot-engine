# Decision journal: issue #142

| Date | Task | Decision / Mechanism | Files | Gate result |
|------|------|----------------------|-------|-------------|
| 2026-11-11 | start | Base is `f544f206` (the tip had not moved). Oracle preflight for `fdp` passed on the stock plugin dir (`$TMPDIR/issue142-ghl`) and on the instrumented one (`$TMPDIR/issue142-gv/gv`). Reproduced: `fdp.gv` xdot differs on clusterA `bb` x0 only, `1.5987e-14` port, `3.1974e-14` native (stock 5 of 6 runs in the `a6e0163b` class, noaddr 4 of 4). | — | — |
| 2026-11-11 | T1 | Scratch build: only `fdpgen/{layout,tlayout,xlayout}.c` are copied, patched and recompiled with the oracle's own flags and linked ahead of `libfdpgen.a` on the oracle's link line (part 11 T7's method), not an rsync of the whole tree: it reads `~/git/graphviz` and writes only `$TMPDIR`. With traces off the instrumented plugin prints stock's bytes on `fdp.gv` (`a6e0163b`). | `harness/build-native.sh`, `trace-native.patch`, `gvts142.h` | — |
| 2026-11-11 | T1 | Trace labels use the node's ordinal in `agfstnode` order plus its name; port-node names (`_port_<g>_(<id>)_(<id>)_<seq>`) are debug text that differs between C and the port (edge AGSEQ, real-node ND_id) and are normalised before comparing. They order nothing. | `harness/run-trace.sh` | — |
| 2026-11-11 | T1 | **Class (b), first divergence = Apple `atan2` against V8** (artifact below). Beyond the brief: a counterfactual (the port run with native's traced libm results injected) to prove libm is the only cause of the printed drift; it also exposed two unmodelled fma contractions in `ports.ts` (class (a), no effect on either traced xdot). T2 fixes those two under the (a) rules and records (b). | `harness/port-trace.ts`, `port-trace.patch`, `firstdiff.mjs`, `libm-check.{c,mjs}`, `fma-check.ts`, `multi-edge.gv`, `evidence/base-*.txt` | `git diff --stat f544f206.. -- src/` empty |
| 2026-11-11 | T2 | **Scope decision.** T1's class is (b), which the brief closes with no `src/` change. The counterfactual and the disassembly also found two class (a) defects in `ports.ts`. They are fixed here under the (a) rules (red test from a native trace, fix at the origin statement, one commit each, re-trace), because the brief's objective names an unmodelled contraction in `src/layout/fdp/` as the thing to fix and both sit on the traced path of the issue's own inputs. So gate 5 runs and the squash is a `fix`. Two fixes; the limit of three is not reached. | `src/layout/fdp/ports.ts`, `src/layout/fdp/derive.branch.test.ts` | — |
| 2026-11-11 | T2 | **Fix 1** (`7bfd401b`): `getEdgeList`'s `dist2` is `fma(dx, dx, dy * dy)` as `layout.c:569` compiles. Red on the base with the port's traced `0x1.1216cb0f64fe2p-2`, green with native's `0x1.1216cb0f64fe1p-2`. | `ports.ts`, `derive.branch.test.ts` | fdp tests 89/89 |
| 2026-11-11 | T2 | **Fix 2** (`e742e778`): `genPorts`' reversed fan starts at `fma(delta, cnt - 1, er.alpha)` as `layout.c:640` compiles. Red on the base with `0x1.abfa2da8a191ep-1`, green with native's `0x1.abfa2da8a191dp-1`; the test pins all 7 traced port angles. | `ports.ts`, `derive.branch.test.ts` | fdp tests 89/89 |
| 2026-11-11 | T2 | **Re-trace on the head (AD-5).** With native's libm injected: `fdp.gv` 0 of 4506 trace lines differ, #142's three renders 0 of 25890, `multi-edge.gv` 0 of 19113, and all three xdots equal native's bytes. Raw (no injection) the first difference is a libm call on each. | `harness/evidence/head-*.txt` | — |
| 2026-11-11 | T2 | **#142's case** (`subg.gv`, `cluster_k`, `root` mode, native noaddr): render 3's `cluster_k` `bb` x0 is `-3.2742e-11` native, `1.6371e-11` port on the base and on the head (the port's three renders are byte-equal on base and head). Its first divergence is the same call site, `atan2` at `layout.c:568`, in render 1. | `harness/evidence/{base,head}-subg-cluster_k-root.txt` | — |
| 2026-11-11 | T2 | **Trace survey (beyond the brief), head, libm injected.** Byte-equal to native in xdot: `graphs-fdp`, `tree-doc-dotguide-clust2`, `2183`, `56`, `graphs-ldbxtried`, `tree-graphs-directed-ldbxtried`, `graphs-b15`, `share-ldbxtried`, `graphs-b51`, and the nine clustered tree inputs. First difference elsewhere: `2242` (cluster margin 12 against 8, #210), `1436` (component sequence, #211), `crazy`/`viewport`/`mode` (one ulp inside `x_layout`, #212). Skipped: the two `root_circo` and `b103` (over 100 kB). 887 distinct libm calls: Apple `atan2` correctly rounded 175 of 175 (V8 differs on 32), `cos` 348 of 356 (12), `sin` 346 of 356 (10). | `harness/trace-survey.sh`, `evidence/head-trace-survey.txt` | — |
| 2026-11-11 | T2 | **Questions and new work filed.** #209 `needs-ruling`: model `atan2` (and `sin`/`cos`) for fdp, or keep the clustered rows as accepted drift; rows named there, left as they are. Follow-ups: #210, #211, #212, #213 (`normalize`'s rotation is contracted in the oracle; shared by four engines, so not fixed in an fdp mission). The attribution of `2242` and `1436` as `drift-exonerated` is questioned in #210 and #211, not edited (AD-4; stop 6 is replaced by the issue, per the driver's instruction that a question blocking some rows does not stop the mission). | — | — |
| 2026-11-11 | T2 | **Write-set.** Outside T2's planned set: `harness/**` and `evidence/**` additions after T1's commit (the head re-trace and gate 6 records), and `.agent-notes/issue-142.md`. No file outside the worktree was written except `$TMPDIR/issue142-*`. | — | — |
| 2026-11-11 | gates | 1 `npm run typecheck` exit 0. 2 `npm test` exit 0 (571 files, 13488 tests: +2). 3 `bash test/golden/gates.sh` 5 passed, 0 failed. 4 `npx vitest run test/corpus test/docs` exit 0 (24 files, 2844 tests); `npm run docs:i18n-status` 0 stale. 5 smoke bytediff base `f544f206` against head `e742e778`: 1960 jobs, 1960 identical, 0 diffs, 0 capped; accepted-row changes: none; toward-native changes: none. 6 below. | — | all pass |
| 2026-11-11 | gate 6 | **How the ids were chosen:** the brief's set (`graphs-fdp`, the 16 `attribution-fdp.json` members, nine clustered tree inputs; 25 distinct files) through `compare.mjs` against the stock oracle; plus, because only fdp with clusters reaches `ports.ts`, a base-against-head bytediff of `-Kfdp -Txdot` over every applicable corpus input whose source contains `cluster` and is under 200 kB (280 ids; 8 larger ones skipped: `tree-share-examples-world`, `1879`, `2108`, `2470`, `2471`, `2475_1`, `2475_2`, `2621`). **Result:** `compare.mjs`: 70 scored rows, `lost=0` on every one, head equals base on every one; 5 `native-varies` rows (`fdp.gv` xdot and plain, `56.dot` plain, `mode.gv` plain, `b51.gv` plain). Base and head are byte-equal on all 66 outputs of the 22 small and medium files. Cluster bytediff: 280 identical, 0 diffs, 0 capped. No corpus output changes; the fixes are visible only on `harness/multi-edge.gv` (raw head against native: 100 of 151 xdot lines, max 76 pt, down from 130 pt on the base; with libm injected, equal bytes). Full table: `harness/evidence/gate6-compare.txt`. | `harness/evidence/gate6-*.txt` | pass |

## T1 diagnosis artifact

**Class:** (b) for the drift of #142 (platform libm). Two class (a) port defects found
behind it.

**Mechanism (the drift).** Apple's libm `atan2` returns a different last bit from V8's
`Math.atan2` on identical inputs. fdp calls it on the derived-graph edge directions to
place a cluster's boundary ports; the 1-ulp angle moves the ports, the 300 `tlayout`
iterations of the cluster's interior amplify it, and the difference reaches the
cluster's size and the derived node's position, whose cancellation `pos - width/2`
is the printed `bb` x0. `sin` and `cos` at the port placement differ the same way on
other inputs (#142's render 3).

**Origin.** C `lib/fdpgen/layout.c:568` (`erecs[i].alpha = atan2(dy, dx)` in
`getEdgeList`); port `src/layout/fdp/ports.ts:79` (`Math.atan2(dy, dx)`). On `fdp.gv`,
trace line 908 (the first differing line; the root component's 300 iterations before it
are bit-equal):

| | value (`%a`) |
|---|---|
| `dy` (both) | `-0x1.9850c86f38334p-2` |
| `dx` (both) | `0x1.029daaebe0c2cp-1` |
| native `atan2` | `-0x1.562613f5008a5p-1` |
| port `atan2` | `-0x1.562613f5008a4p-1` |

Class check: `harness/libm-check.c` (`cc -O0`) on those inputs prints
`-0x1.562613f5008a5p-1`; `harness/libm-check.mjs` (V8, node v26.3.1) prints
`-0x1.562613f5008a4p-1`. macOS 27.2. Against a 300-bit `mpmath` value Apple's result
is 0.488 ulp from the true value (the correctly rounded double) and V8's is 0.512 ulp.

**Causal chain (`fdp.gv`).** `getEdgeList(clusterA)` angle (1 ulp) → `genPorts` port
angles `pp[].alpha` → `initPositions` port positions `Wd*cos(alpha)`
(`tlayout.c:501-502`) → clusterC's initial position (the mean of its two ports) →
300 `tlayout` iterations inside clusterA → clusterA's `BB.UR` → `ND_width(dn)` in the
root → `BB(clusterA).LL.x = ND_pos(dn)[0] - ND_width(dn)/2` (`layout.c:894`) = 2 ulp
(native) against 1 ulp (port) of a value near 1.8 → `setBB` × 72 → `3.1974e-14`
against `1.5987e-14`.

**Proof that libm is the only cause of the printed drift (counterfactual).** The port
re-run with native's traced libm result returned wherever the arguments are bit-equal
(`port-trace.ts <file> <out> <native.tr>`):

| input | libm calls | calls where V8 ≠ Apple | port xdot against native | trace lines differing |
|---|---|---|---|---|
| `fdp.gv` (first render) | 15 | 1 (`atan2`, above) | 0 lines differ (was 1) | 1 of 4506 (`dist2`, below) |
| #142: `subg.gv`, `cluster_k`, `root` mode, 3 renders | 21 | 5 (3 `atan2`, 1 `sin`, 1 `cos`) | 0 lines differ (was 1: render 3, `cluster_k` `bb` x0, `-3.2742e-11` native, `1.6371e-11` port) | 1 of 25890 (`dist2`) |

The five calls on #142's case, each reproduced by `libm-check.c` and `libm-check.mjs`:

| call (site) | Apple | V8 |
|---|---|---|
| `atan2(-0x1.4960e3329db3ap-1, -0x1.e0d2deb210e46p-4)` (`layout.c:568`; the first divergence, trace line 1814, render 1) | `-0x1.c0542daaf4c46p+0` | `-0x1.c0542daaf4c47p+0` |
| `sin(-0x1.c0542daaf4c46p+0)` (`tlayout.c:502`) | `-0x1.f7aee405bf893p-1` | `-0x1.f7aee405bf894p-1` |
| `atan2(0x1.2519999999999p+7, 0x1.1ce147ae147adp+6)` (`tlayout.c:474`, render 3's pinned ellipse) | `0x1.1e5165d00ba1cp+0` | `0x1.1e5165d00ba1dp+0` |
| `atan2(0x1.191a409829b7p+5, 0x1.e11e81eff8f6ep+6)` (`layout.c:568`) | `0x1.230bd0e1a794ap-2` | `0x1.230bd0e1a7949p-2` |
| `cos(0x1.230bd0e1a794ap-2)` (`tlayout.c:501`) | `0x1.eb754da610ba7p-1` | `0x1.eb754da610ba8p-1` |

On all six differing calls Apple's result is the correctly rounded double (0.28 to
0.49 ulp from the `mpmath` value) and V8's is not (0.51 to 0.72 ulp). Six samples; no
claim that Apple's functions are correctly rounded in general.

**Class (a) defects found by the counterfactual and by the disassembly** (neither changes
a traced xdot; both are statements the port computes differently from the oracle
binary on equal inputs):

1. `layout.c:569` `erecs[i].dist2 = dx * dx + dy * dy;` is contracted:
   `fmul d1, d9, d9` / `fmadd d1, d8, d8, d1` at `0x63154` of the oracle's
   `libgvplugin_neato_layout.8.dylib` (`d8` = dx, `d9` = dy), that is
   `fma(dx, dx, dy*dy)`. Port `ports.ts:79` computes `dx * dx + dy * dy`. Traced
   (`fdp.gv` counterfactual line 1827): dx `-0x1.072242ebd34afp-1`, dy
   `-0x1.e73f0e946129cp-5`, native `0x1.1216cb0f64fe1p-2`, port
   `0x1.1216cb0f64fe2p-2`; `fma-check.ts` gives native's value for `fma(dx, dx, dy*dy)`
   and the port's for the plain form and for `fma(dy, dy, dx*dx)`. `dist2` only breaks
   ties between equal angles in `ecmp`.
2. `layout.c:640` `angle += delta * (cnt - 1);` (`genPorts`, the reversed fan) is
   contracted: `scvtf d2, w13` / `fmadd d2, d0, d2, d1` at `0x6334c` (`d0` = delta,
   `w13` = cnt - 1, `d1` = `er->alpha`), that is `fma(delta, cnt - 1, alpha)`. Port
   `ports.ts:110` computes `er.alpha + delta * (cnt - 1)`. Not reached with an inexact
   product on `fdp.gv` (cnt = 2). Traced on `harness/multi-edge.gv` (a cluster pair
   joined by 7 real edges): alpha `0x1.40be85dab1e28p-1`, delta
   `0x1.1df46a2529d39p-5`, cnt 7, native first reversed angle `0x1.abfa2da8a191dp-1`,
   port `0x1.abfa2da8a191ep-1`; `fma-check.ts` gives native's value for the fused form.
   On that input the raw port xdot differs from native on 100 lines.

**Ruled out.**

- The root component's force solve: all 300 `tlayout` iterations (grid mode) of the
  root derived graph are bit-equal on both inputs before the first `atan2`.
- `cos`/`sin` on `fdp.gv`: all 14 other libm calls of that render return equal bits in
  V8 and Apple libm.
- `xlayout`, `finalCC`, `recordPositions`, `evalPositions`, `setBB` and every modelled
  `tlayout` contraction: with libm injected, every traced line of those phases is equal
  to native's on `fdp.gv` (4506 lines) and on #142's three renders (25890 lines).
- Native's heap-address order: every native trace ran with `GVTS_NOADDR=1`; the three
  noaddr runs of each input printed one hash.
- The instrumentation: the instrumented plugin with traces off prints stock's bytes.
- A ledger contradiction (stop 6): none. The drift is the `sin`/`cos` class the ledger
  accepts, extended to `atan2`, which AD-2 already named as a candidate.

**Out of the trace's reach, noted only:** `neatogen/adjust.c:758-759` (`normalize`'s
rotation, port `normalize.ts:98-103`) has the shape of a contracted expression; it
runs only when the `normalize` attribute is set, and no traced input sets it. Filed as a
follow-up, not fixed here.
