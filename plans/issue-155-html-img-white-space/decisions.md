# Decisions: issue #155

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended` on 2026-11-16, base `ea97a89a`. Every
decision below is the planner's recommendation, taken without a person. The
rejected options and the evidence are listed so the maintainer can audit them.
Probe evidence is under [harness/](harness/): 15 probes, each run on native
16.1.1 with `2821.png` present (`native-png/`) and absent (`native-nopng/`).

### AD-1: a "soft" parse error: print it, keep the label, return rv 3

**Context.** In 16.1.1's `image` rule (`lib/common/htmlparse.y:338-356`), a
non-space string before or after `<IMG>` calls `htmlerror` with no `YYABORT`.
`htmlerror` (`htmllex.c:52-59`) prints the message and the error context and
sets `ctx->error`. The parse goes on, `parseHTML` returns the label, and
`clearHTMLlexer` returns 3 (`htmllex.c:777`). `make_html_label`
(`htmltable.c:1827-1857`) takes the `lbl != NULL` path, so the label is sized
and drawn with the image, and its rv (3, ORed with the sizing rv) makes
`make_label` print `in label of …`. Measured: `txt-before`, `txt-after`,
`txt-both` and `nbsp-after` print the error and still draw one `<image>`.

**Decision.** `ParseState` gains `error?: boolean` (C's `ctx->error`). One
helper, called where C's mid-rule or final action runs, prints the error
through `s.stderr` at that point (so lexer warnings before and after it keep
their order) and sets the flag. `ParsedHtmlLabel` gains `error: boolean`.
`makeHtmlLabelTo` ORs `HTML_PARSE_FATAL` into rv when it is set, and keeps the
label.

**Rejected.** (a) Throw and let the existing catch handle it: that drops the
label, but native draws it. (b) Return the diagnostics as a list for the
caller to print: lexer warnings for later tokens (`soft-then-badattr`: the
`<TD BOGUS>` warning prints after the error) and the sizing warnings
(`Warning: No such file …`, printed after the error in `native-nopng/`) would
come out in the wrong order.

### AD-2: after a soft error, only `htmlerror` and expat messages go quiet

**Context.** `htmlerror` returns at once when `ctx->error` is set. Expat
errors print only when `!ctx->error` (`htmllex.c:1099`). `lexerror` (unknown
element, `htmllex.c:65-70`) has no guard. Measured: `soft-then-hard` (a later
bison syntax error) and `soft-then-mismatch` (a later expat mismatched tag)
print only the soft error and drop the label (no `<image>`, rv 3).
`soft-then-unknown` prints the soft error and then the unknown-element line.
`soft-twice` prints only the first soft error and draws both images.

**Decision.** With `s.error` set, `parseError` returns a silent
`HtmlParseError` (not an `HtmlLexError`), so the catch in `makeHtmlLabelTo`
prints nothing. A deferred lexical error (`s.pending`) after a soft error
prints only if it is the unknown-element kind. The executor picks how to tell
the kinds apart (for example a field on `HtmlLexError` set by
`checkTagToken`'s unknown-element branch) and journals it. A second soft error
prints nothing.

**Known gap.** `soft-then-unknown` prints the unknown-element line twice on
native and once in the port, because of the self-closing `<BOGUS/>`. That is
#228 and happens with no soft error too. It is not this mission's work: with
#155 done, the probe differs from native by exactly that one line.

### AD-3: the image rule goes in a new module

**Context.** `src/common/htmltable-parse.ts` has 584 lines. The complexity hook
blocks any edit that makes a file over 500 lines longer than it is at HEAD.

**Decision.** Create `src/common/htmltable-parse-image.ts` holding the image
rule: `parseImgContent` (moved), the before and after checks, and the soft
error helper, unless the helper fits better in `htmltable-parse-state.ts`
(the executor decides and journals it). `consumeClose` and `parseError` stay
where they are; export them if the new module needs them.
`htmltable-parse.ts` must end no longer than 584 lines, and no single edit may
make it longer than that. Move code out before adding any. Every new file
carries the SPDX header and `@see lib/common/htmlparse.y:338-356`.

**Rejected.** Growing `htmltable-parse.ts`: the hook blocks it. Splitting the
whole cell scanner out: more than this issue needs.

### AD-4: an image cell holds the image alone

**Context.** In C, `opt_space` text goes into `parser.str` and the action's
`agxbuse` takes it away. `$$ = $3` is the image, and `setCell(…, HTML_IMAGE)`
gives the cell one child.

**Decision.** For a cell whose content is an image, `parseCellContent` returns
`[image]` and drops the text runs before and after it. This is the same idea as
the nested-table case at `htmltable-parse.ts:313-317`.

**Grammar the port must match** (cell content, `T_cell … T_end_cell`):

| Tokens in the cell | 16.1.1 result | Probe |
|---|---|---|
| strings*, IMG, strings*, `</TD>`, all blank | image, no message | `ws-*`, `open-close` |
| strings with non-space, then IMG | soft error at the IMG token (`before <IMG>`) | `txt-before`, `txt-both` |
| IMG, strings with non-space, then `</TD>` | soft error at `</TD>` (`after <IMG>`) | `txt-after`, `nbsp-after` |
| IMG, strings*, then anything but `</TD>` | hard `syntax error` at that token | `two-img`, `ws-after-br` |
| a tag (BR, FONT, …) before IMG | hard `syntax error` at IMG (unchanged) | existing tests |

A string with only spaces is blank (`nonSpace` checks for `' '` only;
`&#160;` is non-space). When both the before and after checks fail, only the
first prints (AD-2).

### AD-5: no corpus records change

**Context.** `test/corpus/*.jsonl` and `accepted-divergences*.json` have no
row for `2821_0`, `2821_1` or `2821_2` yet. #148 classified `2821_1` and
`2821_2` as `pending-port #155` in its planning notes
(`plans/issue-148-corpus-1611-inputs/classification.md:50`), and the full
16.1.1 survey has not been run.

**Decision.** Write no corpus records. The maintainer's survey over the queue
branch records the rows. The harness cwd and image sizer (#226) are out of
scope: check both settings by hand (T1).

### AD-6: native's exit status is not modelled

Native exits 1 after a soft error, because `agerr` counted an error. The port
has no exit status (it is a library). The `Error:` line and `in label of …`
are the observable output, and they must match.

## Rollback

Reversible: revert the squashed commit. No data, format or API change.
`ParsedHtmlLabel` gains a field, but `parseHtmlLabelRv` is re-exported only
inside `src/common/` (`htmltable.ts:18`) and is not in the public API
(`src/index.ts`).
