# T1: per-render process state (item 42, AD-4)

**Context:** item 39's pooled byte diff found 13 jobs (two runs, different sets) whose
output differed between bundles only because workers ran jobs in a different order; each
is identical in its own process. Rows: 2470 dot plain, neato svg/cmapx, fdp svg/cmapx;
Symbol neato svg/xdot, fdp svg/json/cmapx, sfdp json. 2470 neato cmapx differs in stderr
(one side prints a warning). A simple history (Symbol fdp before/after neato/fdp/sfdp of
clust4, crazy, unix) did not reproduce. Module-level mutable state in `src/` (candidates):
`common/random.ts:22` (drand48 state), `common/crand.ts:28` (C `rand`), `common/postproc.ts:39-40`
(`Rankdir`, `Offset`), `layout/dot/mincross-cross.ts:26` (`reMincross`),
`layout/dot/mincross-build.ts:101` (`fillSeq`), `common/htmltable-emit-rules.ts:179`
(`anchorSeq`), `common/htmltable-emit-fill.ts:128` (`htmlFillPen`),
`layout/fdp/xlayout.ts:60` (`xMarg`), `common/color.ts:39` (`colorScheme`). Caller hooks
(`textmeasure-factory.ts` `override`/`adviceShown`, `usershape.ts`, `image-resolver.ts`) and
debug hooks (`mincrossTrace`, `routeDump`, `clipDump`) are not C process state.

**Task:**
1. **Diagnose:** replay one pooled worker's job order (T0's bytediff with a fixed order and
   a single resident worker) until a diff reproduces, then bisect the preceding jobs to the
   minimal pair. Name the variable whose value differs at the start of the second render
   (dump each candidate). Diagnosis artifact in the hand-back.
2. **Fix (AD-4):** `src/common/render-state.ts` exports `registerRenderState(reset)` and
   `resetRenderState()`. Each module owning C-process state registers a reset restoring its
   C initial value (`crand` → `srand(1)` state, drand48 → its POSIX default, counters → 0,
   …). Call `resetRenderState()` first in every public entry: `renderSvg`, `tryRenderSvg`
   (`src/index.ts`), `render` (`src/render/public.ts`), `renderWithContext` re-export site
   if it is a public entry, `renderSvgAsync`, `renderSvgInto` (`src/async/`), `getDrawOps`
   (`src/render/xdot-public.ts`), `getLayout` (`src/api/geometry.ts`). O(1) per call.
3. Tests: A,B,A in one process equals A fresh (unit, using two small graphs that consume
   RNG and counters); the reproduced pair from step 1 as a regression test.

**Write-set:** `src/common/render-state.ts` (+ `.test.ts`, new); the owners listed above
that need a reset; `src/index.ts`, `src/render/public.ts`, `src/render/xdot-public.ts`,
`src/async/render-async.ts`, `src/async/render-into.ts`, `src/api/geometry.ts`.
**Read-set:** the listed lines; C counterparts (`lib/common/utils.c` `srand48` use,
`lib/gvc/gvcontext.c:70`, `lib/common/emit.c:3731-3750`).

**Interface output (T10, T11):** `registerRenderState(reset: () => void): void`;
`resetRenderState(): void`, called before any other work in each public entry.

**Acceptance criteria:**
- *Given* the pooled-diff jobs, *when* replayed, *then* the carried state is named with
  evidence (or the item is parked per AD-3 with what was ruled out).
- *Given* graphs A and B, *when* rendered A, B, A in one process, *then* both A outputs
  (SVG + console) are byte-identical to A in a fresh process.
- *Given* the `&` corpus set, *when* run pooled and one-process-per-job, *then* 0 diffs.
- *Given* the speed set, *then* p50 ≤ 1.05× T0 (stop 7).

**Observability:** N/A — no new observable operations. **Rollback:** reversible.
