# T27: one HTML line builder (item 67)

**Context:** HTML line splitting and the "simple text" test exist twice: sizing in
`src/common/htmltable.ts` (`splitSizedLines` `:131`, `htmlTextIsSimple` `:178`) and
placement in `src/common/htmltable-pos-runs.ts` (`buildLineRuns` `:147`, `runsAreSimple`
`:198`). Part 3 T12 found them diverging (`<BR/>` inside a font style). C builds the lines
once (`lib/common/htmllex.c`/`htmlparse.y` `appendFItemList`/`appendFLineList`, then
`size_html_txt` and `emit_html_txt` read the same `htextspan_t` list).

**Task:** make one builder (in whichever file mirrors the C owner, `@see` the C) that both
sizing and placement consume; delete the duplicate; output byte-identical.

**Write-set:** `src/common/htmltable.ts`, `src/common/htmltable-pos-runs.ts` (+ tests;
a new `htmltable-lines.ts` if neither file is the right owner and the 500-line limit
requires it).
**Read-set:** the four functions above; `lib/common/htmlparse.y` `appendFLineList`,
`lib/common/htmltable.c` `size_html_txt`; part 3 T12 journal rows and
`plans/post-16-1-followups-3/parked/T12-htmltable-simple-text.patch`.

**Acceptance criteria:**
- *Given* the HTML-label ids × 8 engines × {svg, xdot}, *then* bytediff identical.
- *Given* HTML fuzz (3 seeds × 300), *then* per-seed bad lists equal T0's.
- *Given* the source, *then* exactly one line builder and one simple-text test remain.

**Observability:** N/A. **Rollback:** reversible.
