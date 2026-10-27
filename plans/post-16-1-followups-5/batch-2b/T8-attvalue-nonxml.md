# T8: attribute-value NON_XML set (AD-14, item 76)

**Context:** `src/common/htmltable-lex-attvalue.ts:35` `NON_XML` rejects C0 controls in
attribute values; `htmltable-lex-expat.ts:280` `CONTENT_NON_XML` (part 4 T4) also rejects
U+FFFE/U+FFFF and lone surrogates in content. Expat's tokenizer uses one BT_NONXML
classification for both, but native has not been probed for attribute values.

**Task:** (1) Probe native (`$BASE/native/76*`): `<TD BGCOLOR="&#xFFFE;">`, a literal
U+FFFF, and a lone surrogate inside an attribute value, plus the same in content; record
each stderr line. (2) Port exactly what the probe shows expat rejects in attribute values
(expected: the content set, as one regex shared with or equal to `CONTENT_NON_XML`). If
the probe shows a rejection that one regex cannot express, stop (stop 10). (3) Tests per
probe case.

**Write-set:** `src/common/htmltable-lex-attvalue.ts` (+test).
**Read-set:** `src/common/htmltable-lex-expat.ts:275-300`; part-4 T4 journal rows.

**Acceptance criteria:**
- *Given* each probe case, *when* parsed, *then* the port's error line equals native's.
- *Given* the HTML-label corpus ids, *then* bytediff identical.

**Observability:** N/A. **Rollback:** reversible.
