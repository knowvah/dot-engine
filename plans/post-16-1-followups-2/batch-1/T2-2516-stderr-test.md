# T2: `test(T2)`: pin 2516's html syntax error stderr (item 16)

**Context:** item 16 was logged during the previous mission's T6, before T6 added the
print site (`src/common/htmltable-pos.ts:553`). Planning found that the port now prints
native's three lines for `~/git/graphviz/tests/2516.dot`:

```
Error: Syntax error: non-space string used before <TABLE> in line 1 
... yada yada <table> ...
in label of node aneggtable
```

(note the trailing space after `line 1`). No test pins this.

**Task:** add a test to `htmltable-label-errors.test.ts` that renders a minimal 2516-style
label and asserts those console lines, in order. If it fails, enter diagnosis mode: the
item is then open, and the fix's write-set (`htmltable-parse.ts`, `htmltable-pos.ts`) needs
a journaled extension (stop condition 1).

**Write-set:** `src/common/htmltable-label-errors.test.ts`.
**Read-set:** `src/common/htmltable-parse.ts:85-110,507-528`; the existing tests in that file.

**Acceptance criteria:**
- *Given* `aneggtable [label=<yada yada <table>…</table>>]`, *when* rendered, *then* the
  three lines above are printed exactly, in order, and the label is empty.
- *Given* native 16.1.0 on the same input, *then* its stderr equals the test's expectation
  (checked once; recorded in the journal).

**Observability:** N/A. **Rollback:** reversible.
