<!-- SPDX-License-Identifier: EPL-2.0 -->

# Known divergences from C Graphviz

@knowvah/dot-engine aims for the closest possible fidelity to the canonical C
implementation. The C source is the specification; an unlisted difference is
treated as a defect, not accepted behavior.

> **What "match" means here.** The corpus parity verdict named `conformant`
> is a **tight deterministic tolerance**, *not* literal byte-for-byte SVG
> equality: numeric coordinates and paths must agree within **±0.01** and all
> non-numeric content (tags, colors, text) must be exactly equal
> (`compareSvg(…, 'deterministic')`). Throughout this document, "match" and
> "conformant" refer to that tolerance verdict. Full definition:
> [Conformance](./conformance.md).

Where the output *does* differ, it falls into exactly one of three classes:

1. **Accepted deltas** — differences we have investigated, understand to the root
   cause, and have **deliberately chosen not to make conformant**. Each is bounded,
   characterized, and justified below. These are not bugs and will not be
   "fixed" without a specific, separately-scoped reason.
2. **Tracked long tail** — known gaps that *will* be closed, each with an
   oracle-pinned fix. These live with live counts in
   [`test/corpus/PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md).
3. **Non-goals** — intentional scope boundaries (formats and mechanics we never
   set out to reproduce).

The authoritative, continuously-updated records are
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md)
(per-input parity dashboard vs. native `dot`) and
[`plans/port-catalog/README.md`](https://github.com/knowvah/dot-engine/blob/main/plans/port-catalog/README.md)
(algorithm-level port-status inventory).

The **machine-readable** source of truth for which graphs are *accepted* (class 1
below) is
[`test/corpus/accepted-divergences.json`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/accepted-divergences.json).
The tooling joins it at report time: `PARITY-dot.md` splits **accepted deltas** from
the **tracked** backlog, and the rules gate sources its allowlist from it. The
prose sections below explain each entry (A1 is live; A2, A3 and A8 are closed and
kept as history; A10 is live as a port-error acceptance in the per-engine
registries). Two CI tests keep this list from silently rotting:
`accepted-divergences.test.ts` enforces that every accepted graph still diverges,
and `registry-staleness.test.ts` fails when an entry in a per-engine registry no
longer matches its committed walk row.

---

## Accepted deltas (we deliberately do not make conformant)

We accept a delta — rather than chase byte-parity — only when **all** of the
following hold:

- The root cause is a **portability constraint** (something the JavaScript/
  browser runtime cannot reproduce exactly), not a logic error in the port.
- The difference is **sub-perceptual** and provably **bounded**.
- A fix would have **disproportionate cost and blast radius** relative to the
  reward (typically: it would touch a shared primitive used by hundreds of
  already-conformant graphs, risking regressions for a fraction-of-a-pixel
  gain).

When we accept a delta we characterize it here so consumers are never surprised.
Graphs affected by an accepted delta are validated against a **structural /
tolerance** bar instead of a byte bar.

### A1. Floating-point determinism (force-directed engines)

**Affected:** `neato`, `fdp`, `sfdp`, `circo`, `twopi`, `osage` (the iterative,
spring-model engines). The `dot` engine's *layout* is **not** affected by this
iterative-model determinism; the former `dot` spline-routing floating-point
deltas (A3, A8) are closed and kept below as history.

> **Scope, historically an unmeasured caveat — now partially measured.** The
> **main dot-engine SVG survey** (`test/corpus/survey.ts`) is still
> **dot-only**: the native oracle runs under `GVBINDIR=/tmp/ghl`, which
> symlinks **only** the `core` + `dot_layout` plugins
> (`test/corpus/gen-headless-gvbindir.sh` loops over exactly `core dot_layout`
> — no `neato`/`fdp`/`circo`/`twopi`/`osage`/`sfdp` layout plugin is present),
> and both oracle and port are invoked with the `dot` engine. So corpus ids
> like `*_neato` / `*_circo` / `root_twopi` are *filenames* laid out with
> `dot` on that survey, not their native engine, and A1 matches **zero**
> graphs there — not because the engines are proven conformant, but because
> that particular survey never exercises them.
>
> **But all six A1 engines now have their own native-engine survey**, via
> `test/corpus/engine-walk.ts` + `parity-report.ts` (`GVBINDIR`-independent —
> each spawns `dot -K <engine> -Txdot` directly), at two different rigor
> levels documented separately below: `circo`/`twopi`/`osage` run at the same
> **±0.01 deterministic** tolerance as the dot survey with per-id root-cause
> triage ("Engine-track acceptance" below); `neato`/`fdp`/`sfdp` run at a
> looser **±0.5 characterization** tolerance with no per-id triage yet
> ("Iterative-engine characterization" below). Current cross-engine numbers:
> [`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md).

**Characterization.** These engines run iterative numerical layouts whose results
depend on floating-point rounding — specifically fused multiply-add (FMA) and
`Math.pow`, which can differ across JavaScript engines and CPU architectures. The
port matches C's operation order where it can (`src/common/fma.ts`,
`src/common/arm-pow.ts`) — e.g. `sfdp` pins to ~6 significant digits against the
native oracle with a matched PRNG and `fma` — but exact, identical-coordinate
reproduction is **not guaranteed cross-platform**. Topology is preserved; the
potential divergence is in fine node coordinates.

**Why accepted.** This is a hard constraint of running in JS, not a design choice
— the same family as the (since closed) A3/A8 `hypot`/FMA sensitivities. There is no way to guarantee
bit-identical transcendental/FMA results across all target runtimes, so a byte bar
would be untestable rather than merely expensive. **Assessing A1** (as opposed to
just caveating it) required a separate native-engine parity track — built
2026-07-11 as `test/corpus/engine-walk.ts` + `parity-report.ts`, surveying each
input under its own engine instead of `dot`. The honest ceiling on that work is
to **narrow** A1 to "no active divergence on the reference platform," never to
eliminate the cross-platform caveat; the results so far (below) hold to that
ceiling: `circo`/`twopi`/`osage` have each surfaced and root-caused a handful of
genuine A1/A9 instances, and `neato`/`fdp`/`sfdp` now sit at 90.5/96.5/68.1%
within 0.5pt of native over the 929-item universe (graphviz 16.1.0), meaning
the ported arithmetic (`fma.ts`, `arm-pow.ts`, matched PRNG) holds for most
graphs — and every diverged id of the 929-item universe is individually
attributed by injection (solver drift vs. port defect) rather than left as
untriaged drift. See the iterative-engine characterization below.

**Engine-track acceptance: twopi arrows family.** <a id="a1-twopi-arrows-family"></a>
The blockquote above describes the dot-engine SVG survey, where A1 matches zero
graphs; the separate `twopi` **xdot engine track** (`parity-twopi.json`, native
`dot -K twopi -Txdot` oracle, `test/corpus/engine-walk.ts`) *does* run under its
native engine and surfaces a concrete, verified A1 instance on 9 corpus ids:
`graphs-arrows`, `graphs-newarrows`, `graphs-arrowsize`, `linux.x86-arrows_dot`,
`macosx-arrows_dot`, `nshare-arrows_dot`, `share-newarrows`, `windows-newarrows`,
and (added 2026-07-28, new to the 905-item universe) the directed/ sibling
`tree-graphs-directed-oldarrows` — each diverging on a single dominant edge
(`Z->I` or `i->Z`; 12–64 draw-op diffs). Injection A/B (decision journal, 2026-07-10 "injection A/B verdicts:
twopi arrows family EXONERATED..." entry) proved the mechanism directly:
dumping native `spline_edges`'s entry `ND_pos` and injecting it into the
port's `splineEdgesShifted` produces **fully conformant** output on
`graphs-arrows` (`Z->I` becomes byte-identical to the oracle, same 7/14-point
spline) — so the divergence is 100% pre-routing node-position drift out of
`twopi`'s PRISM overlap-removal solver, and the port's spline routing/emission
is exonerated. The visible symptom on 6 of the 8 ids is a bezier point-count
flip (`unfilled_bezier[ptCount]: 8 vs 14`): `Proutespline`'s fitted piece count
is sensitive to which side of an obstacle boundary the drifted node position
lands on, so a sub-ULP position difference downstream of PRISM's iterative
solve flips the fitted spline's segment count (the other 2 ids,
`graphs-arrowsize`/`nshare-arrows_dot`, show the same drift as a smaller
position-only delta with no piece-count flip). Accepted at the engine-track
level via `test/corpus/accepted-divergences-engines.json`, joined into
`PARITY-twopi.md` by `parity-report.ts` — the same join `accepted.ts` performs
for the dot-track `PARITY-dot.md`.

