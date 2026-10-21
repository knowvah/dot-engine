# T9: `fix(T9)`: port the html lexer's comment, early-close and quote errors (item 19c)

**Context:**
- C `lib/common/htmllex.c:806-850`: `eatComment` prints `Warning: Unclosed comment` when
  a `<!--` reaches the end of its nesting without `-->` (`:822`); `findNext` prints
  `Warning: Label closed before end of HTML element` when a `<…` unit has no `>` (`:844`).
  Both set `ctx->warn`.
- Expat errors print `Error: <XML_ErrorString> in line <n> ` plus `error_context`
  (`:1085-1100`); the port already does this for `undefined entity` and `mismatched tag`
  (`src/common/htmltable-lex.ts:151`, `HtmlLexError.diagnostics`).
- Probes (native vs port):
  - `a [label=<<!-- y >>]` → native `Warning: Unclosed comment`, `Error: syntax error in
    line 1 `, `... <!-- y ></HTML> ...`, `in label of node a`; port prints nothing.
  - `a [label=<<table border="1><tr><td>x</td></tr></table>>]` → native
    `Error: not well-formed (invalid token) in line 1 `, `... </td></tr> ...`,
    `in label of node a`; port prints only `in label of node a`.
  - `Label closed before end of HTML element`: build a probe (e.g. a label whose last unit
    is `<b` with no `>` once the DOT scanner's nesting is balanced) and match native.

**Task (tests first):** port both warnings at their C sites using T8's token `warnings`
mechanism (printed when the parser reaches the token), and the unterminated-quote path to
expat's `not well-formed (invalid token)` with C's line and context. Match the label
outcome (empty vs text) to native for each probe.

**Write-set:** `src/common/htmltable-lex.ts`, `src/common/htmltable-parse.ts` (only if the
syntax-error context needs it), new `src/common/htmltable-lex-errors.test.ts`, golden
allow-lists if a golden now sees one of these.
**Read-set:** the C ranges above; `src/common/htmltable-lex.ts:140-260`; T8's interface.

**Acceptance criteria:**
- *Given* each probe above, *when* rendered, *then* the port's stderr equals native's line
  for line, and the SVG label matches native's (empty when native's parse failed).
- *Given* T0's native stderr, *then* each HTML-label corpus id's count of these messages
  matches.

**Observability:** new stderr lines. **Rollback:** reversible.
