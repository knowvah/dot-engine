# T6: `fix(T6)`: HTML lexer error paths for an unknown entity and a mismatched tag

**Context:**
- C `lib/common/htmllex.c:1095` reports expat parse errors as
  `agerrorf("%s in line %lu \n", XML_ErrorString(code), htmllineno)` and then calls
  `error_context`. Relevant expat strings include `undefined entity` and `mismatched
  tag`.
- The port's `src/common/htmltable-lex.ts:27` (`lexerror`) does not reproduce these
  paths. Decision-journal T4 (2026-10-12) lists them as a pre-existing gap.

**Task:**
- Make an unknown entity and a mismatched tag produce C's message, line number and
  `error_context` output.
- The label must then fail the way C's does: C falls back to a non-HTML label. Confirm
  this against native on a repro before porting.
- Take expat's exact strings from expat's `xmlparse.c` `XML_ErrorString` table. Do not
  guess them.
- Write tests first.

**Write-set:** `src/common/htmltable-lex.ts`, `src/common/htmltable-parse.ts`, their
`*.test.ts`. **Read-set:** `~/git/graphviz/lib/common/htmllex.c:40-75, 1060-1110`;
`src/common/htmltable-lex.ts`; `src/common/html-entities.ts`.

**Acceptance criteria:**
- *Given* `label=<<b>&bogus;</b>>`, *when* rendered, *then* stderr equals native's (message,
  line, context) and the SVG equals native's fallback.
- *Given* `label=<<b>x</i>>`, *then* the same holds for `mismatched tag`.
- *Given* the batch-2 shared criteria, *then* SVG is byte-identical on the corpus.

**Observability:** new stderr lines only. **Rollback:** reversible.
