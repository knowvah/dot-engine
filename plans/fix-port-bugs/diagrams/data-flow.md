<!-- SPDX-License-Identifier: EPL-2.0 -->

# Data flow — the T3 hang mechanism (before/after)

```mermaid
sequenceDiagram
  participant PR as processRowToken
  participant PC as parseCellContent
  participant TK as token stream
  Note over PR,TK: BEFORE (bug): <TH> routed as a cell
  PR->>PC: open TH treated as TD-cell → parseCell
  loop forever
    PC->>TK: peek()
    TK-->>PC: close TH (never matches "close TD")
    PC->>PC: parseText breaks on close token WITHOUT consuming
  end
  Note over PR,TK: AFTER (fix): lexer emits TH as TR
  TK-->>PR: open TR (was <TH>)
  PR->>PR: row boundary — same path as <TR>
```

T1/T2/T4 have no multi-component flow: each is a single-function behavior fix
(parseString early-null; attrBool → mapbool; DtBag.delete splay walk).
