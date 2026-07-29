<!-- SPDX-License-Identifier: EPL-2.0 -->

# T3 — HTML `<TH>` is a row synonym, not a TD alias (fixes infinite loop)

## Context

graphviz-ts is a faithful TypeScript port of Graphviz; the C source at
`~/git/graphviz` is the canonical spec. Tests use vitest; strict TS. TDD:
convert the existing `it.todo` into a real red test FIRST, verify red
(CAUTION: the current bug is a HANG — red manifests as a vitest timeout, so
write the test and run it with an explicit short `timeout` in the `it()`
options, e.g. 2000 ms), then fix src.

## The bug (locked analysis — if the fix turns out to differ, STOP)

C's lexer dispatches TH identically to TR: open → `T_row`, close →
`T_end_row` (`~/git/graphviz/lib/common/htmllex.c:614,669`) — TH is a
row-boundary synonym, never a cell. The port instead has
`t.tag === 'TD' || t.tag === 'TH'` in `processRowToken`
(src/common/htmltable-parse.ts:365 region), routing `<TH>` into the
cell-parsing path, while `parseCellContent`'s close-matcher only recognizes
`close TD` — so a `<TH>...</TH>` cell's content loop re-reads the same
unconsumed token forever: an infinite loop on any HTML label containing
`<TH>`. DoS-shaped for untrusted labels (plantuml-ts is the top consumer).

## Task

1. In src/common/htmltable-parse.branch.test.ts, replace the `it.todo` at
   :208 (describe "TH cells") with real test(s) asserting TH-as-row behavior.
   Confirm red (timeout).
2. Fix per decision D3 ([../decisions.md](../decisions.md#d3--th-normalized-to-tr-at-the-tokenizer)):
   in src/common/htmltable-lex.ts, normalize tag `TH` → `TR` at token
   emission for BOTH open and close tokens (the C analog: htmllex.c maps the
   tag at the lexer). `TH` stays in `KNOWN_TAGS`. Add a
   `@see lib/common/htmllex.c:614,669` comment. Cover the mapping in
   src/common/htmltable-lex.test.ts (open, close, and self-closing `<TH/>`).
3. Remove the now-dead `|| t.tag === 'TH'` disjunct in
   htmltable-parse.ts processRowToken (TH tokens can no longer reach it).
4. Confirm green; run the full quality bar.

## Write-set

- src/common/htmltable-lex.ts
- src/common/htmltable-lex.test.ts
- src/common/htmltable-parse.ts
- src/common/htmltable-parse.branch.test.ts

## Read-set

- src/common/htmltable-lex.ts:100-140 (scanTag/parseOpenToken/tokenize) and
  :20-35 (KNOWN_TAGS/checkTag); parseCloseToken wherever it is defined
- src/common/htmltable-parse.ts:250-275 (parseCellContent), :360-400
  (processRowToken + row close handling)
- src/common/htmltable-parse.branch.test.ts:184-250 (the todo + test helpers)
- ~/git/graphviz/lib/common/htmllex.c:605-675 (startElement/endElement TH→TR)

## Acceptance criteria

- Given `tokenize('<TH>')` / `tokenize('</TH>')`, when tokenized, then the
  emitted tokens carry tag `'TR'` (open with attrs, close respectively).
- Given an HTML label containing `<TH>...</TH>` around cells (e.g.
  `<TABLE><TH><TD>x</TD></TH></TABLE>`), when parsed, then parsing TERMINATES
  and yields 1 row with 1 cell whose text is `x` — TH delimits a row exactly
  as TR does.
- Given the same input where `<TR>` replaces `<TH>`, then the parse result is
  structurally identical (row-synonym property).
- The `t.tag === 'TH'` disjunct in processRowToken is gone.
- All existing htmltable-lex and htmltable-parse tests pass unchanged.

## Observability requirements

N/A — no new observable operations. (Fix removes an unbounded loop.)

## Rollback notes

Reversible — pure code change, revert the commit.

## Quality bar

`npm run typecheck` exit 0; `npm test` exit 0 (full suite);
`git diff --name-only` within the write-set only.

## Boundaries

- Never edit files outside the write-set.
- Never run the red test without a timeout guard (it hangs by design).
- Do not write decision-journal.md — return your journal-entry text in your
  final report instead.

## Commit

One commit: `fix(common): dispatch TH as a TR row synonym per htmllex.c (T3)`
Body: why (C htmllex.c:614,669; TD-alias routing hung parseCellContent
forever — DoS-shaped for untrusted labels).
