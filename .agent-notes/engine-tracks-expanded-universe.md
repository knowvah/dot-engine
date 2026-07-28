# Engine tracks over the expanded (905-item) universe — 2026-07-27

Observations while re-sweeping the 16 deterministic engine tracks
(circo/twopi/osage/patchwork × xdot/plain/json/imagemap) after the corpus
universe grew 762 → 905.

## Observation: engine-walk records RAW verdicts; acceptance is applied downstream

- **Context**: osage xdot came back `{"pass":897,"diverged":8}` with no
  `accepted` bucket, which looked like the acceptance list had stopped working.
- **Finding**: `engine-walk.ts` writes the raw per-id status to
  `parity-<engine>.jsonl`/`.json`; the accepted-divergence join happens in the
  dashboard/report layer, which is why `PARITY.md` shows an `accepted` column
  the walker's own summary does not. 7 of the 8 osage "diverged" ids are
  exactly the 7 already accepted for osage.
- **Impact**: do NOT read an engine walker's summary as a regression count.
  Diff the id set against the engine's acceptance list first, or the same 7
  ids will look like new failures on every engine track.
- **Confidence**: High.

## Observation: `tree-graphs-directed-polypoly` is a NEW osage divergence, not a duplicate

- **Context**: the only osage id diverging that is not already accepted.
- **Finding**: it is NOT a byte-identical copy of the accepted polypoly ids
  (sha1 185b953f7d42 vs graphs afbf601d679d / share 5bd16d5098fe / windows
  382f60c1b430 — all four files differ). Its `nDiffs` is **112**, well outside
  the accepted family's documented bound of "≤24 draw-op diffs per id".
  A coordinate check is structurally consistent with the accepted A9
  pack-cell-swap signature though: of 69 nodes, **59 are exactly identical**,
  and the movement is one pair of large opposite translations
  (−2739.05,−175.93 / +2449.05,+175.93 — i.e. two components swapping pack
  cells) plus rigid x-only shifts (290, 291, 365, 410, −656) of neighbours
  re-flowing around the swap. No shape or routing error.
- **Impact**: probably the same Apple-libm `cos` 1-ULP → pack GRID ceil → qsort
  cell-swap mechanism as `graphs-polypoly` (A9, osage-only), on a larger
  sibling input — which would explain 112 diffs rather than ≤24. NOT accepted
  on that basis: the existing A9 entries rest on a full RCA
  (`.agent-notes/patchwork-tail-rca.md`), and matching a signature is not the
  same as reproducing the mechanism. Left as an unaccepted **tracked gap**, per
  the acceptance file's own rule that anything non-conformant and unlisted is a
  gap we intend to close.
- **Next step if picked up**: instrument the pack GRID/qsort tie for this input
  the way patchwork-tail-rca.md did, and confirm the cell swap is driven by the
  same `cos(pi+theta)` 1-ULP delta. If confirmed, extend the A9 entry with the
  wider bound rather than inventing a new class.
- **RESOLVED 2026-07-28**: confirmed A9 and accepted (journal 2026-07-28). Same
  node-9004 cos ULP byte-for-byte; propagation on this input is **arrayRects
  acmpf** (raw width+height sort-key tie), NOT the polyomino GRID path — osage
  packs in array mode because l_graph(3) < l_array(4) survives the mode raise.
  Port's own arrayRects fed C-vs-port sizes reproduces all 10 moved nodes with
  byte-matching dx. `dot -v2` dumps the pack decisions without edits.
- **Confidence**: High (isolated reproduction; per-id re-walk flipped only this id).

## Observation: `tree-graphs-directed-oldarrows` (twopi) is pre-existing, NOT an arrow regression

- **Context**: twopi xdot flagged it with `unfilled_bezier[ptCount] 8 vs 14` on
  edge `Z->I` (nDiffs=40). The name plus the fact that I had changed arrow
  parsing (`parseArrow` GAP rules) and arrow end-mapping (`arrowAttrEnd`) the
  same day made this look like a self-inflicted regression.
- **Finding**: A/B'd the port against the pre-work commit 534010b — the port's
  twopi xdot output is **byte-identical** before and after (18723 bytes both).
  My arrow changes are not implicated. There is no `tests/` counterpart of this
  file (only `../graphs/directed/oldarrows.gv`, sha1 64097e162b66), so the id is
  genuinely new to the corpus and had never been measured.
- **Impact**: a pre-existing twopi edge-routing/segmentation divergence (oracle
  emits a 14-point bezier where the port emits 8), newly visible. Tracked gap,
  not accepted, not a regression.
- **RESOLVED 2026-07-28**: confirmed as the 9th a1-twopi-arrows-family id and
  accepted (journal 2026-07-28). It is a mirrored PAIR (Z->I and i->Z swap
  straight/curved), driven by PRISM position drift (~1e-12) through pathplan
  directVis's degenerate collinear test: wind()'s 1e-4 tolerance + inBetween()'s
  x-only projection make the bend depend on the last-ULP ordering of three
  nominally equal x values. Injection A/B 40 -> 0 diffs (attribution-twopi.json).
- **Confidence**: High (offline directVis replication reproduces both sides;
  injection exoneration).

## Observation: two engine-track error classes are harness artifacts, not port defects

- `2108` on twopi xdot reports `timeout`: `engine-walk.ts` has a **hard-coded**
  90 s per-render cap (and 300 s oracle cap) with no env override, unlike the
  other walkers whose floors I raised. 2108 is documented as a slow-but-valid
  ~70 s render, so it sits right on that cap. Expect this on the engine-xdot
  tracks; it is not comparable to the other formats' budgets.
- `2222` on twopi xdot reports `oracle-error` — the native binary failed, so
  there is no reference to compare against.
- **Impact**: when reading engine-xdot results, separate `timeout`/`oracle-error`
  from `diverged` before drawing conclusions. Raising engine-walk's caps would
  need a harness change; deliberately not done mid-sweep.
- **Confidence**: High.

## Observation: raising the ORACLE timeout converts masked errors into real comparisons

- **Context**: circo plain came back with 2 `diverged` where the baseline had
  **0 diverged** — which reads as a regression.
- **Finding**: it is the opposite. Both ids (`2095_1`, `2108`) were
  `oracleError` in the baseline, i.e. the oracle was killed at its default 300 s
  cap and NO comparison ever happened. With `*_ORACLE_TIMEOUT_MS=900000` they
  complete and are compared for the first time, and they diverge
  (2095_1: 605 diffs, node x/y ~0.2pt; 2108: 118 diffs, y ~0.01pt). The track's
  error count fell 21 -> 5 at the same time, so ~16 graphs moved from
  "not measured" into the measured set.
- **Impact**: a track's `diverged` count can RISE while its real coverage
  improves. Compare error+diverged together, and check the baseline verdict of
  any newly-diverged id before calling it a regression — an id going
  `oracleError -> diverged` is a coverage gain, not a defect introduced.
  The headline pass % also drops for the same reason, because errors are
  excluded from scoring while divergences are not.
- **Confidence**: High (baseline verdicts read directly from git HEAD).
