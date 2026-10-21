# post-16.1 follow-ups part 2 — observations (2026-10-20)

## Observation: native stdin errors carry a `<stdin>: ` prefix
- **Context**: T6 (aagerror).
- **Finding**: `printf '…' | dot` prints `Error: <stdin>: syntax error in line …` and
  chkNum warnings say `of <stdin>`; a `#line N "f"` directive switches it to `f: `. AD-4
  assumed stdin had no prefix; the port prints none (and "of input" in chkNum).
- **Impact**: stderr comparisons against stdin-fed native must strip `<stdin>: `.
- **Confidence**: High

## Observation: aagerror's `near` text after a string is its closing delimiter
- **Context**: T6.
- **Finding**: flex's yytext after a quoted / HTML string is the closing `"` / `>`, so
  native prints `near '"'` / `near '>'`. Peggy's furthest-failure offset is past the flex
  token start after a stray `-` or `.`, and at EOF for a truncated header keyword
  (`digra`); `src/parser/scan-token.ts` corrects both.
- **Confidence**: High

## Observation: unconstrained ipsep distances come from bfs over ewgts
- **Context**: T5.
- **Finding**: native `mode=ipsep` without constraints runs `stress_majorization_cola`,
  which always uses `compute_apsp_packed` → `bfs` stepping by int-truncated `ewgts`
  (len or 1.0 via haveDir), not Dijkstra. Earlier "ipsep matches native" notes held only
  without `len`. The port's `VtxData.ewgts` uses `[]` for C's NULL: check `.length === 0`.
- **Confidence**: High

## Observation: lldb on static symbols of the oracle plugins
- **Context**: T5, T13.
- **Finding**: lldb can break on static (`t`) neatogen symbols in
  `libgvplugin_neato_layout.dylib` by name (`stress_majorization_cola`,
  `compute_apsp_packed`), giving native internal dumps without a rebuild. A scratch
  rebuild of 16.1.0 needs `-DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison
  -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex` (~13 s for dot + core/dot/neato).
- **Confidence**: High

## Observation: libm-class drift can be isolated by injecting native libm values
- **Context**: T13 (sfdp 2168_3).
- **Finding**: log every `Math.*` input in the port, evaluate them with a C program
  against macOS libm, re-inject keyed by input bits. 2168_3's extra warning is one `sin`
  value where macOS is 1 ulp off the correctly rounded result (V8 is correct), amplified
  by a cocircular Delaunay tie. Apple's libm source is not public, so it cannot be
  modelled like `libm-hypot.ts`.
- **Confidence**: High

## Observation: C's html savef is function-static and leaks across nesting
- **Context**: T7.
- **Finding**: `htmltable.c` size_html_tbl (:1653) and emit_html_tbl (:523) each keep a
  `static textfont_t savef`; with 3-deep wrapped tables native draws a later sibling's
  text at the inner-saved size. Only text without its own font field shows it; empty
  `<td></td>` cells have no font-dependent size. The port's pos relayout re-runs nested
  sizing (C does not), so the size slot is also exercised during positioning.
- **Confidence**: High
