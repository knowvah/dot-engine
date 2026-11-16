# T1: white space around `<IMG>` in a cell (16.1.1 image rule)

## Context

Graphviz 16.1.1 rewrote the `image` rule (`~/git/graphviz-16.1.1/lib/common/htmlparse.y:338-356`;
upstream `765733407`, `3261dba20`, regression test `test_2821`). Read it with
`git -C ~/git/graphviz-16.1.1 show -w 765733407 3261dba20 -- lib/common/htmlparse.y`.
Strings before and after `<IMG/>` in a `<TD>` are now allowed. If they are blank
(spaces only), nothing is printed. If not, `htmlerror` prints
`Syntax error: non-space string used before <IMG>` or `… after <IMG>`, and the
label is kept and drawn ([AD-1](../decisions.md#ad-1-a-soft-parse-error-print-it-keep-the-label-return-rv-3)).

The port still has 16.1.0's rule: `scanCellImage` (`src/common/htmltable-parse.ts:273-277`)
requires an empty cell before the IMG, and `scanCellItem` (`:292`) rejects
anything after it. So every probe ends in a hard `syntax error` and an empty
label. Corpus ids `2821_1` and `2821_2` show this (#148).

Decisions: [AD-1](../decisions.md) to [AD-6](../decisions.md). The grammar
table in AD-4 is the spec for this task.

## Task (TDD)

1. **Red, parser.** In `src/common/htmltable-parse.branch.test.ts`, under
   `describe('IMG cell content')`, add a case for each AD-4 row. Assert the
   cell content (`[{ kind: 'image', src }]` and nothing else) and the exact
   diagnostics. The expected lines come from `harness/native-png/<probe>.stderr`,
   minus the `in label of …` line, which `make_label` prints. Rewrite the
   existing `'text next to an IMG is a syntax error'` case (`:172-177`): on
   16.1.1 `<IMG SRC="n.png"/>xx` gives
   `Error: Syntax error: non-space string used after <IMG> in line 1 ` /
   `... xx</TD> ...` (measured at planning) and keeps the image. Expected
   red: the base throws
   `syntax error`. Add the AD-2 cases too: a soft error, then a hard error;
   then a mismatched tag; then a second soft error; then an unknown element.
   In each, the later error prints as AD-2 says.
2. **Red, label.** In `src/common/htmltable-label-errors.test.ts`, render
   `txt-after`'s label with `makeHtmlLabelRv` and a 1×1 sizer. Assert:
   rv & 3 is 3; the label is `html: true` with one image; stderr is the soft
   error, then `in label of …` from the caller (or rv alone, if this file
   checks rv only, which is how its existing cases work). Add one end-to-end
   case through `renderSvg` with `setImageSizer(() => ({ w: 1, h: 1 }))` for
   `ws-after` (no stderr, one `<image>`) and `txt-before` (the soft error,
   `in label of node Q`, one `<image>`). Put it in that file or in
   `src/common/htmltable-img-space.test.ts` (new). Also check that the async
   collect pass (`src/async/collect.ts:136`, `parseHtmlLabel`) gets the
   image of a soft-error label: one assertion in `src/async/collect.test.ts`.
3. **Green** per AD-1 to AD-4. Move `parseImgContent` to
   `src/common/htmltable-parse-image.ts` **before** adding anything (AD-3:
   `htmltable-parse.ts` may never pass 584 lines). Then:
   - The cell scan lets IMG follow text runs made only of strings (no tags
     consumed since `<TD>`). It checks them for non-space at the IMG token
     ("before"), consumes strings after the IMG, and at `</TD>` checks them
     ("after"). Anything else after the IMG is a hard syntax error at that
     token.
   - The soft error helper does: `emitWarnings` for the token, then print
     `htmlErrorAtToken(msg, tok).diagnostics` through `s.stderr` (each line
     with its `\n`, as `makeHtmlLabelTo` does) unless `s.error` is set, then
     set `s.error`.
   - `parseError`: once `s.error` is set, a plain `HtmlParseError`. Deferred
     lexical errors per AD-2.
   - `parseHtmlLabelRv` returns `error: s.error === true`. `makeHtmlLabelTo`
     ORs `HTML_PARSE_FATAL` into rv when it is set.
   - `@see` tags: `lib/common/htmlparse.y:338-356` (image) and
     `lib/common/htmllex.c:52-59` (htmlerror).
4. Re-run the touched test files, then `bash plans/issue-155-html-img-white-space/harness/compare-native.sh <head.mjs>`
   (see [Targeted survey](#targeted-survey)). Then gates 1-6 (README). Journal
   each.
5. **Finish:** the README's squash step.

## Write-set

- `src/common/htmltable-parse.ts`, `src/common/htmltable-parse-image.ts` (new),
  `src/common/htmltable-parse-state.ts`, `src/common/htmltable-label.ts`,
  `src/common/htmltable-lex.ts` (only for AD-2's error kind)
- `src/common/htmltable-parse.branch.test.ts`, `src/common/htmltable-label-errors.test.ts`,
  `src/common/htmltable-img-space.test.ts` (new, optional), `src/async/collect.test.ts`
- Any other existing test that asserts 16.1.0's IMG syntax error: update it to
  16.1.1's output and journal it. Find them with
  `grep -rn "IMG" src --include=*.test.ts`. At planning only `:172-177` matched.
- `plans/issue-155-html-img-white-space/` (journal, README status),
  `plans/decision-journal.md`, `.agent-notes/issue-155.md` (only if novel)

## Read-set

- `~/git/graphviz-16.1.1/lib/common/htmlparse.y:150-163` (nonSpace), `:282-356`,
  `:516-545`; `htmllex.c:41-70`, `:721-738`, `:774-778`, `:1090-1107`;
  `htmltable.c:1827-1857`
- `src/common/htmltable-parse.ts:40-84`, `:218-325`, `:536-584`
- `src/common/htmltable-parse-state.ts` (64 lines), `src/common/htmltable-label.ts:22-76`
- `src/common/htmltable-lex.ts:160-232`, `:247-264`
- `src/common/htmltable-parse.branch.test.ts:1-40`, `:152-178`
- [harness/probes/](../harness/probes/), [native-png/](../harness/native-png/), [native-nopng/](../harness/native-nopng/)

## Interface contracts

```ts
// htmltable-parse-state.ts
interface ParseState { /* … */ error?: boolean }   // C's ctx->error
// htmltable-parse.ts
interface ParsedHtmlLabel { label: HtmlLabel; warn: boolean; error: boolean }
```

`makeHtmlLabelTo`'s signature does not change. No public export changes.

## Acceptance criteria

- Given `<TD><IMG SRC="2821.png"/> </TD>` (`2821_1`), when parsed, then the
  cell content is the image alone and nothing is printed.
- Given `<TD>x <IMG …/></TD>`, when rendered with a 1×1 sizer, then stderr is
  `harness/native-png/txt-before.stderr` and the SVG has one `<image>`.
- Given a soft error and then a hard syntax error in a later cell, when
  rendered, then only the soft error and `in label of node Q` print, and the
  label is empty.
- Given the 15 probes, when `compare-native.sh` runs on the head bundle, then
  14 are EQUAL and `soft-then-unknown` differs only by one missing
  `Error: Unknown HTML element <BOGUS> on line 1 ` line (#228).
- Given the survey ids, when bytediffing base and head, then only `2821_1` and
  `2821_2` change, and their head output equals native from the repository
  root.

## Bytediff

`src/` changes, so gate 5 applies. Build each bundle with build:js's esbuild
line for `src/index.ts`. Write the head to `$TMPDIR/issue155-head.mjs`, so
`dist/` does not change under a running test. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked
and `npm run parser:regen`, and write it to `$TMPDIR/issue155-base.mjs`.

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue155-base.mjs $TMPDIR/issue155-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue155-bytediff.json
```

Expected: identical. No smoke input puts an IMG next to strings in a cell.

## Targeted survey

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
every input in the 16.1.1 `tests/` tree that contains `<IMG`
(`grep -rli '<IMG' ~/git/graphviz-16.1.1/tests --include=*.dot --include=*.gv`).
That gives 7 ids, all dot. The change only affects cells that hold an IMG, and
AD-2's silencing only happens after a soft error, which needs an IMG.

```
H=plans/issue-155-html-img-white-space/harness
BD_ENGINES=dot BD_FORMATS=svg,xdot,plain,json,cmapx npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue155-base.mjs $TMPDIR/issue155-head.mjs $H/survey-ids.txt \
  $TMPDIR/issue155-survey.json
bash $H/compare-native.sh $TMPDIR/issue155-head.mjs
```

Expected: `1879`, `2619`, `2619_1`, `2619_2` and `2821_0` identical. `2821_1`
and `2821_2` change in every format. For each changed job, compare the head
with native run **from the repository root**, where neither side finds
`2821.png`:
`GVBINDIR=/tmp/ghl1611 ~/git/graphviz-16.1.1/build/cmd/dot/dot -T<fmt> <input>`
against `node test/tools/bd-job.ts $TMPDIR/issue155-head.mjs <input> dot <fmt>`,
cut at `\n--stderr--`. The output and stderr must be equal. Native's stderr
there is the missing-file warning, the `No or improper image` error, and
`in label of …`. These are toward-native changes (queue rules). List them with
diff-line counts on base and head. Then check the image path once by hand:
render `2821_1` and `2821_2` with a 1×1 sizer and compare with native run
from `~/git/graphviz-16.1.1/tests/` (svg and stderr). Journal both settings
(#226).

Probes: base 0/15 EQUAL (measured at planning); head per the acceptance
criteria.

## Observability

N/A. The observable output is the stderr lines native prints, and the tests
cover them.

## Rollback

Reversible: revert the commit.
