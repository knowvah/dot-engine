# T2: red tests, the fix at T1's origin, gates, squash

## Context

T1's `diagnosis` journal row names the C statement and its port counterpart. T2
ports that statement as the C has it (AD-4), proves it on the four probes, and
runs the queue gates.

## Steps

1. **Red.** Add `src/layout/dot/flat-adj-ordering.test.ts` (AD-5). It renders
   each probe in `../harness/probes/` with `render(parse(src), 'plain',
   { engine: 'dot' })` and compares with the matching `../harness/native/*.plain`
   text, inlined as a constant with a provenance comment, as
   `flat-adj-w4.test.ts` does. Add a unit test for T1's value in the origin's
   existing test file if T1 names one. Run them on the base: every probe test
   must fail. Journal it.
2. **Green.** Change the port counterpart of T1's origin, and nothing else. Cite
   the C with `/** @see lib/dotgen/<file>.c:<function> */`. Run the new tests.
3. **Check every format.** Run `GVBINDIR=/tmp/ghl node harness/compare.mjs
   <base.mjs> <head.mjs> harness/probes/*.gv`. `head` must be 0 in `dot`, `xdot`
   and `plain` on all four probes, and every `headErr` must be `same`. Run
   `harness/trajectory.mts` on each probe: the aux lines must equal
   `harness/native/*.trajectory`.
4. **Gates 1-6** (README). Record each in the journal.
5. **Diagnosis row.** Update T1's `diagnosis` row if T2 changed any part of it.
6. **Finish** (README, "Branch and commits"): tag, soft-reset, one commit.

## Write-set

Change only the file that holds T1's origin, plus tests:

- one of: `src/layout/dot/mincross-build.ts`, `mincross-flat.ts`,
  `mincross-order.ts`, `mincross-cross.ts`, `mincross-utils.ts`, `mincross.ts`,
  `fastgr.ts`, `classify.ts`, `splines-flat.ts` (the size constraint in
  decisions.md applies), `splines-clone.ts`;
- `src/layout/dot/flat-adj-ordering.test.ts` (new);
- the origin's existing colocated test file (unit test only);
- `plans/decision-journal.md`, this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and the summary);
- `.agent-notes/issue-170.md` (only if novel).

If the fix needs two of the source files above, that is acceptable only when T1's
artifact says why (one cause, two C statements). Journal it. A file outside this
list is stop condition 1.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive <base>` in
`$TMPDIR` (`npm run parser:regen`, `npm run build:js`, copy `dist/index.js` to
`base.mjs`), and the head bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i170-smoke.json
```

Any changed output must equal native, or fit one of the queue rules' two
exceptions (list those rows in the report). Otherwise: stop condition 5.

## Targeted survey

Choose ids with a marker bundle, as `.agent-notes/issue-130.md` describes ("a
marker bundle finds the corpus ids a shared-primitive change can reach"). Build
it from a `$TMPDIR` copy of the head, with a `console.error` where the changed
statement gives a different value from the base's statement. Run it through
`test/tools/bd-job.ts` on the applicable manifest ids (`-Kdot -Tdot`, 45 s cap).
Add the nine ids that reach `makeFlatAdjEdges` on the corpus (`1444`, `1444-2`,
`1949`, `241_0`, `241_1`, `2437` and the three `ports` copies, from that note),
whether or not they print the marker. For every selected id, compare native, base
and head with `harness/compare.mjs`, or with `bytediff.ts --file` and a native
render. Journal the selection rule, the scan's count and the result table. Pass:
no id has more lines missing from native on the head than on the base, and no
`headErr` is `DIFF` where `baseErr` is `same`.

## Observability / rollback

Observability: N/A (library; no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new probe tests run, then all four fail.
- Given the fix, when `compare.mjs` runs on the four probes, then `head` is 0 in
  every format and every `headErr` is `same`.
- Given the fix, when `trajectory.mts` runs on each probe, then its aux
  `mincross:` lines equal `harness/native/<probe>.trajectory`.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says.
- Given the finished mission, when `git log <base>..` is listed, then there is
  exactly one commit, with footer `Refs: #170`, and tag `issue-170/pre-squash`
  holds the per-task history.
