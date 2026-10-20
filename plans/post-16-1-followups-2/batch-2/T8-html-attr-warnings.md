# T8: `fix(T8)`: port htmllex.c's attribute and value warnings (item 19b)

**Context:**
- C `lib/common/htmllex.c` validates every attribute in `doAttrs` (macro at `:540-552`)
  against per-element tables (`tbl_items` `:436`, `cell_items` `:461`, `font_items` `:492`,
  `img_items` `:504`, `br_items` `:514`). An unknown name prints
  `Warning: Illegal attribute <name> in <ELEMENT> - ignored`; a handler returning nonzero
  sets `ctx->warn`. Value warnings (each `agwarningf`, so `Warning: ` prefixed): sides
  (`:115`), STYLE (`:155`), `Improper %s value %s - ignored` / `too large` / `too small`
  (`:185-191`), COLUMNS (`:252`), ROWS (`:263`), FIXEDSIZE (`:275`), VALIGN (`:288`), ALIGN
  (`:301`, `:423`), ALIGN in TD (`:318`), BALIGN in TD (`:331`), ROWSPAN 0 (`:361`),
  COLSPAN 0 (`:376`). Lines ending `\n` in C print without it in the port; those without
  (`:185-191`) are joined as `agwarningf` prints them — check native.
- `rv = ctx->error ? 3 : ctx->warn` (`:780`): any warning makes `make_label` print
  `in label of <kind> <name>` (the port already does this for rv=1 size warnings).
- Order: C prints lexer warnings as tokens are lexed, interleaved with yacc. The port lexes
  the whole label first (`src/common/htmltable-lex.ts`), then parses
  (`htmltable-parse.ts`). A warning on a token the parser never reaches (after a syntax
  error) must not print.
- Port today: none of these strings exist in `src/`
  (`src/common/htmltable-parse-attrs.ts` silently ignores bad values, `:90`).
- Probe: `<<table bogus="1" align="weird"><tr><td>x</td></tr></table>>` → native prints
  `Warning: Illegal attribute bogus in <TABLE> - ignored`, `Warning: Illegal value weird
  for ALIGN - ignored`, `in label of node a`; the port prints nothing.

**Task (tests first):**
1. Give each lexed token a `warnings: string[]`; port each `doAttrs` table and value
   handler, with C's exact accept/ignore semantics (AD-7) and text.
2. The parser prints a token's warnings (`console.warn`) when it consumes the token, and
   marks the label rv=1 so `in label of` prints. Errors keep their existing path.
3. Add every native-matching warning to golden "logs nothing" allow-lists that now see it
   (`test/golden/pt-issue-29.test.ts:49` pattern).

**Interface output (consumed by T9):** the `warnings` array on lexer tokens and the
consume-time print; T9 adds its lexer warnings the same way.

**Write-set:** `src/common/htmltable-parse-attrs.ts`, `src/common/htmltable-lex.ts`, the
token-consume print in `src/common/htmltable-parse.ts` (only the consume helper;
T8 starts from T7's landed commit), new
`src/common/htmltable-attr-warn.test.ts`, `test/golden/*.test.ts` allow-lists.
**Read-set:** `~/git/graphviz/lib/common/htmllex.c:100-560,740-790`;
`src/common/htmltable-parse-attrs.ts`; `src/common/htmltable-lex.ts:140-200`.

**Acceptance criteria:**
- *Given* one input per C warning site, *when* rendered, *then* the port prints native's
  text, then `in label of …`, in native's order.
- *Given* an illegal value (e.g. `align="weird"`), *then* the attribute is ignored as in C,
  and the SVG matches native.
- *Given* an illegal attribute on a token after a syntax error, *then* nothing prints for it.
- *Given* T0's native stderr, *then* every HTML-label corpus id's warning count matches.

**Observability:** new stderr lines. **Rollback:** reversible.
