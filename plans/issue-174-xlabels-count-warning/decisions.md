# Decisions: issue #174

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17. No issue was labelled `queue:planned`. #174 was the
lowest-numbered open `queue:ready` issue, and it has no "Blocked by"
references. Nobody confirmed the decisions below. Each one names the options it
rejected and the evidence, so the maintainer can audit it.

Filed during planning (queue rules, new defects): #243 (the
`no position for edge with ...` warnings and the `continue` in the same C
loop) and #244 (twopi places an xlabel native leaves unplaced on
`harness/probes/headtail.gv`).

### AD-1: `writeBackLabels` returns the count; `runPlacement` warns

- **Decision:** `writeBackLabels` (`src/common/xlabels-place.ts:422`) counts
  the labels it writes back and returns the count. `runPlacement`, the port of
  `addXLabels`' body after the early returns, compares it with `nLbls` and
  calls `agwarningf(\`${cnt} out of ${nLbls} exterior labels positioned.\`)`
  (C's text, trailing `\n` stripped per `src/common/agerr.ts` AD-7) when they
  differ. `@see lib/common/postproc.c:addXLabels (581-587)`.
- **Rejected:** warning inside `writeBackLabels`. It would make the write-back
  helper also own the report; C's report sits after the loop in `addXLabels`,
  which `runPlacement` mirrors.
- **Rejected:** a new module. The file has 475 lines and the change adds about
  six; it stays under the complexity hook's 500-line limit.
- **Evidence:** `wc -l src/common/xlabels-place.ts` at the base; C
  `postproc.c:569-587`.

### AD-2: the `Verbose` branch is not ported

- **Decision:** port only the non-`Verbose` branch, and say so in the doc
  comment ("Not ported: the `Verbose` `labels positioned` line; the port has no
  `Verbose`"), as `src/layout/neato/kk.ts:16` does for its `Verbose` output.
- **Rejected:** adding a `Verbose` option. The port has no `Verbose` global or
  render option (`grep -rn Verbose src` finds only comments and a trace hook in
  `mincross-order.ts`), and CLAUDE.md forbids options the library API lacks.
  The issue's criterion makes the line conditional on the port modelling
  `Verbose` there.
- **Evidence:** the grep above; the issue's "Done when".

### AD-3: no once-flag, no process static

- **Decision:** the warning fires on every `addXLabels` call that leaves a
  label unplaced, as C's does. Nothing is stored between calls, so there is no
  `registerRenderState` reset and no `docs/process-statics.md` row.
- **Rejected:** a once-per-render flag. C has none here (`postproc.c:586` is
  unconditional on `cnt != n_lbls`).
- **Evidence:** C source; `repro`/dot shows one line even though the aux graph
  also runs `addXLabels`, because the aux graph has no unplaced labels in C
  (the issue's "Ruled out"). Stop condition 2 covers the port differing there.

### AD-4: one task; the test pins native stderr per engine

- **Decision:** a single task T1: red tests, the fix, the gates, the squash. A
  new test file `src/common/xlabels-count-warning.test.ts` captures stderr with
  `agseterrf` (as `src/layout/dot/flat-adj-record-warning.test.ts` does) and
  renders each probe through `render(parse(src), 'dot', { engine })`, comparing
  the joined pieces with native's stderr, inlined with a provenance comment.
  Required: every probe × engine case whose port stdout equals native at the
  base (47 of 48), silent ones included. `headtail`/twopi is left out with a
  comment naming #244, and is not pinned to the port's wrong count.
- **Rejected:** a diagnose task and a fix task (#170's shape). The issue
  states the mechanism with `file:line`; planning confirmed the missing line on
  13 cases and equal stdout on 47. The journal still records the artifact.
- **Rejected:** putting the cases in `src/common/postproc.test.ts`. It tests
  other postprocess steps; a separate file keeps the native provenance block
  with its cases, as #171 did.
- **Evidence:** `harness/native/`, and the port's base stderr and stdout diffed
  at planning (README, "Evidence").

## Baseline

At `6f593c50` on 2026-11-17: `npm run typecheck` exit 0. `npm test`: 590
files, 13823 tests, all passed. There is no lint script, so typecheck is the
lint bar.

## Rollback

Reversible: revert the one squashed commit. stderr only. No API, data or
output format change.

## Operational readiness

A library, so there are no SLIs, dashboards or on-call. The one behaviour
change is an extra warning on stderr (through the `agseterrf` callback for
library users) when xlabel placement leaves labels unplaced. Backwards
compatible: no API or stdout change.
