# T6: `ptToLine2` fusion (item 29a, AD-6)

**Context:** `lib/common/geom.c:181 ptToLine2` (squared distance from a point to a line,
used by `emit.c:748-749` Bezier flatness and by `anchor`/spline code). The port computes it
plain in `src/gvc/anchor.ts:234` (and its uses at `:433-434`) and
`src/common/splines-geom.ts:46-53`. clang on arm64 contracts `a*b + c` to `fmadd` by default
(`-ffp-contract=on`), so the native result can differ in the last bit.

**Task:** read `ptToLine2` in T0's `disasm/libcommon.txt` (or the lib that holds `geom.c`).
Write down which products are fused and in what order. If fused, port that exact
expression with `fma` from `src/common/fma.ts` in both copies, or make one copy call the other if
both mirror `geom.c:ptToLine2`. If not fused, change nothing and journal the evidence.

**Write-set:** `src/gvc/anchor.ts`, `src/common/splines-geom.ts` (+ tests).
**Read-set:** `geom.c:175-200`, `emit.c:740-760`, the disassembly, the two port sites.

**Acceptance criteria:**
- *Given* the disassembly, *when* `ptToLine2` shows `fmadd`/`fmsub`, *then* the port uses
  the same fused form, and a unit test pins a point where fused and plain differ.
- *Given* byte-identity over the dot and neato corpus ids, *then* identical or every
  change moves toward native (else revert, stop 5).
- *Given* the speed set, *then* p50 ≤ 1.05× T0.

**Observability:** N/A. **Rollback:** reversible.
