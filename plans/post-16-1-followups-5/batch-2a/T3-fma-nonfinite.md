# T3: `fma` non-finite operands (AD-15, item 84)

**Context:** `src/common/fma.ts:27` (Dekker split) returns NaN when an operand is infinite;
arm64 `fmadd` returns inf. `src/layout/neato/matrix-ops.ts:24` wraps it with a finiteness
guard; the other nine callers (`edge-route-clip.ts`, `gts-triangle.ts`, `multispline.ts`,
`splines.ts`, circo `position*.ts`, sfdp `spring-*.ts`) are unguarded.

**Task:** (1) `fma` returns `a * b + c` when `a * b` or `c` is non-finite (the sum is exact
then), before the split. (2) Remove `matrix-ops.ts`'s local wrapper; its callers import
`fma` from `common/fma.js`. (3) Property test: for 10⁵ random finite triples the new and
old implementations agree bit for bit; infinite and NaN cases match IEEE `fmadd`.

**Write-set:** `src/common/fma.ts`, `src/common/fma.test.ts`, `src/layout/neato/matrix-ops.ts`.
**Read-set:** `.agent-notes/post-16-1-followups-4.md` ("`fma.ts` returns NaN" observation).

**Interface output:** unchanged signature `fma(a, b, c)`; `matrix-ops.ts` no longer exports
`fma` (consumed by T15, which imports from `common/fma.js`).

**Acceptance criteria:**
- *Given* `fma(Infinity, 2, 1)`, *then* `Infinity`; *given* `fma(1, 2, Infinity)`, *then*
  `Infinity`; *given* `fma(Infinity, 0, 1)`, *then* `NaN`.
- *Given* finite operands, *then* bit-identical to the previous implementation.
- *Given* the ten callers' corpus ids (neato, fdp, sfdp, circo, dot), *then* bytediff
  identical.

**Observability:** N/A. **Rollback:** reversible.
