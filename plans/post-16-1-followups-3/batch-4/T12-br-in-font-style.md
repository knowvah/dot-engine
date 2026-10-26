# T12: `<BR/>` lines inside a font-style element (item 35, AD-7)

**Context:** `label=<k<u><br/><br/></u>>` places the lines differently from native (y off
by 6.76 pt); `k<br/><br/>` without the `<u>` matches. Found by item 27's fuzz (9 labels);
pre-existing on `main`. The grammar is `lib/common/htmlparse.y` (`textitem : ... | br |
font text n_font ...`); line assembly is `appendFItemList`/`appendFLineList` and sizing
`size_html_txt` (`htmltable.c`).

**Task:** diagnose first: dump the line list (each line's items, `lp.just`, `lfsize`)
natively (instrumented scratch copy of 16.1, stop 10) and in the port for `<k<u><br/><br/>
</u>>`, `<k<b><br/><br/></b>>` and `<<u>a<br/>b</u>>`. Name the first difference
(origin file:line), then port C's behaviour there.

**Write-set:** `src/common/htmltable-{parse,parse-font,parse-state,pos,pos-runs,label,types,fontinfo}.ts`
(+ tests). Not `htmltable-emit*` (T10) — if the origin is there, stop 1.
**Read-set:** `htmlparse.y` (text/br/font rules, `appendFLineList`), `htmltable.c`
`size_html_txt`, the port's parse/pos files.

**Acceptance criteria:**
- *Given* the three labels, *when* probed, *then* text y values match native to 0.01.
- *Given* T0's structured HTML fuzz and the 66 HTML-label corpus ids, *then* no new
  mismatches; the item-35 class goes to 0; byte-identity elsewhere.

**Observability:** N/A. **Rollback:** reversible.
