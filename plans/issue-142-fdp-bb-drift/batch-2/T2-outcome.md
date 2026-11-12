# T2: act on T1's class, close out, squash

## Context

T1 journalled the first divergence and its class
([AD-3](../decisions.md#ad-3-outcome-rule)). This task applies that class, runs
the gates, records the outcome, and squashes the mission.

## Task: class (a), port defect

1. **Red:** in the existing fdp test file nearest the fix (for example
   `src/layout/fdp/fdp.test.ts`, or the `*.branch.test.ts` beside the changed
   module), add a test that calls the smallest exported function containing the
   origin statement with T1's traced inputs, and asserts native's `%a` output
   exactly (write it as a decimal literal that round-trips, with the hex float in
   a comment). It must fail on the base source with the port's traced value.
2. **Green:** change the origin statement only, as C computes it (for a
   contraction, `fma`/`fms` from `src/common/fma.ts` with a `// contracted`
   comment as the other sites have). Keep the `@see` comment.
3. Re-run T1's traces on the head per
   [AD-5](../decisions.md#ad-5-what-an-a-fix-must-show). If a later divergence
   remains, classify it: another (a) is a new red/green cycle and commit (at most
   three in all); a (b) is recorded as below; a (c) is stop 3.
4. Check #142's case: `subg-fdp.cluster_k` root mode, render 3, with
   `plans/post-16-1-followups-11/harness/T7/port-vs-native.ts` against a native
   run of the noaddr plugin (`T7/variance.sh` arm `noaddr`, one run). Journal
   render 3's cluster bb x0 on base and head.
5. Commit each mechanism as `fix(T2): ...`.

## Task: class (b), platform libm

1. No `src/` change. Journal the standalone C program's output and the V8 value
   for the traced input; keep the program as `harness/libm-check.c`.
2. Check #142's case as in (a) step 4 on the base only, and journal whether the
   same libm call is the first divergence there (rerun T1's traces on the
   `subg-after-free.c` driver if render 3 needs it; if render 3 diverges first at a
   different site, classify that site too).
3. Commit as `docs(T2): record the fdp bb drift as apple libm <fn>`.

## Close-out (both classes)

1. Mark item 156 in `plans/post-16.1-followups/README.md` in the style of items
   152-159: `**[DONE — issue #142: <mechanism, origin, fix or "accepted as the
   sin/cos class (known-divergences.md:921), wontfix per the ruling on #133">]**`.
2. Gates 1-6 from the README (gate 5 for class (a) only), then the project journal
   row, `.agent-notes/issue-142.md`, the README batch table and a short Summary
   section, then the squash in the README.

## Bytediff

Class (a) only. Build the head with `npm run build:js` and copy `dist/index.js` to
`$TMPDIR/issue142-head.mjs`. Build the base from `git archive <base>` extracted
under `$TMPDIR`, with `node_modules` symlinked and `npm run parser:regen`, and copy
its bundle to `$TMPDIR/issue142-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue142-base.mjs $TMPDIR/issue142-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue142-bytediff.json
```

Every changed output must equal native, or meet one of the queue rules' two
exceptions (list such rows under "accepted-row changes" or "toward-native
changes"). The smoke list's fdp reach: every id runs on `-Kfdp`; `graphs-fdp` is
the issue's input. Expect few changed jobs: a last-bit change is visible only in
xdot's `%.5g` near zero or where it flips a rounding.

## Targeted survey

How the ids were chosen: the drift lives in fdp's layout, reached by every fdp
render; clusters are where `layout.c`'s bb and offset arithmetic runs. The set is:
`graphs-fdp` (the issue's input); the 16 A1-drift members in
`test/corpus/attribution-fdp.json` (`results[].id`, every one `drift-exonerated`
at planning; the ids whose remaining fdp difference is
drift, so a fix of the drift should move them toward native); and the nine
clustered tree inputs `tree-graphs-directed-clust`, `-clust1` to `-clust5`,
`tree-doc-dotguide-clust1`, `-clust2`, `-compound`, de-duplicated against the
attribution list. Resolve each id's path from `test/corpus/corpus-manifest.json`
(relative to `~/git/graphviz/tests`; `tree-*` paths start with `../`). Gate 6 on
these rows reads with the queue's accepted-row exception: they are accepted
drift, so a head that is no closer to native passes if `lost=0`.

Class (a):

```
GVBINDIR=$TMPDIR/issue142-ghl node plans/issue-142-fdp-bb-drift/harness/compare.mjs \
  $TMPDIR/issue142-base.mjs $TMPDIR/issue142-head.mjs <paths...>
```

Pass: every scored row has `lost=0` and `head ≤ base`; `structure=true` wherever
it was true on the base. Journal the full table and the `native-varies` rows.
Class (b): no `src/` change, so run the same command with the base bundle as both
arguments, journal the table as the record of the drift, and expect `lost=0`.

## Write-set

- Class (a): the one or more `src/layout/fdp/*.ts` files holding the origin
  statements, and their nearest test file in `src/layout/fdp/`.
- Class (b): `plans/issue-142-fdp-bb-drift/harness/libm-check.c`.
- Both: `plans/post-16.1-followups/README.md` (item 156 only),
  `plans/decision-journal.md` (one row), the mission's `decision-journal.md` and
  `README.md` (batch table, Summary), `.agent-notes/issue-142.md`.

## Read-set

- T1's journal rows and `harness/`
- `src/common/fma.ts`, the changed module and its tests
- `plans/post-16-1-followups-11/harness/T7/{port-vs-native.ts,variance.sh}`
- `plans/post-16-1-followups-10/harness/T15/subg-after-free.c`
- `plans/post-16.1-followups/README.md:712-730` (item style)

## Interface contracts

None. No exported signature changes.

## Acceptance criteria

- Given class (a) and the pinned inputs, when the new test runs, then it fails on
  the base with the port's traced value and passes on the head with native's.
- Given class (a), when T1's traces run on the head, then they equal native's up to
  the next classified divergence or to the end.
- Given class (b), when `harness/libm-check.c` runs on the traced input, then it
  prints native's value, and V8 prints the port's.
- Given either class, when gates 1-4 run, then all pass, and gate 6 has `lost=0`
  on every scored row.
- Given the squash, when `git log --oneline <base>..` runs, then there is one
  commit with footer `Refs: #142`, and the tag `issue-142/pre-squash` holds the
  per-task history.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
