# T13: GTS enclosing-triangle constants (item 51, AD-4)

**Context:** `src/layout/neato/cdt-surface.ts:647` uses `SQRT3 = 1.73205080756887729` and
`Math.hypot` (`:672`); GTS (`src/triangle.c`, `gts_triangle_enclosing`) uses
`#define SQRT3 1.73205080757` and `sqrt(dx*dx+dy*dy)`. The oracle links homebrew
`/opt/homebrew/opt/gts/lib/libgts-0.7.5.dylib`.

**Task:** port GTS's constant and expression exactly; check fusion in that dylib's
disassembly (`objdump -d --no-show-raw-insn`, `_gts_triangle_enclosing`) and port what it
shows. Get the GTS source matching 0.7.6/0.7.5 for the line reference (homebrew formula
source tarball, read-only, scratchpad).

**Write-set:** `src/layout/neato/cdt-surface.ts` (+ test).
**Read-set:** `cdt-surface.ts:630-690`; GTS `triangle.c` `gts_triangle_enclosing`.

**Acceptance criteria:**
- *Given* a point set, *when* the enclosing triangle is built, *then* its vertices equal a
  C harness linked against the oracle's libgts bit for bit.
- *Given* the `splines=true` neato/sfdp ids (part 3 T8's 30-id set), *then* bytediff
  identical or every change toward native.

**Observability:** N/A. **Rollback:** reversible.
