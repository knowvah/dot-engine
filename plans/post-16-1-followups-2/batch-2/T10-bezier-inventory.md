# T10: Bezier inventory (item 20a; read-only, no commit)

Agent: debugger (opus). Hand-back only; the orchestrator writes
`.agent-notes/bezier-inventory.md` from it.

**Context:**
- Previous mission T13 replaced the edge-midpoint path's de Casteljau with
  `fma(a, 1 - t, t * b)` (`src/common/spline-midpoint.ts:34-52`) after libgvc 16.1
  disassembly showed `_Bezier` compiles to `fmul.2d` + `fmla.2d`, and `dist2` to `fmadd`.
  Software `fma` is `src/common/fma.ts`.
- Other de Casteljau copies (grep `de Casteljau|utils.c:Bezier` in `src/`):
  `src/gvc/anchor.ts:447`, `src/layout/dot/compound-geom.ts:71`,
  `src/layout/dot/edge-route-clip.ts:6-50,171`, `src/layout/dot/splines-label.ts:129-140`,
  `src/layout/dot/compound-clip.ts:47`, `src/common/taper.ts:68`,
  `src/render/svg-edge-split.ts:16-45`, `src/common/splines-routespl.ts:196`,
  `src/common/arrows-shapes-poly.ts:199`, `src/common/splines-geom.ts:37`.

**Task:** for each copy:
1. Name the C function it mirrors (`file:line`), and whether that C calls `utils.c:Bezier`
   or inlines its own arithmetic.
2. For calls to `Bezier`: fused (the T13 result applies). For inlined arithmetic: read
   the 16.1 disassembly of that function in the oracle build
   (`~/git/graphviz/build/lib/...` dylibs; `otool -tV` / `llvm-objdump -d`) and state
   whether each `(1-t)*a + t*b` (or equivalent) is fused, and in which operand order.
3. Note whether the port copy computes the Left/Right halves (C's `Left`/`Right` arrays).

**Write-set:** none (scratchpad only). **Read-set:** the files above; the corresponding C.

**Interface output (consumed by T11, T12):** a table, one row per copy:
`| port file:fn | C file:fn | calls Bezier? | fused (yes/no/n.a.) + operand order | needs L/R | evidence |`.

**Acceptance criteria:**
- *Given* the table, *then* every copy has a row and every "no"/"inlined" row carries
  disassembly evidence (function symbol, instruction lines).
- *Given* any copy whose C counterpart cannot be identified, *then* it is listed with what
  was searched (AD-3 budget applies).

**Observability:** N/A. **Rollback:** N/A (no change).
