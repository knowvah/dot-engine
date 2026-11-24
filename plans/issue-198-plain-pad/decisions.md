# Decisions: issue #198

## Mechanism (planning's diagnosis)

- **Mechanism.** C's `write_plain` prints `job->zoom`
  (`lib/common/output.c:141`). `init_job_viewport` computes it by fitting the
  bb padded by `job->pad` into `size=` (`lib/common/emit.c:3311-3350`:
  `job->bb = gvc->bb ± job->pad`, `sz = job->bb.UR - job->bb.LL`,
  `Z = fmin(size / sz)`). `init_job_pad` (`emit.c:3249-3263`) sets `job->pad`
  from `pad=` (`graph_sets_pad`), else from the render plugin's
  `default_pad`, 0 for plain (`plugin/core/gvrender_core_dot.c:734`).
- **Origin.** `src/render/map.ts:420-421` (`writePlain`) passes the literal
  `{ x: 0, y: 0 }` as `jobViewport`'s pad, so `pad=` never reaches plain's
  zoom.
- **Causal chain.** `pad=1; size="1,1"` → C: sz = 54 + 144 = 198 by 108 + 144
  = 252, Z = 72 / 252 = 0.28571; port: sz = 54 by 108, Z = 72 / 108 =
  0.66667 → the `graph` line's first field differs. Node and edge lines are
  layout coords and do not read the zoom.
- **Ruled out.**
  - `job.pad` itself: `device.ts:455` sets it from `pad=` or
    `renderer.defaultPad`, and both plain renderers state `defaultPad = 0`
    (`map.ts:539`, `:562`), as C. `buildMapCtx` (`map.ts:614`) already passes
    `job.pad` to the same `jobViewport` and matches native on cmapx.
  - `job.bb` being already padded: it is `g.info.bb` (`device.ts:451`), C's
    `gvc->bb`; `initJobViewport` adds the pad, as C's `init_job_viewport`.
  - `viewport=`: its Z overrides the fit (`viewport-pad` probe equal on base).
  - No `pad=`: port and native agree (`size-no-pad`, `filled-no-pad`,
    `empty-no-pad` equal on base).
  - xdot, json, dot output: they print no zoom (the issue's check; the smoke
    bytediff's svg, xdot, json, cmapx rows are identical on the prototype).

Evidence: [harness/results/probe-prototype.tsv](harness/results/probe-prototype.tsv)
(base 132/256, prototype 256/256), reproduced on the tip `25b341d3` against
the carried oracle.

## AD-1: pass `job.pad` in `writePlain`

**Context.** The issue's "likely fix"; `job.pad` on the plain renderers is
C's `job->pad` since #141. **Decision.** Replace the literal with `job.pad`
and update the doc comment to name `init_job_viewport` (no new line, so
`map.ts` stays at 797, under the 500-line hook's base-count pin). **Consequences.**
Only plain and plain-ext with `pad=` and a pad-sensitive zoom change, toward
native.

## AD-2: test against carried fixtures

**Context.** No existing test reaches plain's zoom with `pad=` (the full suite
passes on the prototype without a new test). **Decision.** Create
`src/render/plain-pad.test.ts`, as in `harness/prototype.diff`: 16 probes ×
dot, neato × plain, plain-ext against `harness/native/` (stdout, and stderr
for plain), a probe-count check and the repro's line as a literal (66 tests).
On the base 33 fail (`harness/results/tests-on-base.txt`). **Consequences.**
The test reads `plans/issue-198-plain-pad/harness/`, as
`viewport-attr.test.ts` reads #197's; the brief directory is committed.

## Baseline

Phase 8 on `25b341d3`: [decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the squashed commit. Nothing persists outside the repo.
No API or data contract changes (`render`'s signature is unchanged; plain's
text moves toward native).

## Auto-confirmed (unattended)

| Phase | Decision | Rejected | Evidence |
|---|---|---|---|
| 2 | Blast radius: `src/render/map.ts` (one argument, one comment), new `src/render/plain-pad.test.ts`; no data model, API or dependency change | widening to `device.ts` or `viewport.ts` | `job.pad` already correct (ruled out above) |
| 3 | AD-1: `job.pad` at the call site | recomputing the pad in `writePlain` from `pad=` (duplicates `init_job_pad`); a plain-only pad field (no C counterpart) | `buildMapCtx` uses `job.pad` the same way |
| 3 | AD-2: fixture test on probes | a unit test of `jobViewport` alone (does not pin the plain path) | #197's pattern |
| 4 | Reversible; no observability (library); no compatibility break | — | — |
| 5 | One task, executor alone | splitting test and fix (the test is red until the fix) | — |
| 6 | Stop and push-forward lists in README | — | queue rules |
