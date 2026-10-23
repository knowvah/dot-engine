# T4: expat BT_NONXML in HTML content (item 44)

**Context:** `label=<a\001b>`: native expat's `contentTok` classifies a raw control
character (other than TAB/LF/CR) as `BT_NONXML` → `XML_TOK_INVALID`, so native prints
`Error: not well-formed (invalid token) in line 1` / `... <HTML>a\001b ...` (escaped as
`\001` by `default_usererrf`) / `in label of node a` and drops the label. The port keeps
`ab` and prints nothing; `&#1;` already matches. `src/common/htmltable-lex-expat.ts` models
`XML_ERROR_INVALID_TOKEN` (`:23`) and contentTok's reference rules (`:277`, `:429`) but not
BT_NONXML.

**Task:** port expat's `byte_type` BT_NONXML classification for content and attribute
values as `xmltok_impl.c` `contentTok`/`attributeValueTok` apply it (UTF-8 encoding table,
`asciitab.h`, `latin1tab.h`), raising the same error at the same token position and context
as the existing invalid-token path (part 3 T3). Check whether attribute values hit the same
rule natively (probe `<TABLE BGCOLOR="a\001">`); port what native does.

**Write-set:** `src/common/htmltable-lex-expat.ts` (+ its test file; `htmltable-lex.test.ts`
only to replace a test pinning non-native behaviour).
**Read-set:** `htmltable-lex-expat.ts:1-60,260-300,410-440`; expat
`lib/xmltok_impl.c` (contentTok BT_NONXML), `lib/asciitab.h`; part 3 T3 journal rows.

**Acceptance criteria:**
- *Given* `digraph{a[label=<a\001b>]}`, *when* rendered, *then* stderr equals native's three
  lines and the node label is empty, as native.
- *Given* `&#1;` and TAB/LF/CR in content, *then* output and stderr are unchanged from T0.
- *Given* the 66 HTML-label corpus ids, *when* bytediff runs, *then* 0 diffs.

**Observability:** N/A. **Rollback:** reversible.
