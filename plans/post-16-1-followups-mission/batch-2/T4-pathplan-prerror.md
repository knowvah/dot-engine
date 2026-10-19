# T4: `fix(T4)`: print C's pathplan `prerror` messages

**Context:**
- C `lib/pathplan/shortest.c` calls `prerror` at :182 ("source point not in any
  triangle"), :193 ("destination point not in any triangle"), :203 ("cannot find
  triangle path") and :333 ("triangulation failed").
- The port prints only the last one (`src/pathplan/shortest.ts:248`), and silently
  returns at :41.
- Native prints these, for example on the tracker repros `31-*`.

**Task:**
- Port the remaining `prerror` sites as `console.warn('<msg>')`: text only, no
  `lib/pathplan/<file>:<line>:` prefix (AD-5).
- Make each port site match C's control flow, so the message prints exactly where C
  prints it. Check `shortest.ts:41` against the C line it mirrors.
- Write tests first. Each test drives one branch and asserts the message and the return
  value.

**Write-set:** `src/pathplan/shortest.ts`, `src/pathplan/shortest*.test.ts` (new or
existing). **Read-set:** `~/git/graphviz/lib/pathplan/shortest.c:170-340`;
`src/pathplan/shortest.ts`; `decisions.md#ad-5`.

**Acceptance criteria:**
- *Given* a polygon where the source point lies outside every triangle, *when*
  `Pshortestpath` runs, *then* `source point not in any triangle` is warned and it fails
  as C does.
- *Given* the destination outside every triangle, *then* `destination point not in any
  triangle` is warned.
- *Given* the batch-2 shared criteria, *then* SVG is byte-identical and the per-id counts
  match native.

**Observability:** new stderr lines only. **Rollback:** reversible.