The `oldarrows` RCA (2026-07-28) pinned the exact flip site of the family's
point-count symptom. Its `i`–`Z`–`I` fan is collinear on a ring diameter, and
pathplan `directVis`'s `intersect()` blocks a sight-line when an obstacle
vertex lies "on" the segment — where `wind()`'s 1e-4 collinearity tolerance
makes even a node 270pt away from the segment count as collinear, and
`inBetween()` (which assumes collinearity) then degenerates to testing only
the **x projection**: the vertex blocks iff its x falls strictly inside the
ULP-wide interval between the two endpoint x coordinates. Which of the two
mirrored radial edges bends therefore hinges on the last-ULP ordering of
three nominally equal x values out of PRISM's solve — C bends `Z->I`
(node `i`'s axis vertex lands inside its interval), the port bends `i->Z`
(node `I`'s vertex lands inside its own). Replicating `directVis` offline on
each side's dumped obstacle set reproduces each side's decision exactly, and
injecting the oracle's pre-routing `ND_pos` into the port yields 0 diffs
(`attribution-twopi.json`) — routing and emission are byte-faithful.

`1855` is the radial/star **mirror** variant of the same pre-routing PRISM FP
mechanism (accepted 2026-07-11): its 31 leaves are exactly cocircular, so the
star layout is reflection-symmetric and PRISM's overlap removal sits on a
symmetry-unstable equilibrium; a 1-ULP V8-vs-libm `cos`/`sin` difference at 5
leaf angles in `circleLayout`'s `setAbsolutePos` selects the opposite mirror
basin, and the whole radial layout lands as the exact x-axis mirror of the
oracle's (max node displacement 6.04pt, bb preserved). Injection A/B proved
both directions: feeding C's exact `circleLayout` positions into the port's
PRISM reproduces the oracle node-for-node (3e-14), and restoring only the 5
ULP-divergent leaf positions flips the entire layout back to the port's
mirror. Full RCA: `.agent-notes/twopi-radial-drift-rca.md` (decision journal
2026-07-11).

The same star diverges on the `circo` track (accepted 2026-10-16, 599
draw-op diffs, at most 0.71pt). The port mirrors clang's FMA contraction and
evaluation order in `circpos.c`, so 31 of the 32 positions entering PRISM are
bit-exact. The last one is off by 1 ULP, because V8 and Apple libm round
`cos`/`sin` differently at three child angles in `positionChildren`. PRISM's
Delaunay triangulation then flips one nearly cocircular diagonal on the mirror
axis. Injection A/B: given the native `cos`/`sin` values, the port matches the
oracle. Given V8's values, the native build produces the oracle's layout in 22
of 30 runs and the port's layout in the other 8, because GTS orders its edges
by allocation address.

**Iterative-engine characterization: neato/fdp/sfdp.** <a id="a1-iterative-characterization"></a>
Unlike the `circo`/`twopi`/`osage` engine tracks above, `neato`/`fdp`/`sfdp`
are **not** yet triaged per-id — `engine-walk.ts` records a `tolerance: 0.5`
field for these three and `parity-report.ts` renders them in a separate
"Iterative engines (±0.5 characterization)" section of
[`PARITY.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY.md),
explicitly **not** comparable to the ±0.01 deterministic pass rates elsewhere
in this document. Current counts against graphviz 16.1.0 (929-item
universe; pass % leaves out inputs the C oracle cannot render, per
[Conformance](./conformance.md)):

| engine | surveyed | within ±0.5pt | non-conformant | port error / timeout | oracle error |
|---|---:|---:|---:|---:|---:|
| `neato` | 929 | 840 (90.5%) | 86 | 1 | 1 |
| `fdp`   | 929 | 893 (96.5%) | 29 | 2 | 4 |
| `sfdp`  | 929 | 633 (68.1%) | 294 | 1 | 0 |

(The `fdp` pass rate rose from 77.5% because the earlier committed walk
predated the port state of the previous mission.)

(The first sweep, 2026-07-11 at 762 items, measured 263/311/260 within
±0.5pt — the jump to the current rates came from per-id fixes landed since,
chiefly neato's unported `user_pos`/`P_SET` handling, the engine-init
consolidation, and the `setEdgeType` macro-vs-function fix.)

Unlike at first sweep, every diverged row of the 929-item universe is
individually attributed against graphviz 16.1.0: the injection harness
(`test/corpus/attribute-divergence.ts`) feeds the native oracle's
pre-routing `ND_pos` into the port and re-compares, and every current
diverged id is `drift-exonerated` (the port's routing and emission
reproduce the oracle exactly once the solver drift is removed) except three.
Three are separately accepted per-id residuals: `241_0`'s CDT incircle tie
on fdp and sfdp, and sfdp `2556`'s NaN layout. fdp `2471` and sfdp `2371`
used to keep edge-label positions (`lp`) that differed after injection, i.e.
the xlabel placer picked a different candidate. `2471` cleared once the
port's `dotneato_closest` rounded like clang's fused de Casteljau evaluation
and DIST2: its edge-label anchors had differed by 1-2 ULP, which tipped the
placer's strict enclosure test. `2371` cleared once the port's R-tree copied
rects by value, as C does. The native fdp layout of `2471` varies from run
to run, so its row records one run. (sfdp `42`
is A1 drift, see [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md).)
The class acceptance below formalizes the exonerated set; live counts in
the per-engine dashboards
([`PARITY-neato.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-neato.md),
[`PARITY-fdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-fdp.md),
[`PARITY-sfdp.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-sfdp.md)).

**A1-drift class acceptance (iterative engines, computed membership).**
<a id="a1-drift-iterative-engines"></a> `test/corpus/accepted-divergences-engines.json`
carries one `"A1-drift"` **class** entry per iterative engine (`neato`,
`fdp`, `sfdp`) — `{ class: true, attributionFile, ref }` — distinct from the
per-id entries used by the `circo`/`twopi`/`osage` tracks above (D2,
`plans/iterative-parity-campaign/decisions.md`). Unlike a per-id entry, class
membership is never hand-enumerated in the registry: `parity-report.ts`
computes it at report time from the matching `attribution-<engine>.json`
(T1's injection-attribution harness, `test/corpus/attribute-divergence.ts`)
— every diverged id whose native pre-routing `ND_pos` was injected into the
port and re-compared conforms at ±0.5 gets `verdict: 'drift-exonerated'` in
that file, meaning the two engines' iterative solvers converged to
numerically different but each internally consistent layouts (a floating-point
accumulation difference per the A1 characterization above, not a port routing
or emission bug). Per-id evidence — bucket shape, base vs. injected diff
count, uniform-translation/mirror detection — lives in the attribution
artifact itself, not duplicated into this doc or the registry (D2). An id
that later starts passing outright, or whose re-attribution changes verdict,
drops out of the class automatically on the next report regen — no stale
acceptance edit required, and no guard-test failure. Engines whose
`attribution-<engine>.json` has not been generated yet render the class as
"attribution pending" with zero members, identical to having no acceptance at
all — the class entry is allowed to precede its data (see
`test/corpus/accepted-divergences-engines.test.ts`).

<a id="a2-text-measurement-font-metrics-label-driven-layout"></a>

### A2. Text measurement (font metrics) → label-driven layout — CLOSED

**Status (2026-07-01): closed.** No corpus id is accepted under this class
any more; the section is retained as historical documentation of the
mechanism and of the injectable-`TextMeasurer` seam that neutralized it.
Successive text-measurement fixes (the `EstimateTextMeasurer` cutover,
font-aware vertical metrics, the non-ASCII UTF-8-byte fix) resolved nearly
every label-driven layout divergence that used to live here. **`proc3d`** —
the former canonical A2 example — is fully **`conformant`** on all three
corpus dirs (`graphs-`/`share-`/`windows-proc3d`): matching bbox, zero
path-data diffs, zero label-anchor diffs.

**The last members retired (2026-07-01).** The **`NaN` family**
(`graphs-NaN` / `share-NaN` / `windows-NaN`) was carried here long after its
node geometry already matched C exactly (76/76 reference points). Its real
residual — 8 straight-edge endpoints on four opposing 2-cycle pairs
(`Target↔TThread`, `Interp↔InterpF`, `Event↔Target`,
`AtomProperties↔NRAtom`) shifted 6–14 pt — was re-diagnosed and turned out
to be **no font-metric effect at all**, but two port defects in dot's
multi-edge routing (mission `plans/fix-nan-a2-retire/`,
`.agent-notes/nan-edge-endpoint-diagnosis.md`):

1. **Opposing-pair lane order.** The port re-sorted each parallel-edge
   group by original creation seq before assigning Multisep lane offsets; C
   assigns lanes in the edgecmp collected order (MAINGRAPH forward rep
   first, AUXGRAPH reversed member second — `dotsplines.c:419`,
   `make_regular_edge:1885-1907`). A 2-cycle whose reversed member was
   declared first drew each edge on the other's 18 pt corridor.
2. **Spurious flat-adjacency on cross-rank merged edges.** `markAdjacent`
   marked `ND_other` entries without C's same-rank guard
   (`flat.c:272-276`), letting `groupSize`'s flat-adjacent short-circuit
   swallow portcmp group breaks.

With both fixed faithfully, the family is **`conformant`** on all three
dirs (per-element: nodes 0, edges 0 differing), and the same mechanism
closed `42`, `clust2`, `ngk10_4` (structural-match → conformant) and moved
`b124` from diverged to structural-match — all on 2-cycle/parallel pairs.

**Both survey sides run the same estimator — measurement is neutralized.**
The native `dot` oracle runs under a headless `GVBINDIR`
(`test/corpus/gen-headless-gvbindir.sh` → `/tmp/ghl`) that symlinks only the
`core` and `dot_layout` plugins — no `gd`/`pango`/`quartz` text-layout plugin.
With that slot empty, graphviz falls back to its built-in
`estimate_textspan_size`. The TypeScript port's `EstimateTextMeasurer`
(`src/common/textmeasure.ts`) is a faithful port of the same routine and is
the Node default, resolved by `createMeasurer()`
(`src/common/textmeasure-factory.ts`). **Both sides of every parity
comparison therefore measure text with the identical estimator** — real
FreeType/pango glyph advances never enter the comparison. This is why a
verdict regression here points at layout code, not at a font, and it is why
fixing the estimator's own bugs (UTF-8 byte counting, vertical-metric
font-awareness) closed most of this class outright rather than merely
narrowing a font-metric gap.

**The injectable `TextMeasurer` seam.** This neutralization is only possible
because text measurement is a deliberate seam, not hard-wired into either
engine. `TextMeasurer` is a one-method interface (`measure(text, font, size,
flags) → {w, h, …}`) dependency-injected into every label-sizing call site —
`polyInit`, `recordInit`, `initEdgeLabels`, and `buildNodeLabel` each take the
measurer as a parameter; nothing measures text through a global. It is
pinned for tests/CI via `setTextMeasurer(...)` or `GV_TEXT_MEASURER=estimate`.
The seam also lets a residual be *proven* measurement-only: feed the port the
exact widths C measured (captured from the oracle) and check whether layout
then reproduces C exactly. That experiment is what originally licensed the
A2 verdict for `proc3d` (see the historical appendix below) — the technique
remains valid. Its inverse retired the class: because measurement was
provably neutralized on both survey sides, the `NaN` edge residual could not
be a font-metric effect, which forced the re-diagnosis that found the two
routing defects above.

::: details Historical analysis (superseded 2026-06-30) — retained for the record
The material below describes an earlier state of this class, before the
`EstimateTextMeasurer` cutover, font-aware vertical metrics, and the
non-ASCII UTF-8-byte fix closed most of it. It no longer describes current
behavior — kept only so the reasoning that led here is not lost. In
particular: (1) the "native C" width numbers in the measurement table below
are **FreeType** values from a real-font rendering path; the parity survey
never exercises that path — both sides run `estimate_textspan_size` (see
above) — so the table does not reflect how parity is currently measured; (2)
the overlay figures and golden/ours renders below depict a **non-corpus**
`proc3d` (`graphs/directed/proc3d.gv`, ~2620 pt) that is not part of the
parity survey; the corpus `proc3d` variants are now conformant with zero
diffs, so there is no overlay to show for them; (3) the `NaN`/`ratio=compress`
node-x narrative below is superseded — current measurement shows all 76 node
points match exactly, so the width-error → node-shift chain it describes no
longer holds for `NaN`.

**`NaN` under `ratio=compress` (historical).** The
`NaN.gv` family (`orientation=landscape; ratio=compress; size="16,10"`) was an
A2 case whose verdict at the time landed at *diverged* rather than
*structural-match*. The compress x-network-simplex path was faithful — every
constraint input matched C (width-constraint value, `containNodes` minlens,
aux-edge counts 471/wt 1612, `lrBalance`, and rank orders all identical)
*except* the half-widths of 9 nodes, which the measurer reported 0.5–1.03 pt
wider than C. `ratio=compress`'s weight-1000 packing made the normally-slack
left-to-right separation constraints **binding**, so that sub-pixel width
error — invisible without compress — surfaced as a −3..−5 pt interior
x-shift. That shift tipped the `Target<->TThread` straight spline 0.55 pt
past a node-box wall, so the router bent it into an extra bezier piece (7
pts vs C's 4) — a *structural* delta, hence *diverged*. Forcing the 9 widths
to C's values reproduced C exactly (node-x 53/76→0/76 off; spline 7→4 pts),
confirming the residual was 100% upstream font metrics, not the compress or
spline code, **for that former divergence**. Full evidence (with a visual
golden-vs-ours side-by-side + the 4-vs-7-point spline delta overlay):
`plans/fix-compress-xcoord/comparisons/nan-compress-xcoord.html` (prose
writeup: `…/nan-compress-xcoord.md`).

**Font-metric measurement example (historical — FreeType vs estimate).**
Native Graphviz, when run with a real text-layout plugin (not the headless
oracle used by the parity survey), measures text with FreeType/libgd glyph
advances. The port's `EstimateTextMeasurer` does not replicate a glyph
rasterizer. For most strings the two agree exactly; for some, they differ by
a fraction of a point. Measured example — Times-Roman 14 pt, the string
`"/home/ek/work/src/lefty/lefty.c"` (31 chars):

| | width |
|---|---|
| native C (FreeType) | 176.00 pt |
| @knowvah/dot-engine (estimate) | 176.75 pt |
| delta | **+0.75 pt (+0.43%)** |

The same node's other label line, `"93736-32246"`, measured **identically**
(96.00 pt both) — the error is string-dependent and accumulates per glyph,
not a uniform scale factor. This FreeType-vs-estimate gap is real but is
**not** what the parity survey measures (both sides run `estimate`); it would
only matter if @knowvah/dot-engine output were compared against a real-font C
rendering outside this survey.

**Downstream effect on the former `proc3d` divergence (historical).** Label
width feeds node size, which feeds layout:

1. A wider label → a slightly wider node box (for an *ellipse* node, width is
   further scaled by √2, so +0.75 pt of text → +0.53 pt of half-width).
2. Node half-widths set the left-to-right separation constraints of the
   x-coordinate network simplex; those constraints are `ROUND()`-ed to
   integers, so a sub-pixel width change can tip a constraint from *N* to
   *N+1*.
3. The network simplex then selects a different — but equally optimal —
   integer x-assignment, shifting some node x-positions by 1–2 units.

For the non-corpus `proc3d.gv` (`graphs/directed/proc3d.gv`, ~2620 pt, not a
parity-survey member), that produced a **≤ 3.55 pt** difference in x-extent
(**0.13%**), overlaid below — **green = native C `dot` (golden), red =
@knowvah/dot-engine (ours)**:

![proc3d golden-vs-ours overlay: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay.svg)

Zoomed in, the fringe appeared almost entirely on the long file-path oval
labels:

![proc3d overlay, zoomed on the wide path-label ovals: green = C, red = @knowvah/dot-engine](/img/proc3d-overlay-zoom.png)

| Golden — native `dot` | Ours — @knowvah/dot-engine |
|---|---|
| ![proc3d rendered by C Graphviz](/img/proc3d-golden.svg) | ![proc3d rendered by @knowvah/dot-engine](/img/proc3d-ours.svg) |

The standalone write-up (root cause, per-metric numbers, reproduce command)
is on its own page:
[**proc3d — the canonical A2 font-metric divergence (historical)**](/divergences-proc3d-a2).
That page describes a resolved divergence on a non-corpus input; the current
corpus `proc3d` variants are conformant.

**Why this was accepted at the time.** Byte-matching FreeType's per-glyph
advances across every font and string would have required replicating its
metric tables, hinting, and rounding — large, fragile, and still not
guaranteed exact. The text measurer is a shared primitive: every label in
the corpus flows through it, so a fix aimed at one string risked regressing
others for a sub-perceptual reward.
:::

### A3. `hypot` tie-break in spline routing (`dot`) — CLOSED

**Status (2026-10-12): closed.** No corpus id is accepted under this class
any more; the section is retained as historical documentation of the
mechanism. The former members (`2368`, `graphs-b100`, `graphs-b104`, `241_1`,
`2413_1`, `2413_2`, `graphs-decorate`, `2371`) are all **`conformant`** in the
fresh sweep (`test/corpus/parity-probe.json`).

**Mechanism, and what closed it.** The spline fitter (`Proutespline` ->
`findMaxDev`, `src/pathplan/route.ts`) splits a fitted bezier at the interior
route point of maximum deviation. On a geometrically symmetric channel the
candidate deviations differ by ~1 ULP, so the winner is decided by last-bit
arithmetic. The port had been attributed an irreducible gap ("Apple `hypot`
matches no portable `hypot`") and compensated with a tolerant,
translation-equivariant tie-break. That attribution was disproved: the tie is
decided by C's *exact* arithmetic, which is reproducible. Commit `cdf597bc`
(`fix(pathplan): split splines at C's max-deviation point bit for bit`) ported
it: libm `hypot` for the distance (`route.c:448`), C's strict `>` comparison
(`route.c:139`), and clang's `fp-contract` fusion of the bezier evaluation
(`route.c:137-138`), the `mkspline` determinants (`route.c:181-183`), `dot`
(459), `normv` (413), `B01` (488) and `B23` (494). The tolerant tie-break is
gone; the `241_0` knot is pinned in C's routing frame, because C is not
translation-equivariant on such ties. This closed `2368`, `2371`, `2413_1`,
`2413_2`, `graphs-b100`, `graphs-b104` and `graphs-decorate`.

`241_1` was not a `hypot` tie: it was closed by `87347711`
(`fix(dot): match port-less edge endpoints in flat-adjacent aux layout`). C
groups every adjacent flat edge sharing a main edge into one
`make_flat_adj_edges` call and tests for ports across the whole group, so a
port-less sibling of a ported edge is routed through the aux graph. The port
split the group by port presence and routed the sibling through
`makeSimpleFlat`, whose clip lands at a different `bezier_clip` point
(54.28 vs native 54.46).

Both fixes were verified by fresh corpus sweeps with zero regressions
(journal rows "T5 land" and "T6 land",
`plans/plantuml-tracker-2/decision-journal.md`).

**Evidence before the fix (historical).** `2368` was the reference member.
Its `376->76` arc split toward the opposite corner from C; the graph and the
pre-fix C and port paths of that arc are kept for the record.

::: details Graph definition (`2368.dot`)
```dot
digraph G {
  compound=true;
  concentrate=true;
  node[shape=box,fontsize="8",color="#909090",height="0.1"];
  edge[style="dashed",fontsize="8",color="#808080",arrowsize="0.5"];
  line7[label="#7"];
  {rank=same; line7;136;}
  line7 -> 136[style=invis];
  line11[label="#11"];
  line7 -> line11[weight=100,style=invis];
  {rank=same; line11;16;}
  line11 -> 16[style=invis];
  line16[label="#16"];
  line11 -> line16[weight=100,style=invis];
  {rank=same; line16;76;376;256;196;436;316;}
  line16 -> 316[style=invis];
  316 -> 76[style=invis];
  76 -> 376[style=invis];
  376 -> 256[style=invis];
  256 -> 196[style=invis];
  196 -> 436[style=invis];
  76 -> 376[label="from1"];
  376 -> 76[label="to1"];
  16 -> 76[label="ignore"];
  196 -> 376[label="from2"];
  376 -> 196[label="to2"];
  136 -> 196[label="ignore"];
  256 -> 436[label="to2"];
  256 -> 376[label="to1"];
  256 -> 316[label="as"];
  436 -> 256[label="from2"];
  376 -> 256[label="from1"];
}
```
:::

```
C    376->76 : M273.31,-4.56 C268.33,-3.14 263.11,-1.9  258.11,-1.15 250.49,0     242.34,-0.98 234.83,-2.8
port 376->76 : M277.29,-4.51 C268.27,-1.69 257.65,0.32  247.89,-1.15 244.92,-1.59 241.88,-2.21 238.85,-2.94
```


### A4. Oracle in an acknowledged-broken state (the init_rank / pathplan family)

**Affected (graphviz 16.1 sweep):** `1435` (structural-match, maxΔ 0.39 on
one spline control point; was 503 against the 15.x oracle — the drop was not
bisected) and `1581` (diverged: top-level child count 39 vs 22, maxΔ 0).
Family members `1939` and `2825` are **conformant** and carry no entry, and
`2470` and `graphs-structs` joined them 2026-07-11 (both collapsed to
conformant after the ortho adjacency-spill/chancmpid, fmadd
`polylineMidpoint`, and half-even tie-rounding fixes landed — the port now
reproduces the oracle's recovery output exactly, including the identical lost
edges); their acceptance entries are retired. **`2796` and `2471` joined them
at graphviz 16.1** (both `conformant` in the fresh sweep, acceptance entries
retired): the port and the 16.1 oracle now agree on the `init_rank` recovery
output including the lost edges. The cause was not isolated by a bisect (the
16.1 dotgen port `3cfbf55c` and the lost-edge consumption fix `5b6b9bfc` are
the candidates); the `init_rank` description below is kept as the mechanism of
the class, and the two ids are pinned as conformant by the parity sweep.

`1581` and `2825` were crash-recovery cases (fix-element-count-bucket
mission): fuzzer/degenerate inputs where the upstream tests assert **only**
that dot does not crash (`test_1581`: no ASan violation; `test_2825`: no
crash when `rebuild_vlists` returns -1). C hits an internal `Error:`
(`install_in_rank` / `rebuild_vlists: lead is null`) and its recovery
discards layout content; the port reaches the **identical rankset-deletion
decisions** (warning parity verified: the same node/graph names in
`mark_clusters`' "already in a rankset" warnings, cluster.c:317-320).

`2825` is now fully closed. The fix-2825-rebuild-vlists mission (post-1581)
first closed the gap one layer: the port reaches C's *exact* internal-error
state — byte-identical stderr including message order
(`Error: rebuild_vlists: lead is null for rank 1` then the unprefixed
`agerr(AGPREV, ...)` continuation `concentrate=true may not work
correctly.`) — with `dotLayoutPipeline` correctly propagating
`dot_position`'s failure to skip `dot_splines`/`dotneato_postprocess`,
matching C's `dotLayout` (`if (r != 0) return r;` after `dot_position`,
dotinit.c:322-325). A follow-up (part 2) then closed the remaining
render-layer gap: C's `emit_node` gates every node on `node_in_box(n,
job->clip)` (emit.c:1806-1809), and on this abort path `job->clip` is
degenerate because `GD_bb` was never set by `set_aspect` (inside the
skipped `dot_position` tail) — so C emits *zero* nodes, only the (also
degenerate) cluster frames. The port ported that same `node_in_box` gate
(`src/gvc/device.ts:renderNode`, using `job.bb`/`job.pad` as the
single-page-equivalent of `job->clip`) and stopped recomputing a
plausible bbox from live node positions when `g.info.bb` is unset
(`src/gvc/device.ts:render`, `job.bb = g.info.bb` verbatim, mirroring
`init_gvc`'s `gvc->bb = GD_bb(g)`, emit.c:3272) — every layout engine
already sets `g.info.bb` itself before `render()` runs on every non-abort
path, so this is byte-identical on healthy graphs and only changes output
on this abort path. `2825` is now `conformant` (4-element output,
byte-identical to the oracle). See
`.agent-notes/2825-rebuild-vlists-abort.md` for the full mechanism trace
of both parts. `1581` never reaches the inconsistent state at all (a
*different* upstream cluster-window bug, not `rebuild_vlists`), so it lays
out its surviving graph in full — that gap remains open. The oracle output
on `1581` is recovery debris with no upstream-defined semantics. Evidence:
[`1581`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1581.md). On
every one of these inputs it is the **C oracle** that is broken, by
graphviz's own account: `2471`, `1939` and `1435` are
[`xfail(strict=True)`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/tests/test_regression.py)
upstream (issues
[#2471](https://gitlab.com/graphviz/graphviz/-/issues/2471),
[#1939](https://gitlab.com/graphviz/graphviz/-/issues/1939),
[#1435](https://gitlab.com/graphviz/graphviz/-/issues/1435), cf.
[#2796](https://gitlab.com/graphviz/graphviz/-/issues/2796)); the only fix
attempt, [draft MR !4849](https://gitlab.com/graphviz/graphviz/-/merge_requests/4849),
remains an unmerged draft (last edited 2026-03-20). `graphs-structs` is the
ancient record-routing loss class (#102/#242/#274/#1323) that stable
graphviz 15.0.0 renders correctly — a dev-build oracle regression.

**What C does.** On the `init_rank` members (`2796`, `2471`, `1939`),
native dot's x-coordinate auxiliary graph closes a directed cycle through
cluster wall-constraint edges; its
[`init_rank`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/ns.c#L146)
cannot scan every node, prints `Error: trouble in init_rank`, and the
layout proceeds from that recovery state — on `2471`/`2796` ending in
`Pshortestpath` triangulation debris and lost edges. On `1435` and
`graphs-structs` the broken stage is pathplan itself (ear-clip
triangulation dead ends; a lost record-port edge).

**Inputs verified, then made faithful (this is the load-bearing part).**
The `verify-oracle-bug-family` mission
([brief](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/README.md))
dumped the constraint graph both sides feed network simplex, line-by-line,
for every family member — and found the port's earlier "clean" behavior on
this family came from **four genuine port defects**, all fixed:

1. `flatEdges` skipped C's
   [`rec_reset_vlists`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/flat.c#L333)
   call, leaving cluster rank windows stale after flat-label vnode
   insertion (this alone made the port lose **9** edges on `2471` where C
   loses 6).
2. The same-`group` edge penalty fired on self-loops instead of
   same-non-empty-group endpoints
   ([`dot_init_edge`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/dotgen/dotinit.c#L66)).
3. `CL_CROSS` used C's `_WIN32` value 100; the oracle platform uses 1000
   ([`const.h`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/common/const.h#L141)).
4. A triangulation dead end aborted `Pshortestpath` instead of C's
   warn-and-continue + straight-line fallback
   ([`shortest.c:333`](https://gitlab.com/graphviz/graphviz/-/blob/9d6e3abfd2c7/lib/pathplan/shortest.c#L333)).

Post-fix, the family's NS constraint dumps are **line-identical** to C
(253 rank2 calls on `2471`; all calls on `1939`/`1435`/`graphs-structs`),
and the port follows C through the acknowledged-broken recovery: same
lost edges (`3->16` on 2796; the identical 6 on 2471), same element trees.
`1939` became fully conformant. The residual numeric deltas (and 1435's
differing pathplan debris) are behavior *inside* the recovery state, which
project policy deliberately does not chase.

**`2723` (segfault; pinned, not chased).** Native `dot` segfaults (exit 139)
on `tests/2723.dot` (undirected, `rank=same` groups, labeled edges), so C has
no output to match. Upstream
[issue #2723](https://gitlab.com/graphviz/graphviz/-/issues/2723) is open and
`tests/test_regression.py:test_2723` is `xfail`. The port throws
`InternalError` (`INTERNAL_ERROR`, with a `TypeError` cause from
`src/layout/dot/flat.ts:flatLabelYpos`, where `rank[r-1]` is undefined). With
no correct oracle the honest failure stands and the port is not changed;
`src/layout/dot/flat-2723.test.ts` pins it. Update that test if upstream fixes
the issue.

**Policy note.** The earlier A4 stance ("the port meets the issue's
expectations; do not replicate") was based on the belief that the port's
acyclic aux graph came from a benign local variant. It did not — it came
from defect (1), which demonstrably mislaid `2471`. Faithfulness to the C
source won: the port now reproduces C's acknowledged-broken outcomes from
verified-identical inputs, and every entry here should be **re-measured
when upstream fixes the corresponding issue** (the oracle output will
change; expect these ids to light up as regressions at that upgrade — that
is by design, not rot).

**Evidence.** Per-id comparison pages (side-by-side renders + evidence
records):
[`2471`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2471.md),
[`1939`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1939.md),
[`1435`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/1435.md),
[`graphs-structs`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/graphs-structs.md),
[`2796 post-fix addendum`](https://github.com/knowvah/dot-engine/blob/main/plans/verify-oracle-bug-family/comparisons/2796-post.md)
(pre-fix baseline preserved at
[`2796-cluster-ranking.md`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-2796-cluster-ranking/comparisons/2796-cluster-ranking.md)).
Diagnosis artifacts: `.agent-notes/2471-stale-cluster-windows-missing-reset.md`,
`.agent-notes/1939-group-penalty-clcross-misports.md`.

### A5. Invalid input bytes (encoding representation)

**Affected:** `1367` (diverged, maxΔ 0 — exactly one structural diff).

**What differs.** The input file contains a naked UTF-8 trail byte (`0x80`)
inside a node name. C treats naked trail bytes 0x80–0xBF as "valid
characters representing themselves" (`lib/common/utils.c:1200-1207`, no
warning), and node-name `<title>` text bypasses charset conversion entirely
(`agnameof` bytes flow straight to `gvputs_xml`). The oracle SVG therefore
contains the raw byte and is **not valid UTF-8** despite its declared
encoding. The port decodes invalid-UTF-8 input with the latin1 fallback
(`0x80 → U+0080`) and emits well-formed UTF-8 (`\xc2\x80`).

**Why accepted.** The port's I/O boundary is JS strings (browser library).
A raw invalid byte cannot round-trip through `renderSvg`'s string return
value; byte-matching C would mean corrupting the output encoding for every
consumer. The latin1 fallback mirrors C's own "treated as Latin-1" recovery
semantics (`utils.c:1249`). This is a constraint below the code — the
representation layer — not a portable behavior we declined to port.
Everything else in 1367 is conformant: element counts (23 polyline /
103 text / 44 polygon / 24 path) and all coordinates match after the
decorate (T6) fix.

**Evidence.**
[`1367`](https://github.com/knowvah/dot-engine/blob/main/plans/fix-element-count-bucket/comparisons/1367.md)
comparison page (side-by-side render + evidence record).

---

### A6. `unsigned int` canvas overflow on degenerate input

**Affected:** sfdp `2556` (a NaN layout; see the engine-track entry). `1314`
— a fuzzer-derived input (`fontsize="991836031967s8"`) whose absurd font size
balloons the drawing to ~2.75e11 pt — is **conformant** at graphviz 16.1 and
its acceptance is retired: the port now narrows the page size the way the
native `ROUND` conversion does (`47f3165d`) and builds the page clip in
`setup_page` order (`da6c4a53`). The mechanism paragraphs below
describe the original difference.

**What happens.** C stores `job->width` / `job->height` as **`unsigned int`**
(`gvcjob.h:327-328`). The `ROUND(...)` of the huge point size (`emit.c:1249-1250`)
overflows 32 bits and wraps mod 2³², and the SVG backend emits it through a
**signed** `%d` (`gvrender_core_svg.c:258-259`) — so C prints
`height="-425618343"`. The port keeps the mathematically-consistent (unwrapped)
value. Every other value — node ellipse `cx/cy/rx/ry`, the root `translate`, the
polygon, the text `font-size` — is byte-identical; only the top-level `<svg>`
width/height differ.

**Why we don't chase it.** Replicating C's 32-bit integer overflow is not a
layout behavior worth porting, and the input is degenerate. Revisit if upstream
fixes the overflow (e.g. widens the field or clamps the size).

<a id="a6b-degenerate-nan-layout"></a>

#### A6b. Degenerate NaN layout (`sfdp`, pathological `repulsiveforce`)

**Affected:** `2556` — `repulsiveforce=100` (⇒ the repulsive force uses
`pow(dist, 101)`), which drives the spring-electrical solver to **NaN in both
engines**. The native oracle itself emits all-`nan` node/edge positions and a
degenerate bounding box.

**What happens.** With every coordinate NaN, the two implementations serialize
the garbage differently: (1) the graph bb / background polygon — C rounds `NaN`
to `int`, which on arm64 yields `INT_MIN`-scale garbage (`bb="0,0,-4.295e+09,
-4.295e+09"`); the port keeps `0`. (2) Edge draw ops — native's emit pass
suppresses the `_draw_`/`_hdraw_` of a NaN spline (emitting only the `pos`),
while the port emits them with NaN control points. Node draws match (both
suppress them). No real layout exists on either side.

**Why we don't chase it.** The port already reproduces the *same* NaN blow-up as
native — the fix that got it there is genuine (see below); what remains is only
how each serializes NaN garbage. Replicating C's `(int)NaN` undefined behavior
and its NaN-spline draw suppression is not meaningful layout fidelity on an input
whose layout is degenerate in both engines. Revisit if upstream clamps
`repulsiveforce` or sanitizes NaN positions.

**Port fixes that made this reachable (not chased-away — real bugs).** Before
these, the port could not even reach the degenerate state: (1) `armPow`
(`src/common/arm-pow.ts`) threw on any non-fast-path argument; it now ports ARM
`pow.c`'s full special-case branch so `pow(NaN, y) = NaN` like libm. (2)
`bezierClip` (`src/common/splines-geom.ts`) looped forever on NaN control points
because its convergence test was the naive negation of C's `while (ABS > .5)`
(equivalent for finite values, not for NaN); it now mirrors C exactly and
terminates on NaN. Both are C-faithful and affect only NaN inputs.

---

### A7. `round()` box-wall rounding boundary (`dot`)

**Affected:** `graphs-honda-tokoro` and (added 2026-07-28, new to the 905-item
universe) its `graphs/directed/` sibling `tree-graphs-directed-honda-tokoro`
(both structural-match, maxΔ ≈ 1 pt on the single edge `n012->n011`). The
sibling differs only by `samearrowhead` attrs, which do not touch this pair's
routing — its `n012->n011` geometry is byte-identical to the accepted id on
both the port and oracle sides, so the mechanism below transfers verbatim.

**What differs.** `maximal_bbox`'s head-corridor box wall lands at internal
x=90 in C versus x=89 in the port for the shared `samehead` port of the two
`n012->n011` parallels. The shared-port construction (`buildSharedPort`) and the
parallel grouping are both byte-conformant to C; the 1 px gap is purely a
`round()` rounding-boundary artifact — ~1e-14 of upstream floating-point noise
tips a value sitting exactly on a `.5` boundary to the neighbouring integer. The
port's `maximal_bbox` formula already mirrors C's exactly.

**Why we don't chase it.** `round()` is a primitive every routed edge in the
corpus flows through; nudging its boundary behaviour to match this one case is a
corpus-wide regression risk for 1 px on 2 edges — the same shared-primitive
constraint as the control-hull rounding noted in
`bbox-class-control-hull-vs-curve`. Full diagnosis:
`.agent-notes/honda-samehead-shared-port.md`.

---

### A8. `fp-contract`/FMA rounding vs. strict IEEE (`dot`) — CLOSED

**Status (2026-10-12): closed.** No corpus id is accepted under this class
any more; the section is retained as historical documentation. Both known
instances are **`conformant`**: `2620` (2026-07-11) and `2646` (2026-10-12).

**Class.** clang arm64 compiles the oracle binary with `-ffp-contract=on`,
fusing selected multiply-add sequences into single FMA instructions; the
port runs on V8, which performs strict IEEE-754 rounding. On bit-identical
inputs the two disagree by 1-2 ULP at whichever expression the compiler
chose to contract. Two instances were known, at two different sites, with
two different amplification mechanisms:

- **2646** — the ULP arose inside `Proutespline`'s `points2coeff`/`solve3`
  cubic solve and directly flipped a spline-fitter root count.
- **2620** — the ULP arose in `poly_init`'s polygon vertex-extent loop
  (node sizing) and was amplified downstream by `ortho`'s faithful per-relax
  int-truncation into an equal-cost maze-corridor tie flip.

**Closed: `2646` (`0cc05181`, `fix(pathplan): mirror clang fma contraction in
spline intersection`).** Three smode long-edge legs (`edge2575`, `edge3905`,
`edge15467`) end on a barrier wall with a parallel tangent, so the
`splinefits` intersection cubic has a near-double root. `points2coeff`
builds that cubic through catastrophic cancellation; the oracle fuses
`route.c:397-398` and `solvers.c:43`, so the strict-IEEE port got a different
`solve3` root count, a spurious crossing and one extra `a`-halving (maxΔ
42.09). The earlier conclusion that this was irreducible ("software-FMA
emulation across the whole spline fitter", with a partial fix refuted) was
disproved: the contraction sites are finite and enumerable. The port now
mirrors every contraction in `points2coeff` (`route.c:397-398`),
`splineintersectsline` (371-372, 374, 360-361, 383-384), `solve3`
(`solvers.c:41, 43, 46`) and its inlined `solve2` (80, 85), and
`solve3`/`solve2`/`solve1` are re-ported to C's shape. All 42,432 captured
`Proutespline` calls of `2646` are bit-identical to the oracle (journal row
"T7 land"). Original diagnosis (still valid for the mechanism):
`plans/residual-cleanup/analysis/2646-fp-contract.md`.

**Affected (historical):** `2620` (was structural-match, maxΔ 585; 423 diffs
on 24 edge paths + 22 arrowheads). **Collapsed to conformant 2026-07-11**:
the faithful `sgraph` adjacency-buffer spill + `chancmpid` bidirectional
containment port (see `.agent-notes/ortho-maze-circo-rca.md`) removed the
divergence; the acceptance entry is retired and this section is kept as
documentation of the A8 class.

**What differs.** The `ortho` (`splines=ortho`) pipeline is byte-conformant
to C given identical inputs — proven by injecting C's exact maze input
(coordinates, `xsize`/`ysize`) into the port's ortho stage: 378/378 routed
segments come out byte-identical, so nothing in `src/ortho` is at fault.
The actual divergence is 1-2 ULP in the maze *input*: node `ysize` (and, by
within-rank accumulation, `ND_coord.y`) computed in C's `poly_init`
polygon vertex-extent loop (`shapes.c`), which under
`-ffp-contract=on` fuses `R.x += sidelength*cosx` into an FMA that is ~1
ULP larger than the port's strict-IEEE arithmetic (both sides implement the
arithmetically identical expression). `2620` has 173 fractional-width
polygon nodes; all show C ≥ port by 1-2 ULP. That ULP is amplified — not
introduced — by `ortho`'s Dijkstra relax, which faithfully truncates its
running distance per-step (`sgraph.c:165`, mirrored by the port as
`Math.trunc`) over weights derived from raw cell extents
(`maze.c:257`). The ULP-shifted geometry flips an equal-cost corridor tie
for 4 routed edges (paths + their arrowheads); the remaining diffs are
±1-track renumbering knock-on from those 4 flips.

**Why accepted (irreducibility proven by a controlled experiment).** A
standalone C harness varying only `-ffp-contract` reproduced both sides on
the divergent hexagon vertex: `-ffp-contract=on` → `310.29250168188713`
(matches the oracle), `-ffp-contract=off` → `310.29250168188707` (matches
the port), with the divergent operation isolated to vertex `i=3`
(`R.x=-0.50000000000000011` fused vs. `-0.5` unfused). A second
input-injection experiment (only variable: ortho input values) confirmed
the amplifier: feeding the port's own `orthoEdges` C's exact
`coord`/`xsize`/`ysize` collapses all 4 corridor divergences to 0 — the
ortho code has no defect, it is just sensitive (as C's own maze-cost
routing is) to a 1-2 ULP shift in its input. Matching would mean emulating
clang's specific FMA contraction of one compiled expression tree in
`poly_init` — chasing a compiled artifact, not porting source semantics.
Full diagnosis: `plans/ortho-2620-residual/analysis/2620-ortho-route.md`.

**Emulated exception (not accepted): `triang.c:ccw`.** One contraction
site IS reproduced bit-for-bit rather than accepted: pathplan's `ccw`
compiles to `fnmul`+`fmadd` (exact first product − rounded second), so a
query point bit-equal to a segment endpoint tests ISCW/ISCCW instead of
ISON. `shortest.c:pointintri` then rejects polygon-vertex endpoints
("destination point not in any triangle") and `makeMultiSpline` falls back
to plain routing for every coalesced 2-cycle — a large, discrete,
corpus-wide behavior the port must match. Unlike the `solve3`/`poly_init`
sites above (deep inside compiled expression trees, fix refuted), `ccw` is
a single standalone compiled function with clean semantics, so
`src/pathplan/triang.ts` emulates it: plain-double fast path with a
conservative error bound where plain and fused signs provably agree, and
an exact Dekker-product + dyadic-BigInt path for the near-zero cases.

---

### A9. libm trig 1-ULP → CDT cocircular tie flip (`circo`/`twopi` multispline)

**Class.** V8's `Math.sin`/`Math.cos` are not bit-identical to Apple libm's
`sin`/`cos` (proven: 1-ULP disagreement at `2π·4.5/8`, one of the eight
ellipse-obstacle corner angles). `makeObstacle`'s circumscribed-8-gon corners
inherit that ULP, so the triangle router's input coordinates differ from the
oracle's by ≤6e-14. Symmetric layouts (equal-size nodes on a rank/ring) make
the router's quads **exactly cocircular** in real arithmetic, so the exact
incircle predicate sits on a knife edge: the input ULP flips its sign, the
constrained-Delaunay diagonal flips, and the corridor polygon that fails
`Pshortestpath` in the oracle ("destination point not in any triangle" →
plain-spline fallback) succeeds in the port (or vice versa). The resulting
splines differ by ~0.2–0.5pt. Sibling of the (now closed) **A3**/**A8**: an irreducible
floating-point portability constraint below C source semantics — matching
would require reproducing Apple libm's exact `sin`/`cos` rounding in JS.

**16.1 re-baseline.** The multispline corridor geometry was missing clang's FMA
contraction (ellipse-corner radicand, `mkCtrlPts`, `DIST` = sqrt(fmadd), the
`line_intersect` dot); `f66ac638` (`fix(neato): mirror fma contraction in
multispline routing geometry`) mirrored it. twopi and neato `241_0` — which
this class had attributed to the cocircular tie below — went **conformant**
(acceptances retired), and sfdp `42` turned out to have no tie at all (it is A1
drift, see [`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)). circo, fdp
and sfdp `241_0` still diverge with their residuals unchanged or reduced; their
attribution to the tie below predates `f66ac638` and has **not been re-verified
by position injection** since that fix showed the same attribution wrong for
twopi/neato.

**Affected:** `241_0` (circo Δ≈0.2 via the corridor flip on edge `1->2`; fdp
and sfdp `241_0` on the engine tracks below); `2343`, `2239`, `share-b29`, `windows-b29` (twopi,
1–2 edge-label position diffs each — the libm 1-ULP arises in
`poly_init`'s unit-vertex trig (`hypot`/`atan2`/`sin`), puts one node's
computed height a ULP past the min-size clamp the oracle lands on
exactly, and cascades through `floor()` in the xlabel R-tree load into a
single label-candidate flip. A correctly-rounded-hypot fix was tried and
REFUTED: it fixed `2343` but regressed `2168_3`, whose octagon sizing
flows through the same call where the oracle's value is NOT the correctly
rounded one — no deterministic hypot policy matches the oracle on both).
`2168_1` originally sat in this class but became
conformant once the port emulated the oracle's fp-contracted `ccw`
(pathplan `triang.ts`): its corridor failure is governed by the FMA'd
`pointintri` vertex-endpoint rejection, which the port now reproduces
bit-for-bit, so the CDT-diagonal ULP tie no longer surfaces there.

**Why accepted (irreducibility proven by a controlled experiment).** The
CDT itself is exonerated: the port's `mkSurface` is a faithful port of GTS
0.7.6's incremental insertion (`cdt.c`: 1→3 split + recursive
`swap_if_in_circle`, constraint edges pre-created and unswappable,
`remove_intersected_*` + `triangulate_polygon` constraint enforcement), and
a standalone C harness linking the **real GTS library** and fed the port's
bit-exact router inputs reproduces the port's triangulation face-for-face
(2168_1: 22/22; 241_0: 185/185). Exact-rational evaluation of the incircle
determinant on the two input sets confirms the sign flip (+1 with the
port's inputs, −1 with the oracle's). The residual variable — the 1-ULP
trig difference — was isolated by comparing `Math.sin`/`sin` bit patterns
directly.

**Engine-track acceptance (`accepted-divergences-engines.json`).**
<a id="a9-engine-track-twopi-circo"></a> The twopi/circo **xdot engine
tracks** (`parity-twopi.json` / `parity-circo.json`, native `dot -K <engine>
-Txdot` oracle, `test/corpus/engine-walk.ts`, semantic draw-op comparison at
±0.01 — see `test/golden/compare-xdot.ts`) surface this same mechanism
independently of the dot-engine SVG survey cited above: twopi `2239` (1
draw-op diff — the `_ldraw_` edge-label text-position flip, the same
`poly_init` unit-vertex trig ULP cascading through the `floor()` xlabel
R-tree chain; `2343`, `share-b29` and `windows-b29`, originally accepted
under this entry, were *fixed* 2026-07-11 by the faithful fmadd contraction
in `polylineMidpoint` — see the b29-family paragraph below) and circo `241_0` (41
draw-op diffs, Δ≈0.2pt on edge `1->2`'s routed bezier — the same
CDT-diagonal corridor flip; decision journal, 2026-07-10 "CDT rewritten as
faithful GTS port; 2168_3 outline-ring obstacle; 56/osage bb clobber; A9
filed" entry). Accepted at the engine-track level via
`test/corpus/accepted-divergences-engines.json`, joined into
`PARITY-twopi.md`/`PARITY-circo.md` by `parity-report.ts` — the same join
`accepted.ts` performs for the dot-track `PARITY-dot.md`.

**circo `2475_2` and `2095_1` — closestNode hypot tie (fixed).** In one 28-node
component of this 10762-node graph, circo's `getRotation`
(`circpos.c:73-92`) picks the block node closest to the layout origin via
`hypot` to decide the sub-block's rotation. Two cocircular nodes are
effectively equidistant; V8's correctly-rounded `Math.hypot` and Apple
libm's `hypot` round that distance 2 ULP apart, which flips the strict `<`,
selects a different node, and rotates/reflects the sub-block ~20° (18 nodes
move, max 296.7pt; the other 10744 nodes are bit-identical, as are the
block tree, circle order, and every `centerAngle`). `2095_1` hit the same
tie (2197 draw-op diffs, three rigid block rotations). Both were accepted
until 2026-10-16, when the closest-node search switched to the port's
bit-exact model of Apple's `hypot` (`src/common/libm-hypot.ts`); both now
conform. Standalone repro: `.agent-notes/circo-2475-590-repro.dot`; full RCA:
`.agent-notes/circo-b81-2475-rca.md`.

**twopi `2470` — radial-coordinate ULP amplified by the xlabel R-tree.**
2470 is a 140-edge graph whose HTML `<table>` edge labels cluster on
near-coincident radial anchors. In the neato family, edge labels are placed
as external labels by the greedy xlabel placer (`label/xlabels.c`), which
picks the least-overlapping candidate corner via a Hilbert-ordered R-tree.
The port's splines and node coordinates match the oracle to emission
precision (zero spline/node/bbox diffs even at 1e-7), but one node's radial
`ND_coord.y` differs by ~2 ULP (Apple libm `sin`/`cos` vs V8 `Math`) — far
below the conformance bar, yet it straddles the `floor(pos.y − sz.y/2)`
boundary at exactly 0 in `objplpmks`, flipping that object's R-tree rect by
one unit. The Hilbert-order/tree-grouping change makes `RTreeSearch` prune
a different branch, so ~140 labels each snap to the neighbouring candidate
corner (each diff a fixed (+width, −line-height) step). The placer, object
order, rect rounding, `CombineRect` (which faithfully mirrors C's min-min
quirk), and the int32 Hilbert key were each verified faithful; the
divergence is the upstream radial-trig ULP, irreducible for the same reason
as twopi `1855`. Accepted 2026-07-11; full RCA:
`.agent-notes/twopi-2470-rca.md` (which also documents that the id's
morning "pass" was an artifact of a stale oracle binary, not a port
regression).

**osage `1855` — obstacle-vertex fp-contract smear.** Distinct from the twopi
`1855` radial-mirror entry above: under osage the node centers are bit-exact
to the oracle, and the 110 draw-op diffs are three obstacle-routed edges
placed on the mirror side of a node row (X bit-exact, Y mirrored). The
octagon obstacle vertices from
`circumscribed_polygon_corner_about_ellipse` (`neatosplines.c:301`) differ
from C by 3–4 ULP because clang's `-ffp-contract=on` fuses the `a·b±c`
chains in `ellipse_tangent_slope`/`line_intersection` into single-rounding
FMAs while V8 rounds each operation: C's fused rounding collapses a gutter
column of corner-x values to one bit-identical double (exactly collinear),
the port's splits it into two values 1 ULP apart. That flips the visibility
`clear()` tangency test — the gutter is no longer blocked — adding ~20
visibility edges, and Dijkstra resolves the up/down homotopy tie to the
mirror side. Controlled experiment: injecting C's exact obstacle
coordinates into the otherwise-untouched port yields **zero** diverging
edges, exonerating the legal-arrangement, visibility, Dijkstra, and spline
chain entirely; injecting C's libm `cos`/`sin` alone is a no-op. Accepted
2026-07-11; full RCA: `.agent-notes/osage-spline-family-rca.md`.

**b29 family (twopi, fixed).** The four b29 variants shared one knife-edge:
the `EqmtTyp` edge label (`Node14732->Node14731`) sat on an exact placeLabels
side-selection tie whose outcome depended on 1-ULP twopi layout drift in the
surrounding objects. With the faithful fmadd contraction in
`polylineMidpoint` (states-family fix, 2026-07-11) the port's label anchor
became bit-identical to the oracle's, yet the tie still resolved oppositely on
two of the four variants (`graphs-b29`, `linux.i386-b29`) while the other
two (`share-b29`, `windows-b29`) conformed — and `2343`'s accepted A9
label diff cleared entirely. Bound: 1 draw-op, Δ12pt label y. On 2026-10-20
every Bezier evaluation in the port began going through one fused `bezier()`,
as clang contracts graphviz's `Bezier` (`e37e72f0`). That removed the
upstream drift: `graphs-b29` and `linux.i386-b29` now conform too, and their
acceptances are retired. Full RCA: `.agent-notes/twopi-states-rca.md`.

The same placeLabels knife-edge surfaced on the **osage** track (accepted
2026-07-11, full RCA: `.agent-notes/osage-small-tail-rca.md`):
`linux.i386-b29` and `share-b29` (2 draw-op diffs each — one edge label's
x-anchor lands at 878.28 vs 841.06, placed symmetrically about the
bit-identical spline midpoint 859.67, i.e. ±half the label width; the two
variants mirror each other) and `1652` (2 draw-op diffs — two edges each
flip one label anchor about an identical midpoint, one in x and one in y,
with bit-identical splines and arrowheads; the oracle renders completely,
so this is not the known native-timeout flake). In every case the edge
geometry was bit-exact and only the label side-selection tie resolved
oppositely on 1-ULP-drifted surroundings. The fused `bezier()` of 2026-10-20
(`e37e72f0`) removed that drift as well: all three now conform, as does the
unaccepted osage `2371`, and their acceptances are retired.

The osage track carries the `polypoly` triple (`graphs-polypoly`,
`share-polypoly`, `windows-polypoly`; accepted 2026-07-11, full RCA in
`.agent-notes/patchwork-tail-rca.md`): the sole diverging operation is the
bare transcendental `cos(π+θ)` at a distorted-quad orientation-180 vertex —
V8's `Math.cos` is correctly rounded while Apple libm's `cos` carries a
±1-ULP argument-dependent error (so only under libm is `|cos(π+θ)| ≠
|cos(θ)|`); the 1-ULP node-size delta feeds pack's `GRID`/`ceil`, tips a
perimeter tie, and the qsort places two components in each other's packing
cells — a rigid whole-node swap with no shape or routing error. No
deterministic rewrite can reproduce a non-correctly-rounded libm
transcendental, the textbook A9 shape.

The same mechanism was confirmed 2026-07-28 on the larger sibling
`tree-graphs-directed-polypoly` (`graphs/directed/polypoly.gv`, new to the
905-item universe; 112 draw-op diffs, osage only). The diverging operation
is the identical node-`9004` `cos(π+θ)` 1-ULP site — the C and port `bb.x`
values match the original RCA byte for byte — but on this 76-node input the
propagation runs through osage's `arrayRects` instead: `acmpf` sorts pack
cells by the raw `width+height` sum, and libm's 1-ULP-high width makes
`9004` sort strictly ahead of its rotated siblings `9000/9002/9006` while
V8's correctly-rounded value leaves an exact 4-way tie for the unstable
qsort to order differently — different row-major cells, a `9002`/`9006`
swap, and a column-width `fmax` cascade shifting 8 neighbours in x.
Feeding the port's own `arrayRects` the C node sizes versus the port node
sizes reproduces the sweep's 10 moved nodes with byte-matching x deltas,
closing the causal chain.

Two further engine-track instances were root-caused and accepted 2026-07-11
(full RCA: `.agent-notes/circo-edge-tail-rca.md`): twopi `241_0` (6 draw-op
diffs, attributed then to the same CDT cocircular incircle tie as the circo
entry above; **retired at graphviz 16.1** — it is conformant since
`f66ac638`, so the 14-pt-vs-8-pt corridor flip was the unmirrored FMA
contraction, not a tie) and circo
`windows-tree` (10 draw-op diffs on one fan edge — circo's placement trig
lands `node2.y` a single ULP above `node8.y` around the exactly-symmetric
value 18.0, and `closestSide`'s dyna head-port selection flips TOP/BOTTOM at
that exact tie; node positions and boxes are otherwise bit-identical to the
oracle; **retired 2026-10-18** — it is conformant since the port's DIST2
takes clang's fused form, which breaks that exact tie as C does).

**sfdp engine track — edge FP-tie (`241_0`).**
<a id="a9-sfdp-fp-ties"></a> The sfdp xdot engine track (`parity-sfdp.json`,
native `dot -Ksfdp -Txdot`, ±0.5) surfaces the CDT cocircular incircle tie once
exact native pre-routing positions are injected (so the divergence is NOT
iterative drift — see the A1-drift class — but a discrete predicate tie):

- `241_0` — attributed to the CDT cocircular incircle tie (the multispline
  corridor; not re-verified after `f66ac638`, see the 16.1 re-baseline above).
  The residual is a **segment-count flip**: 7 draw-op diffs on edge 1->2,
  `ptCount 8 vs 20` (20 diffs before `f66ac638`) — the corridor succeeds with
  an N-pt spline where the native build falls back to a shorter plain route
  (or vice versa), as in the circo `241_0` entry above. The port already emulates the arm64
  `fmadd` contraction in the incircle/`ccw` predicate (`src/pathplan/triang.ts`,
  `src/common/fma.ts`) and uses robust-incircle Delaunay; the residual is the
  V8-vs-Apple-libm `sin`/`hypot` 1-ULP in the predicate input that no portable
  code reproduces.

> **sfdp `42` reclassified A9 → A1 drift (graphviz 16.1 sync).** It was listed
> here as a CDT/libm incircle tie. The mission found otherwise
> ([`comparisons/sfdp-42.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/sfdp-42.md)): the former corridor
> flip was a port-side FMA mis-port in the multispline corridor geometry,
> fixed by `f66ac638` (`fix(neato): mirror fma contraction in multispline
> routing geometry`); with native positions injected the port now reproduces
> native's xdot exactly. The remaining residual (node offsets 0.06-0.65 pt) is
> iterative drift seeded by one 1-ULP disagreement in Apple-libm
> `pow(dist, 2)` vs the port's ARM `pow` at the coarsest level, amplified by
> the finer levels — A1 (see [A1](#a1-floating-point-determinism-force-directed-engines)).

> **`2095` reclassified A9 → A1-drift (2026-07-22).** It was previously listed
> here as "the hypot sibling" (sub-0.7pt drift on the edges of an empty-named
> node `""->"4"`). That residual was a **harness artifact**: the attribution
> injector's `GVTS_POS` regex required ≥1 name char, so the `""`-named node never
> injected and dragged its two incident edges. With the injector fixed to match
> empty names (`(.+)`→`(.*)`, `src/layout/neato/splines.ts`), sfdp `2095`
> injects to **0 residual** — pure force-drift, covered by the computed A1-drift
> class, not a routing FP-tie. Its per-id accept was removed from
> `accepted-divergences-engines.json`. (Same finding as fdp `2095` below.)

**Fresh controlled experiment (2026-07-21).** A native-vs-V8 `hypot` probe
(`plans/sfdp-tracked-divergences/batch-2/hypot-ulp-probe.txt`): compiling the
system C `hypot` and comparing to Node `Math.hypot` on representative
flat-edge deviation inputs shows a 1-ULP disagreement on 2 of 6 (Δ 7.1e-15 and
5.7e-14) — the split-threshold knife-edge that flips the subdivision count.
Irreducible: no portable hypot reproduces Apple libm (the `arm-pow.ts`
precedent for the same boundary). `sfdp.241_0` is accepted at the engine-track
level via `accepted-divergences-engines.json`. `sfdp.42` is **not** part of this
class: its registry entry is A1 (`comparisons/sfdp-42.md`), and the probe above
did not explain it.

The **fdp** xdot engine track (`parity-fdp.json`, native `dot -Kfdp -Txdot`,
±0.5) surfaces the SAME CDT cocircular tie on the same graph, `241_0`: with the
oracle's exact pre-routing positions injected, the residual is 11 numeric
`unfilled_bezier` diffs confined to one edge (`0->1#0`, maxΔ 3.39pt). Because
the node positions are injected-identical, the divergence is downstream in the
pathplan multispline corridor — the same libm-1-ULP incircle tie as
circo/sfdp `241_0` (exact-rational incircle 185/185 above; 11 diffs unchanged by
`f66ac638` — not re-verified by injection). The levers are
already applied (`src/pathplan/triang.ts` fmadd, `src/pathplan/route.ts:198`
`Math.hypot`); the tie is treated as irreducible. Accepted via `accepted-divergences-engines.json`
`fdp.241_0`. fdp's `2095`, by contrast, is **A1-drift, not A9**: injecting the
single empty-named node (after the attribution injector was fixed to match
`""`-named nodes) collapses its residual to zero — the earlier "A9 tail" was the
un-injected empty node dragging its incident edges. The sfdp `2095` accept was
the same blindspot — a fresh sfdp attribution regen (2026-07-22) with the fixed
injector confirmed it also injects to 0, and its accept was removed (see the
`2095 reclassified` note above).

---

### A10. V8 `Map` size limit in polyomino packing (`2784`, five pack-based engines)

**Affected:** `2784` on `circo`, `twopi`, `neato`, `fdp` and `sfdp`. The port
throws on the xdot and imagemap walks of all five engines and on the `json` walk
for `circo`. On the `json` walks for `twopi`, `neato`, `fdp` and `sfdp`, and on the
`plain` walks of all five, the native oracle itself does not finish within the
walk's time budget, so those rows are oracle errors. On `dot`, `osage` and
`patchwork` it passes.

**What happens.** `lib/pack/pack.c` records the cells a component occupies in
a `PointSet`. For `2784` (a single node 3e16 pt tall, `splines="ortho"`) the
faithful integer `step`/placement arithmetic needs 2,011,656,764 cells; native
16.1.0 completes in 482 s using 67.3 GB resident (101 GB peak). The port's
`PointSet` is a JavaScript `Map`, which V8 caps at 2^24 entries, so it throws
`Map maximum size exceeded`.

**Why accepted.** A runtime limit below the code, not a logic gap; the cause is
the faithful arithmetic of `97fcccd8` (before it the port computed a small,
wrong layout and never reached the limit). The accepted outcome is a thrown
error rather than a `diverged` verdict, so the entries in
`accepted-divergences-engines.json`, `accepted-divergences-json.json` and
`accepted-divergences-map.json` declare `verdict: "port-error"` with
`errIncludes: "Map maximum size exceeded"`: they accept a port error only when
it carries that message. A different failure on `2784` would surface as an
unaccepted fault, and `registry-staleness.test.ts` would flag the entry as
stale. Evidence:
[`comparisons/2784-pack-cells.md`](https://github.com/knowvah/dot-engine/blob/main/comparisons/2784-pack-cells.md).

---

## Tracked long tail (`dot` attribute & edge-case)

At **defaults**, the `dot` engine matches the C binary to a tight deterministic
tolerance on the golden corpus (the `conformant` verdict; see the note at the
top). The remaining differences are the **long tail of attributes and
edge cases** — the historically hard part of any Graphviz port. Unlike the
accepted deltas above, these *will* be closed; they are tracked live, with
counts, in
[`PARITY-dot.md`](https://github.com/knowvah/dot-engine/blob/main/test/corpus/PARITY-dot.md):

| Category | What differs |
|---|---|
| **path-structure** | Edge spline routing in specific configurations (e.g. some flat-edge and dense-corridor cases). |
| **element-count** | A feature that emits extra/fewer SVG elements than C in certain graphs. |
| **color-stroke** | Stroke/fill emission differences for specific style attributes. |
| **parser-gap** | A small number of DOT inputs the parser does not yet fully accept. |

If your graph uses only common attributes and the `dot` engine, you are almost
certainly on the deterministic-tolerance match path. If a layout looks wrong, check `PARITY-dot.md` for
that input class — it is likely a tracked item with an oracle-pinned fix mission,
not an unknown.

> **Note on label-driven cases.** The text-measurement class (A2) is closed —
> no `dot` graph is accepted under it any more. A graph that sits at
> structural-match today is a tracked gap, not a font-metric delta.

### `concentrate=true` opposing-edge arrowheads

When `concentrate=true` merges an anti-parallel pair (`A->B; B->A`) into one
surviving edge, that edge must draw an arrowhead at **both** ends. This is now
ported (the `conc_opp_flag` branch of `arrow_flags`; see
`src/common/splines-clip.ts:arrowFlags`), so `graphs-b135`, `167`, and `2087`
match (the missing-arrowhead `element-count` divergence and its unclipped-spline
`@d` side effect are both gone).

Some concentrate graphs **retain a separate, pre-existing residual** that the
arrowhead fix does **not** address — it is a node **x-coordinate** position
delta (x-network-simplex / compass-port), not an arrowhead defect:

- **`graphs-b15`, `graphs-b69`** — the large record/cluster "elevator" graphs.
  Concentrate activates and merges correctly; the residual is a ~1pt node-x delta
  that amplifies into an `element-count`/spline `@d` difference. The arrowhead
  emission itself is now correct (b69 gains its missing arrowhead polygons). See
  the `b69-concentrate-undermerge` agent note for the x-coord root cause.
- **`1453`** — still diverges on a top-level `element-count` cause unrelated
  to the conc_opp_flag arrowhead.
- **`2825`** — at the time of this arrowhead fix, diverged on a top-level
  `element-count` cause unrelated to conc_opp_flag (no opposing-pair merge
  is triggered there); since closed by the fix-2825-rebuild-vlists mission,
  see A4 above.

These are tracked x-coordinate / structural items, **not** arrowhead bugs.

### Layout-fidelity gaps from the 2.0 fidelity mission (neato, sfdp, fdp, twopi, circo)

The 2.0 fidelity mission made unported attribute values fail loudly (see the
`UNSUPPORTED_FEATURE` table in
[Errors and exceptions](https://github.com/knowvah/dot-engine/blob/main/docs-site/guide/errors.md)).
It left the following, recorded in `plans/v2-fidelity/decision-journal.md`.

**Loud, unported.** `overlap=voronoi` with overlapping nodes still throws
`UNSUPPORTED_FEATURE` in neato, twopi, circo and sfdp: the Voronoi adjuster
itself (`vAdjust`'s algorithm) is not ported. The overlap test that decides
whether to throw is C's own (`countOverlap` over `poly.c` node polygons).

**Known gaps, still silent.** The port renders these without an error and
differs from native Graphviz. Found by the `v2-silent-gaps` mission
(`plans/v2-silent-gaps/decision-journal.md`); not accepted deltas.

- **`getAdjustMode`'s "Unrecognized overlap value" warning is not emitted.**
- **Rotated polygon vertices can differ from native in the last bits
  (irreducible: host math library).** `poly_init` orients each vertex with
  `atan2`, `hypot`, `sin` and `cos`. With bit-identical inputs, macOS libm and
  V8 return different last bits (e.g. `atan2(0x3fd6a09e667f3bce,
  0xbfd6a09e667f3bca)`: libm `…21d1`, V8 `…21d2`; `hypot` at the next vertex:
  libm `…fffd`, V8 `…fffe`), so a box with `orientation=20` gets vertex y
  `-18` in the port and `-17.999999999999996` natively. Native Graphviz itself
  varies with the platform's libm, and a browser cannot call it. The port's own
  arithmetic matches C (`RADIANS` order fixed; 776 of 1664 sampled vertex
  coordinates are bit-identical, the rest differ through libm only). Effect:
  exact-touch `polyOverlap` verdicts can flip; with native vertices every
  verdict matches.
- **sfdp can differ from native on macOS (irreducible: host libm `pow`).**
  Diagnosed with an instrumented native sfdp: positions stay bit-identical
  until one repulsive-force term, `pow(dist, 1 - p)` (`spring_electrical.c`,
  `p = -1` so `pow(x, 2)`), returns 1 ulp less than `x*x` from macOS libm
  (`pow(1.4116727416983157, 2)`: libm `1.9928199296540394`, correctly rounded
  `…396`; macOS `pow(v, 2) != v*v` for 20 of 16201 sampled `v`). That changes
  the iteration's `Fnorm` in the last bit; sfdp's adaptive cooling amplifies it
  into a different (often mirrored) layout. The port's `armPow` is ARM's
  optimized-routines `pow` (glibc ≥ 2.28), i.e. what Linux Graphviz computes;
  the macOS oracle is the outlier. Ruled out: seeding (explicit `start=` values
  match), `pcp_rotate` (same input gives the same output), positions and the
  attractive term (bit-identical). Example: a lone triangle `a--b; a--c; b--c`
  at the default seed.
- **fdp can differ from native through host libm `cos`/`sin`.** fdp follows
  Graphviz after 15.0.0 (hypot-distance repulsion, `Mlimit`), with the host
  libm's `hypot` reproduced bit-for-bit (`src/common/libm-hypot.ts`, 0
  mismatches on 400k samples). 251 of the 252 fdp-renderable golden inputs
  match the native build exactly; the remaining one
  (`parallel-cluster-ldbxtried`) places cluster port nodes with
  `T_Wd * cos(alpha)`, and macOS libm `cos(-2.3840764867756761)` is 1 ulp from
  V8's `Math.cos`; fdp's force loop amplifies that to about 3 in. Apple's
  `cos` is not reproducible from a short model the way `hypot` is.
- **Native crashes the port defines.** Native Graphviz exits 139 on neato
  `mode=KK` with `model=mds` and an edge `len` (`mds_model` indexes `GD_dist`
  by a 1-based sequence number: heap overflow), and on `model=circuit` with a
  disconnected graph. The port drops out-of-range cells in the first case and
  falls back to shortest paths in the second; there is no native output to
  compare against.

---

## Intentionally not ported (non-goals)

These are deliberate scope boundaries, not bugs. The library targets **SVG**
(plus the `json` / `xdot` / `dot` / imagemap intermediate text formats).

- **Other output formats.** Raster (PNG/JPG/GIF/WebP/BMP), PostScript/PDF/EPS,
  and GUI/interactive backends are out of scope. Use the SVG output and convert
  downstream if you need a raster.
- **`page=` pagination for SVG.** Native `dot` does not paginate SVG either (the
  SVG device sets no pagination flag), so `page=` is a no-op on this path in both
  implementations — documented here only because it is a common point of
  confusion.
- **`-Tplain` text output.** Deferred (a faithful text format), not excluded.
- **`gvpr`** (the graph-processing scripting language) — out of scope.
- **C++ convenience wrappers** (`cgraph++`, `gvc++`) — the C API is ported
  first; an idiomatic-TypeScript convenience layer, if wanted, would be a
  separate package.
- **`fontnames=svg|ps` in browser text measurement.** In a browser the
  canvas measurer builds its font from the PostScript alias's
  `fontnames=native` family list (`Times-Roman` → `Times, serif`), the same
  face the SVG emitter renders by default. `TextMeasurer` carries no graph
  context, so graphs that set `fontnames=svg` or `fontnames=ps` are measured
  against the native list while the SVG names the svg/ps family. Alias
  weights CSS does not define (`book`, `demi`, `light`, `medium`, `roman`)
  are emitted verbatim, as in C; browsers ignore them and render normal
  weight, and the measurer measures normal weight to match. Node output is
  unaffected (it never uses the canvas measurer).
- **Native-only mechanics** replaced by browser-safe equivalents: dynamic
  plugin loading (`dlopen`) is replaced by static engine/renderer registration;
  filesystem reads (fonts, images, config) are replaced by caller-supplied
  callbacks (e.g. `setImageSizer`). Behavior is preserved; the mechanism differs.

---

## Reporting a divergence

If you find output that differs from C and is **not** an accepted delta above,
not in `PARITY-dot.md`, and not a non-goal, that is a bug worth reporting — the C
source is the spec, and unlisted divergences are treated as defects, not
accepted behavior.
