# T1: continue the anchor count across renders on one layout

## Context

`src/gvc/device.ts:507` resets the HTML anchor counter at every `render`;
C never does (AD-1). The registered reset already covers every public
entry and every layout. [../harness/prototype.diff](../harness/prototype.diff)
is the whole `src/` change (the call and its import).

## Steps

1. **Base.** If the tip is not `70bd5faf`, use the tip as base, re-apply
   the prototype by hand if needed, and journal it. Oracle preflight:
   `ls /tmp/ghl1611-carried/config8` (missing: `test/corpus/build-carried-oracle.sh`
   or `GVBINDIR=/tmp/ghl1611-carried ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`).
   Native is needed only to re-check expected ids: `bash ../harness/build.sh`.
2. **Test first** (AD-2). Write `src/gvc/anchor-id-renders.test.ts` with
   `// SPDX-License-Identifier: EPL-2.0`, a header citing
   `lib/common/htmltable.c:initAnchor` (`static int anchorId`), the carried
   oracle and `plans/issue-191-anchor-id-renders/harness/native/`. Inline the
   two probe sources (`../harness/probes/*.gv`); drive `parse`,
   `createDefaultContext`, `ctx.layout` and `render` from `./device.js`, as
   `rerender-relabel.test.ts` does. Extract ids with one regex helper.
   Run it on the base: the same-layout cases fail, the AD-8 and public cases
   pass. Journal the counts.
3. **Change** (AD-1): `git apply plans/issue-191-anchor-id-renders/harness/prototype.diff`.
   The new test passes.
4. **Comments and docs** (AD-3): `htmltable-emit-rules.ts:179` and `:214`;
   `docs/process-statics.md` row `anchorSeq` (keep its column layout; verdict N).
5. **Probes.** `bash plans/issue-191-anchor-id-renders/harness/run-probes.sh head > plans/issue-191-anchor-id-renders/harness/results/probes-head.tsv`.
   Pass: `# equal 16, diff 4`, the 4 being the `l_svg_f_l_svg` and
   `l_svg_l_svg_l_svg` jobs.
6. **Gates 1-6** (README), each in the journal.
7. **Journal the artifact:**
   - **Mechanism:** the port resets `anchorSeq` at the start of every
     render; C's `anchorId` is a process static never reset, so a second
     render on one layout restarts ids at 0 where native continues.
   - **Origin:** `src/gvc/device.ts:507` (base `70bd5faf`).
   - **Causal chain:** `renderWithContext` → `render` → `resetHtmlAnchorIds`
     → `initHtmlAnchor` (`htmltable-emit-rules.ts:253`) emits `<obj>_0`.
   - **Ruled out:** the registered reset (does not run between renders on
     one layout: `l,svg,svg` prototype equal native); other renderers
     (xdot, json, json0, dot, plain, imap and cmapx consume as native);
     public entries (smoke and reach bytediffs identical).
8. **Finish** (README, "Branch and commits").

## Write-set

- `src/gvc/device.ts` (lines 35, 507 only)
- `src/common/htmltable-emit-rules.ts` (doc comments at 179, 214 only)
- `src/gvc/anchor-id-renders.test.ts` (new)
- `docs/process-statics.md` (row `anchorSeq`)
- `plans/issue-191-anchor-id-renders/` (journal, README, overview, harness results)
- `plans/decision-journal.md`; `.agent-notes/issue-191.md` (new)

## Read-set

- `src/gvc/device.ts:430-510`, `src/common/htmltable-emit-rules.ts:160-260`
- `src/common/render-state.ts`, `src/gvc/context.reset.test.ts`,
  `src/gvc/rerender-relabel.test.ts`
- `docs/process-statics.md:1-45`, `test/docs/process-statics.test.ts`
- `~/git/graphviz-16.1.1/lib/common/htmltable.c:365-400`

## Interface contracts

No signature changes. `resetHtmlAnchorIds` stays exported (used by
`registerRenderState`; `test/architecture/module-globals.fitness.test.ts:64`
names it).

## Budgets

`device.ts` 510 → 508 lines. The new test stays under 120 lines.

## Bytediff

Gate 5. Base bundle from `git archive 70bd5faf` in `$TMPDIR` (symlink
`node_modules`, `npm run parser:regen`, `npm run build:js`), or from the
working tree before step 3 (only the test differs; journal which). Head from
the working tree. Then

```
npx tsx test/tools/bytediff.ts $TMPDIR/i191/base.mjs $TMPDIR/i191/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i191/smoke.json
```

Expect 1960/1960 identical (planning: [../harness/results/smoke-bytediff.txt](../harness/results/smoke-bytediff.txt)).

## Targeted survey

Gate 6. Selection: [../harness/survey.md](../harness/survey.md#reach-selection).
Bytediff the 9 reach ids (strip the `#` line first) base against head:
expect 360/360 identical. Plus step 5's probe run against native.

## Observability / rollback

Observability: N/A (library, no logs or metrics; stderr unchanged).
Rollback: Reversible (revert the squashed commit).

## Acceptance criteria

1. **Given** `anchor.gv` laid out once, **when** rendered svg twice on one
   context, **then** the ids are `a_node1_0 a_node1_1`, then `a_node1_2 a_node1_3`.
2. **Given** one layout, **when** cmapx, xdot or json is rendered before svg,
   **then** the svg ids equal native's (`_2 _3`, `_2 _3`, `_4 _5`).
3. **Given** a layout before each render, **when** rendered, **then** each
   svg starts at `_0` (AD-8), and two public `render` calls both start at `_0`.
4. **Given** the head, **when** gates 1-6 run, **then** all pass, smoke and
   reach bytediffs identical, probes `# equal 16, diff 4`.
