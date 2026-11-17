# issue-155: white space around `<IMG>` (16.1.1 image rule)

## Observation: a grammar error can keep the label (htmlerror without YYABORT)
- **Context**: porting graphviz 16.1.1's `image` rule
  (`lib/common/htmlparse.y:338-356`).
- **Finding**: the rule's two nonSpace checks call `htmlerror` and do not
  `YYABORT`. The message and its context print, `ctx->error` is set, and the
  parse goes on. `parseHTML` returns the label and rv 3
  (`clearHTMLlexer`, `htmllex.c:777`), so `make_html_label` sizes and draws
  it and `make_label` appends `in label of ...`. Every other `htmlerror` in
  the grammar aborts. In the port this is `ParseState.error`,
  `ParsedHtmlLabel.error` and `softError` in
  `src/common/htmltable-parse-image.ts`.
- **Impact**: rv 3 no longer means "no label". A caller that needs to know
  whether the label was dropped must look at the label, not at rv.
- **Confidence**: High (15 brief probes and 28 more against native 16.1.1)

## Observation: bison default reductions run the image rule's final action at the wrong token
- **Context**: checking what follows `<IMG/>` and a string when the next
  token is not `</TD>`. The brief's table called that a hard syntax error.
- **Finding**: bison 3.8.2's report for `htmlparse.y` (`bison --report=all`)
  shows the states after `T_IMG` (116, 118, 91, 119, 120) reduce by
  `$default`. The trailing `opt_space` and then `image` reduce on any
  lookahead, so the "after `<IMG>`" check runs at whatever token follows the
  strings. With a non-space string native prints
  `non-space string used after <IMG>` with that token as context, then hits
  the syntax error at the same token with `ctx->error` already set, prints
  nothing more and drops the label. Measured:
  `<TD><IMG SRC="a"/> y<BR/></TD>` gives the after-IMG error with context
  ` y<BR/>` and no image. With a blank string the check passes and the plain
  `syntax error` prints.
- **Impact**: when a rule ends in an optional item, its action can run before
  the parser sees that the next token is wrong. Read the bison report, not
  the grammar alone, to know at which token an action runs and whether an
  error in it comes before the syntax error.
- **Confidence**: High

## Observation: with `ctx->error` set, an expat error turns into end of input
- **Context**: AD-2, what prints after the image rule reported an error.
- **Finding**: `htmllex` (`htmllex.c:1099-1107`) sets `T_error` only inside
  `if (!ctx->error)`. After an earlier error, a failing `XML_Parse` leaves
  `ctx->tok` at 0, the loop feeds the remaining chunks (each fails again) and
  the lexer returns EOF. The parser then fails silently on EOF. `lexerror`
  (unknown element) has no such guard: it prints and returns `T_error`.
  `htmlerror` returns at once when the flag is set.
- **Impact**: after a first error, only `Unknown HTML element` lines and
  lexer warnings can still print for a label. The port marks that error kind
  with `HtmlLexError.unguarded`.
- **Confidence**: High

## Observation: text held in `ctx->xb` could not be put in front of an IMG
- **Context**: the image rule's checks read `agxbuse(parser.str)`, the same
  buffer the table rule reads, for which TABLE tokens carry `heldText`.
- **Finding**: a 300,000-case fuzz of the port's lexer (CDATA, comments,
  processing instructions, quoted `>`, `]`, CR) produced no token with
  `heldText`, in a cell or at the top level. CDATA text reaches the parser as
  ordinary strings, and native agrees on the CDATA probes
  (`<![CDATA[x]]><IMG/>` is the before-IMG error). IMG tokens therefore carry
  no `heldText`, and the image rule's checks read string tokens only.
- **Impact**: if an input is ever found that leaves text in `xb` when a
  non-string token arrives, both `releaseXb`
  (`src/common/htmltable-lex-chardata.ts`) and `scanCellImage` need it.
- **Confidence**: Medium (absence shown by fuzzing, not by proof)
