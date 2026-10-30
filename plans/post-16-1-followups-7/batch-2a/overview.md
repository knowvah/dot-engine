# Batch 2a: ipsep foundations

Runs as one wave with batch 2b, after T0, in parallel worktrees. Write-sets are disjoint
across both sub-batches.

- T1 lands item 95's staged patch and fixes the unconstrained baseline (AD-2).
- T5 and T7 add unreachable building blocks for the cola driver (T8). No corpus id can
  reach them; the exception is `vpsc-adjust.ts`, which serves `overlap=vpsc` on
  every engine (stop 8 covers it).

Every new file in `src/` must stay within the complexity hook (500 lines per file,
30 NLOC per function, CCN 10, 5 parameters). Long C functions are split into named
helpers in C order, each with `@see` and its C line range, and the split is recorded in
the doc comment. A helper that would need more than 5 parameters takes an options object.
Never add a path to `~/.claude/hooks/complexity-ignore`.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T1](T1-cola-prologue.md) | Item 95: cola prologue plus fused right-multiply (staged patch) | typescript-pro | `src/layout/neato/stress-kernel.ts`, `stress-kernel.fused.test.ts`; un-skip `ipsep-probes.test.ts` | T0 | [ ] |
| [T5](T5-quad-prog-vpsc.md) | Item 96a: port `quad_prog_vpsc.c` | typescript-pro (opus) | `src/layout/neato/quad-prog-vpsc.ts`, `quad-prog-vpsc-overlap.ts` (new), `vpsc-adjust.ts` (+ tests, `__fixtures__/quad-prog-vpsc.ts`) | T0 | [ ] |
| [T7](T7-stress-models.md) | Item 96a: subset and circuit distance models | typescript-pro (opus) | `src/layout/neato/lu.ts`, `matinv.ts`, `circuit.ts`, `stress-models.ts` (new) (+ tests) | T0 | [ ] |
