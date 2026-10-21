# T12: `fix(T12)`: match the other de Casteljau copies to their C (item 20c)

**Context:**
- T10's inventory (`.agent-notes/bezier-inventory.md`) rows whose C counterpart is not a
  call to `utils.c:Bezier`: their C inlines its own arithmetic, so each follows that
  function's disassembly (fused or not, operand order), not T11's result automatically.
- Expected rows: `src/common/taper.ts:68`, `src/common/splines-routespl.ts:196`,
  `src/common/arrows-shapes-poly.ts:199`, `src/common/splines-geom.ts:37`,
  `src/render/svg-edge-split.ts:16-45`.
- A row whose C does call `Bezier` after all (T10 found it) uses T11's `bezier()`.

**Task (tests first):** per row, make the port's arithmetic match the disassembly; where a
site is an exact `Bezier` mirror, call `bezier()`. Per-site unit test against values
dumped from the native function (scratch C harness). Byte-identity on all eight engines;
the speed gate as in T11.

**Write-set:** the port files in T10's non-`Bezier` rows and their colocated tests. A row
outside the expected list needs a journaled write-set extension.
**Read-set:** `.agent-notes/bezier-inventory.md`; each row's C function; `src/common/bezier.ts`.

**Acceptance criteria:**
- *Given* each row, *when* the native harness and the port evaluate the same inputs,
  *then* the results are bit-identical.
- *Given* byte-identity, *then* every SVG change moves toward native per id, with no
  verdict regression.
- *Given* the speed gate, *then* p50 ≤ 1.05× of T0 on both subsets (or deferred, journaled).

**Observability:** N/A. **Rollback:** reversible.
