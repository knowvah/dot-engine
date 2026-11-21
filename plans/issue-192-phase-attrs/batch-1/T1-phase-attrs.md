# T1: attach rank and order on a `phase` stop

## Context

`dotLayoutPipeline` (`src/layout/dot/index.ts:258-270` at base) stops at
phases 1-3 without C's `attach_phase_attrs` (AD-1). The whole `src/` change
is [../harness/prototype.diff](../harness/prototype.diff): two helpers and
three call sites (`declareEmptyNodeAttr` for AD-2, then `attachPhaseAttrs`).

## Steps

1. **Base.** If the tip is not `9fdfe503`, use the tip as base, re-apply
   the prototype by hand if needed, and journal it. Oracle preflight:
   `ls /tmp/ghl1611-carried/config8`. If it is missing, run
   `test/corpus/build-carried-oracle.sh` or
   `GVBINDIR=/tmp/ghl1611-carried ~/git/sseely/graphviz-carried/build/cmd/dot/dot -c`.
   Native output is needed only to re-check what the brief expects:
   `bash plans/issue-192-phase-attrs/harness/capture-native.sh`, then
   `git status` shows no change under `harness/native/`.
2. **Test first** (AD-3). Write `src/layout/dot/phase-attach.test.ts` with
   `// SPDX-License-Identifier: EPL-2.0` and the header AD-3 names. Use
   `parse` and `render` from `../../index.js`. Inline the probe sources and
   take the expected text from `harness/native/`. Run it on the base: every
   case fails except `p4-full`. Journal the counts.
3. **Change** (AD-1, AD-2):
   `git apply plans/issue-192-phase-attrs/harness/prototype.diff`. The new
   test passes, and so does `src/layout/dot/phase-attr.test.ts`.
4. **Probes.** `bash plans/issue-192-phase-attrs/harness/run-probes.sh head > plans/issue-192-phase-attrs/harness/results/probes-head.tsv`.
   Pass: last line `# same 56, diff 0`.
5. **Gates 1-6** (README), each in the journal.
6. **Journal the artifact:**
   - **Mechanism:** the port's `dotLayoutPipeline` returns at the phase 1-3
     stops without C's `attach_phase_attrs`, so nodes never get the `rank`
     and `order` attributes. Every attribute writer (dot, xdot, json via
     xdot) therefore omits them, and a root `node [rank|order=…]` default
     keeps its value where C resets it to `""`.
   - **Origin:** `src/layout/dot/index.ts:262`, `:265`, `:268` (base
     `9fdfe503`).
   - **Causal chain:** `render` → `ctx.layout` → `doDot` →
     `dotLayoutPipeline` → phase stop → `gvPostprocess` → writer prints
     `n.attrs`, which has no `rank` or `order`.
   - **Ruled out:** the serializer (the overlay prints what `n.attrs`
     holds; the prototype at the layout alone gives 56/56); the phase
     parsing (`graphPhase`; `phase-attr.test.ts` and the `p1-zero` and
     `p4-full` probes agree with native on the base for every
     non-attribute line); plain (no attributes; equal on the base).
7. **Finish** (README, "Branch and commits").

## Write-set

- `src/layout/dot/index.ts` (the import, two new helpers above
  `dotLayoutPipeline`, three stop lines)
- `src/layout/dot/phase-attach.test.ts` (new)
- `plans/issue-192-phase-attrs/` (journal, README, overview, harness results)
- `plans/decision-journal.md`; `.agent-notes/issue-192.md` (new)

## Read-set

- `src/layout/dot/index.ts:200-275`, `src/model/lazy-attrs.ts`
- `src/model/nodeInfo.ts:165-180` (`rank?`, `order?`)
- `src/render/dot/agwrite.ts:195-215` (every default entry prints)
- `src/layout/dot/phase-attr.test.ts` (style and helpers)
- `~/git/graphviz-16.1.1/lib/dotgen/dotinit.c:238-300`,
  `lib/cgraph/attr.c:257-309`, `lib/cgraph/write.c:268-315`

## Interface contracts

No exported signature changes. Both helpers are module-private.

## Budgets

`index.ts` grows from 361 to 390 lines (500 cap). Each helper stays under
10 NLOC. The new test stays under 150 lines.

## Bytediff

Gate 5. Base bundle: build from the working tree before step 3 (only the
test differs), or from `git archive <base>` in `$TMPDIR` with `node_modules`
symlinked, `npm run parser:regen`, then `npm run build:js`. Journal which.
Head bundle: from the working tree. Then

```
npx tsx test/tools/bytediff.ts $TMPDIR/i192/base.mjs $TMPDIR/i192/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i192/smoke.json
```

Expect every output identical: no smoke id sets `phase`
([../harness/survey.md](../harness/survey.md#reach-selection)).

## Targeted survey

Gate 6. No corpus id can reach the change (survey, reach selection), so the
survey is step 4's probe run against native: 14 probes x 4 formats.

## Observability / rollback

Observability: N/A (library, no logs or metrics; stderr unchanged).
Rollback: Reversible (revert the squashed commit).

## Acceptance criteria

1. **Given** `digraph { phase=2; a -> b; a -> c }`, **when** rendered
   `-Tdot`, **then** the output equals native's, with `order` and `rank` on
   each node.
2. **Given** `phase=1`, **when** rendered, **then** each node has `rank` and
   no `order`. **Given** `phase=3`, **then** both, with laid-out positions.
3. **Given** a root `node [order=7]`, **when** phase 2 is rendered, **then**
   the root prints `order=""`, and a subgraph's `node [rank=9]` is kept.
4. **Given** no `phase`, or `phase=4`, **when** rendered, **then** no
   `rank`/`order` attribute appears and smoke outputs are identical.
5. **Given** the head, **when** gates 1-6 run, **then** all pass and the
   probes give `# same 56, diff 0`.
