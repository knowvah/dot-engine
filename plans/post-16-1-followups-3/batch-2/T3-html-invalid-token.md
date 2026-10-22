# T3: expat invalid-token errors in HTML text (item 40, AD-7)

**Context:** in HTML label text, native reports `Error: not well-formed (invalid token) in
line 1` (+ context line) and fails the label for: a bare `&` (`<p&q>`, `<p & q>`: C's
`htmllex.c:findNext` calls `scanEntity`, which finds no `;` and leaves the `&`), `&#;`,
`&#x;`, `&#X41;` (expat accepts only a lower-case `x`), `&#65q`, `&#xG;`. The port accepts
them and prints the text. `textRefError` (`src/common/htmltable-lex-expat.ts:421`) checks
only undefined entities and disallowed character numbers. Attribute values already model
expat's invalid token (`htmltable-lex-attvalue.ts:scanAttValue`/`scanRef`).

**Task:** model expat's content tokenizer for references in character data
(`xmltok_impl.c:PREFIX(scanRef)`, `scanCharRef`, `scanHexCharRef` in libexpat R_2_6_4;
fetch the source, it is not vendored). Report the error at the offset expat's event
pointer uses, with native's line number and `...context...` line, through the existing
`htmlErrorInLine`/`htmlErrorAtToken` path. Reuse `scanRef` where its rules are identical.

**Write-set:** `src/common/htmltable-lex-expat.ts`, `src/common/htmltable-lex.ts`
(+ `htmltable-lex-errors.test.ts`). **Read-set:** `htmltable-lex-expat.ts:400-450`,
`htmltable-lex-attvalue.ts:35-90`, `htmltable-lex.ts:170-240`, `htmllex.c:830-860`.

**Acceptance criteria:**
- *Given* each case above (and a multi-line label with the bad reference on line 2),
  *when* probed, *then* SVG and stderr equal native's.
- *Given* well-formed references (`&amp;`, `&#65;`, `&#x41;`, `&sup2;`), *then* unchanged.
- *Given* T0's HTML fuzz (3 seeds × 300) and the 66 HTML-label corpus ids, *then* no label
  fails on the branch alone; byte-identity elsewhere.

**Observability:** N/A. **Rollback:** reversible.
