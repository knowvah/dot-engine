# T6: `fix(T6)`: print DOT syntax errors in aagerror's format (item 23)

**Context:**
- C `lib/cgraph/scan.l:150-187` `aagerror` prints, via `agerrorf`:
  `[<file>: ]<msg> in line <n>` then ` near '<yytext>'` if the token text is non-empty,
  else by scanner state: ` scanning a quoted string (missing endquote? longer than 16384?)`
  + `\nString starting:"<first 80>`; ` scanning a HTML string (missing '>'? bad nesting?
  longer than 16384?)` + `\nString starting:<<first 80>`; ` scanning a /*...*/ comment
  (missing '*/? longer than 16384?)`. `<msg>` is bison's `syntax error`. The HTML nesting
  rules are `scan.l:143-145`.
- Port `src/parser/index.ts:241-273` `parse` wraps Peggy's error in `ParseError` (message
  `Expected … but … found.`) and prints nothing.
- Native vs port today (planning probes):
  - `digraph { a [label="x] }` → native `Error: syntax error in line 2 scanning a quoted
    string (missing endquote? longer than 16384?)` / `String starting:"x] }`.
  - `digraph { a /* x }` → `… in line 2 scanning a /*...*/ comment (missing '*/? longer
    than 16384?)`.
  - `digraph { a -> }` → `… in line 1 near '}'`.
  - `digraph { a [label=<x <!-- y >] }` → `… in line 2 scanning a HTML string (missing '>'?
    bad nesting? longer than 16384?)` / `String starting:<x <!-- y >] }`.
  Native also prefixes `<file>: `; the port omits it (AD-4, stdin form).

**Task (tests first):**
1. New `src/parser/scan-token.ts`: given the source and Peggy's error offset, return what
   flex would hold: the state (`INITIAL`, `qstring`, `hstring`, `comment`), the token text
   at the error (a whole ID / number / quoted string / operator, per scan.l's rules), the
   line number as scan.l counts it (`line_num`, including the EOF line), and the string
   buffer for `String starting:`. Model it on `src/parser/number-scan.ts`.
2. In `parse`'s Peggy branch, `console.error` the aagerror line (with `Error: ` as
   `agerrorf` adds it) before throwing. `ParseError` stays exactly as today (AD-4).

**Write-set:** `src/parser/index.ts`, `src/parser/scan-token.ts`,
`src/parser/scan-token.test.ts`, `src/parser/parse-errors.test.ts`.
**Read-set:** the ranges above; `src/parser/number-scan.ts`; `~/git/graphviz/lib/cgraph/scan.l:1-150`
(token rules, `line_num` updates).

**Acceptance criteria:**
- *Given* each of the four probe inputs above, *when* parsed, *then* stderr equals native's
  text minus the file prefix, line for line.
- *Given* an error at a multi-character identifier (`digraph { a b c -> -> }` style), *then*
  the line says `near '<whole token>'` as native does.
- *Given* the existing parser tests, *then* every `ParseError.message`, `.code`, `.location`
  and `.expected` is unchanged.
- *Given* byte-identity, *then* 0 SVG diffs (valid input prints nothing new).

**Observability:** new stderr line on syntax errors. **Rollback:** reversible.
