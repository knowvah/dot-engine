# T7: `fix(T7)`: port the html fonttable rule (item 19a)

**Context:**
- C `lib/common/htmlparse.y:307-313`: `fonttable : table | font table n_font | italic
  table n_italic | underline table n_underline | overline table n_overline | bold table
  n_bold`. Used at the top level (`:207`) and inside a cell (`:332`).
- `font`/`bold`/… push a merged font (`pushFont`, `:469-485`); the `table` rule sets
  `$2->font = *LIST_BACK(fontstack)` (`:294`); `emit_html_tbl` pushes `tbl->font`
  (`htmltable.c:529`, `:591`), and sizing inherits it the same way.
- Port: `src/common/htmltable-parse.ts:507-528` `parseTextLabel` rejects a `<TABLE>` after
  blank-only text with a silent `HtmlParseError('TABLE')`, so
  `<<font color="red"><table><tr><td>x</td></tr></table></font>>` fails and prints a bare
  `in label of node a`; native renders the red table and prints nothing. The port's table
  type has no `font` field (`htmltable-types.ts`).

**Task (tests first):**
1. Parse the fonttable alternatives at the top level and in a cell: the wrapping tag's font
   merged as `pushFont` does, recorded on the table, popped at the closing tag. Keep
   `opt_space` handling and the existing non-space errors (`:287-300`).
2. Carry the table font through sizing and emission as C does (`pushFontInfo` at
   `htmltable.c:529`).

**Write-set:** `src/common/htmltable-parse.ts`, `src/common/htmltable-types.ts`,
`src/common/htmltable-pos.ts`, `src/common/htmltable.ts`, `src/common/htmltable-emit.ts`,
new `src/common/htmltable-fonttable.test.ts`.
**Read-set:** the C ranges above; `~/git/graphviz/lib/common/htmltable.c:520-600` and the
sizing path that reads the env font; `src/common/htmltable-parse.ts:150-200,495-540`.

**Acceptance criteria:**
- *Given* `<font color="red" point-size="20"><table>…</table></font>` at the top level and
  inside a `<td>`, *when* rendered with dot, *then* the SVG matches native within 0.01 and no
  `in label of` line is printed.
- *Given* each of `<b>`, `<i>`, `<u>`, `<o>` around a table, *then* likewise.
- *Given* `<s>` or `<sub>` around a table (not in the grammar), *then* the port fails the
  label as native does, with native's message.
- *Given* non-space text before or after the table, *then* the existing errors are unchanged.

**Observability:** N/A. **Rollback:** reversible. Consumer-visible: these labels now render.
