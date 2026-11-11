# T1: red stderr tests, the warning, gates, squash

## Context

`routeFlatEdge` (`src/layout/dot/edge-route.ts:417-418`) already takes C's
record exit: `isLostFlatAdjRecordEdge` (`edge-route.ts:400-406`). T1 adds C's
once-per-process warning to that exit (`lib/dotgen/dotsplines.c:1143-1152`), in a
new module (AD-1), with the names AD-2 fixes and the reset AD-3 fixes.

## Steps

1. **Red.** Add `src/layout/dot/flat-adj-record-warning.test.ts` (AD-4). Inline
   each probe's source from `../harness/probes/` and its native stderr from
   `../harness/native/*.err` as constants, with a provenance comment. For
   `1323.gv`, keep the whole source, or a cut-down copy that still gives native's
   exact four lines. If you cut it down, capture native's stderr for the cut
   input and journal it. Run the tests on the base: the 13 reaching probes fail
   and the two silent ones pass. Journal it.
2. **Green.** Create `src/layout/dot/flat-adj-record.ts` (SPDX header, `@see`
   tags). Move `isLostFlatAdjRecordEdge`'s test into it, and add the flag, the
   `registerRenderState` reset and both messages: `agwarningf` text without the
   trailing `\n`, then `agerr('prev', `  Edge ${t} ${sep} ${h}`)`. Export
   `flatLeadPair` from `splines-flat.ts` (add `export` only, no new lines) and use
   it for `tn` and `hn`. Use the graph's directedness for `sep`, and raw node
   names. In `edge-route.ts`, replace the old function and its call with the new
   export. The file must get shorter, not longer. Run the new tests.
3. **Process-statics row.** Add the new module's row to
   `docs/process-statics.md`: C static `warned`, `dotgen/dotsplines.c:1141`,
   which stays set on a no-free relayout, verdict N, and the evidence (it reads
   only the two shapes and names). Run `npx vitest run test/docs`.
4. **Check every probe.** Build the head bundle. Run
   `GVBINDIR=/tmp/ghl FORMATS=dot,xdot,plain node harness/compare.mjs
   <base.mjs> <head.mjs> harness/probes/*.gv` from the brief directory. Every
   `headErr` must be `same`, and `head` must equal `base` in every row (stdout
   unchanged). Anything else falls under stop condition 2 or 3.
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact. Mechanism, origin
   (`dotsplines.c:1143-1152`, port `edge-route.ts:400-418` on the base), causal
   chain, and ruled out: the `lost` lines already equal native, stdout is
   unchanged, and `splines=none` and `ortho` never reach the exit on either side.
7. **Finish** (README, "Branch and commits"): tag, soft reset, one commit.

## Write-set

- `src/layout/dot/flat-adj-record.ts` (new)
- `src/layout/dot/flat-adj-record-warning.test.ts` (new)
- `src/layout/dot/edge-route.ts` (replace the detector and its call)
- `src/layout/dot/splines-flat.ts` (`export` on `flatLeadPair` only. It must
  stay at 561 lines or fewer.)
- `docs/process-statics.md` (one row)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and the summary)
- `.agent-notes/issue-171.md` (only if novel)

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive <base>` in
`$TMPDIR` (`npm ci` or symlinked `node_modules`, `npm run parser:regen`,
`npm run build:js`, then copy `dist/index.js` to `base.mjs`). Build the head
bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i171-smoke.json
```

bytediff compares stdout only, so expect every output identical. Any changed
output is stop condition 3.

## Targeted survey

**Selection rule:** every corpus input under `~/git/graphviz/tests` and
`~/git/graphviz/graphs` whose text matches `record`, case-insensitive (70 files at
planning, from `grep -rliE record --include=*.gv --include=*.dot`). The exit
needs a record shape, so no other input can reach it. Run them with
`FORMATS=dot node harness/compare.mjs <base.mjs> <head.mjs> <files...>` (wait
while `uptime` is above 12).

**Pass:** for every file, `head` equals `base` (stdout unchanged), and no
`headErr` is `DIFF` where `baseErr` is `same`. List the files that move from
`DIFF` to `same`. For each file still `DIFF` on the head, diff its head stderr
with native's. If the only difference is something other than the warning (for
example a pre-existing message difference), journal it. If the warning itself
differs (missing, extra, or a different edge named), apply stop condition 2.
Journal the table.

## Observability / rollback

Observability: N/A (library: no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the 13 reaching probes fail
  and `splines-none` and `splines-ortho` pass.
- Given the fix, when `1323.gv` renders with `-Tdot`, then stderr is exactly
  native's four lines, in native's order.
- Given `two-pairs.gv` rendered twice in one process, when stderr is captured
  for each render, then each holds the warning once and names `a -> b`.
- Given `rankdir-lr.gv`, `undirected.gv` and `quoted-name.gv`, when rendered,
  then the `Edge` line is `a -> b`, `a -- b` and `x y -> p"q` respectively.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says. The finished log has exactly one commit after the base, with footer
  `Refs: #171`, and tag `issue-171/pre-squash` holds the per-task history.
