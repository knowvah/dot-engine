# T1: red probe tests, then the six beginpath/endpath halves

## Context

The issue's diagnosis artifact (README, Objective) gives the origin and the
mechanism. Planning confirmed the effect on base `cbf48285`: a `$TMPDIR` copy
with `Math.trunc(ranksep / 2)` at the six sites made all six probes equal to
native in every format. Decisions: AD-1 (no separate diagnosis), AD-3 (truncate
inline), AD-4 (render tests).

## Steps

1. **Bundles.** Build the base bundle from `git archive <base>` into
   `$TMPDIR/i173/base` (symlink the worktree's `node_modules`, run
   `npm run parser:regen`, then `npm run build:js`, then copy `dist/index.js` to
   `$TMPDIR/i173/base.mjs`). Planning left one there. Rebuild it if the base
   moved.
2. **Red.** Add `src/layout/dot/flat-adj-ranksep.test.ts`. Inline each
   `../../../plans/issue-173-ranksep-int-division/harness/native/<probe>.plain`
   as a constant with a provenance comment (native 16.1.0, `-Kdot -Tplain`,
   `GVBINDIR=/tmp/ghl`), plus `two-labelled.dot` for `-Tdot`. Compare exactly
   (`toBe`), as `flat-adj-ordering.test.ts:185,191` does. Run the file on the base
   source: every test must fail. Journal it.
3. **Green.** At the six sites, `ranksep / 2` becomes `Math.trunc(ranksep / 2)`:
   - `src/common/splines-path-begin.ts:40,53,124` (`splines.c:415,428,486`);
   - `src/common/splines-path-end.ts:49,58,124` (`splines.c:618,631,684`).

   At the first site in each file, add one comment line:
   `// C: GD_ranksep is int (types.h:335), so /2 truncates`. Check each port line
   against its C line before editing. Line 124 in each file is the port's form of
   C's `b0.UR.y - GD_ranksep/2` (`b0.LL.y - ...`). Run the new tests: green.
4. **Every format.** Build the head bundle into `$TMPDIR/i173/head.mjs` and run:

   ```
   GVBINDIR=/tmp/ghl node plans/issue-170-aux-ordering-mincross/harness/compare.mjs \
     $TMPDIR/i173/base.mjs $TMPDIR/i173/head.mjs \
     plans/issue-173-ranksep-int-division/harness/probes/*.gv
   ```

   `head` must be 0 for every probe and format, and every `headErr` `same`.
   Journal the table.
5. **Commit** `fix(T1): truncate ranksep/2 in beginpath and endpath end boxes`.

## Write-set

- `src/common/splines-path-begin.ts`
- `src/common/splines-path-end.ts`
- `src/layout/dot/flat-adj-ranksep.test.ts` (new)
- this mission's `decision-journal.md`

## Read-set

- `~/git/graphviz/lib/common/splines.c:395-700` (beginpath, endpath)
- `src/common/splines-path-begin.ts:30-130`, `src/common/splines-path-end.ts:40-130`
- `src/layout/dot/flat-adj-ordering.test.ts` (the test pattern)
- `src/layout/dot/rank.ts:165-175` (`edgelabel_ranks`)
- `src/layout/dot/splines-flat.ts:65-75` (the aux copies `ranksep`)

## Observability / rollback

Observability: N/A, no new observable operations (library: no logs, metrics or
traces). Rollback: Reversible (revert the commit).

## Acceptance criteria

- Given the base source, when `flat-adj-ranksep.test.ts` runs, then every probe
  test fails.
- Given the six sites truncated, when the test file runs, then every test passes.
- Given the head bundle, when `compare.mjs` runs on the six probes, then `head` is
  0 in `dot`, `xdot` and `plain`, and every `headErr` is `same`.
- Given the diff of T1, when it is read, then it changes only the six expressions,
  two comment lines and the new test file.
