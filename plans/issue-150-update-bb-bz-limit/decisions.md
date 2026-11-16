# Decisions: issue #150

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #150 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: port the core-plus-wrapper shape

- **Decision:** `src/common/splines-geom.ts` gets a non-exported
  `updateBbBzCore(bb, cp, recurse)`. It is the body of today's `updateBbBz`, with
  two changes: `if (recurse === 0) return;` sits in the refine branch, before the
  split, and both recursive calls pass `recurse - 1`. The exported
  `updateBbBz(bb, cp)` keeps its signature and calls the core with 10. Each
  function carries `@see lib/common/emit.c:update_bb_bz_core` or
  `@see lib/common/emit.c:update_bb_bz`.
- **Rejected:**
  - An optional `depth` parameter on the exported function. C keeps the counter
    private (`static`), and CLAUDE.md says to keep function boundaries.
  - Bounding the callers. One cause has one site.
- **Evidence:** `emit.c:735-776` at 16.1.1. Every port caller goes through
  `updateBbBz`, and so does the `splines.ts:11` re-export. No other copy of
  `update_bb_bz`'s recursion exists in `src/`: `grep checkControlPoints` finds
  only this file and `anchor.ts`, which is `approx_bezier` (AD-4).

### AD-2: pin values from native 16.1.1's own update_bb_bz

- **Decision:** three cases, each starting from bb `(0,0)-(0,0)`. Each value
  comes from [harness/native-bb.c](harness/native-bb.c), linked against
  `~/git/graphviz-16.1.1/build/lib/gvc/libgvc.dylib`:

  | curve (x0 y0 x1 y1 x2 y2 x3 y3) | native 16.1.1 bb (llx lly urx ury) | port base |
  |---|---|---|
  | `0 0 3e6 1e6 -2e6 5e5 10 7` | `-413400.40513363667 0 921725.5469250213 577351.0327252895` | `-487275.449564131 0 985058.85108663 577351.0327252895` (= 16.1.0) |
  | `0 0 -3e7 1e8 7e7 -2e7 100 5` | `0 0 0 0` | `-5781496.982492765 -2296378.656338533 25425980.296601724 40321074.1584914` (= 16.1.0) |
  | `0 0 1e17 7e17 -1e17 3e17 5 7` | `0 0 0 0` | does not finish (killed at 15 s; 16.1.0 killed at 5 s) |

  The values are JS shortest round-trip forms. The harness prints `%.17g`, and
  `921725.54692502134 === 921725.5469250213` in JS.
- **Rejected:**
  - A corpus golden: no corpus input reaches the bound.
  - Values derived by hand: native's `ptToLine2` is fused (fma), so only a call
    into native proves bit equality.
  - Counting recursive calls: nothing in the port can observe the count without
    instrumenting it.
- **Evidence:** a bounded scratch copy using the port's own `ptToLine2` and
  `evalBezier` reproduced all three native rows. It also kept the AC3 curve at
  `-5 -5 6.25 10.15625`, both natively and in the port.

### AD-3: the ledger and corpus records stay as they are

- **Decision:** no edit to `docs/known-divergences.md` (whose 16.1.1 table
  groups #150 with #152–#157, #160, #161 and #165), to the 23 locale pages, or
  to `test/corpus/*`.
- **Rejected:** dropping #150 from that cell. The table's rows come from the
  maintainer's full survey over the branch. #149's mission (AD-5 there) left its
  own row for the same reason.
- **Evidence:** the queue rules reserve the full survey. #150 moves no corpus
  verdict (#147 classification, #148 comment, and the reach check above).

### AD-4: approx_bezier stays unbounded

- **Decision:** `src/gvc/anchor.ts:448` `approxBezier` is not touched.
- **Rejected:** bounding it "for consistency". The C has no bound there.
- **Evidence:** `emit.c:819-831` at 16.1.1 still recurses on
  `check_control_points` with no counter. Upstream bounded only `update_bb_bz`
  (`git show 81c6b5484`).

## Baseline

Green on `46fd64cd` at planning:

- `npm run typecheck`: exit 0.
- `npm test`: 577 files, 13558 passed, 18 expected fail.
- Oracle: `/tmp/ghl1611/config8` and `/tmp/ghl1611-all/config8` are present, and
  `oraclePreflight` passed for dot and neato.

The project has no lint script. The golden and corpus gates were not run at
planning: the tip is the #149 mission's verified head, whose journal row records
them green.

## Rollback

Reversible: revert the one squashed commit. No data, API, format or dependency
change. `updateBbBz`'s exported signature is unchanged.

## Operational readiness (auto-confirmed)

A browser library, not a service, so there are no SLIs, alerts, dashboards or
on-call story. Behaviour changes only for Bézier segments that are still
unrefined after 10 halvings. Those had no finite answer before, and now get
native 16.1.1's.
