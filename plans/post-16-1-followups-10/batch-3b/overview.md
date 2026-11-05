# Batch 3b: later layouts on dot (116, 118, 119, 120)

One agent, in order, one commit per task, because all four share `src/gvc/rerender.test.ts` and the no-free fixtures, and T9 and T11 share `dot/init.ts`. Runs after T0, parallel with
batches 2 and 3a. Every first render stays byte-identical (AD-8, stop 8): these tasks reach only a later layout.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| [T9](T9-list-guard.md) | 116: `alloc_elist` is unconditional | typescript-pro (opus) | `src/layout/dot/init.ts`, `init.branch.test.ts` | T0 | [ ] |
| [T10](T10-abom-shift.md) | 118: `abomShift` resets per layout | same agent | `src/layout/dot/{index,flat}.ts`, `src/gvc/rerender.test.ts`, fixtures | T9 | [ ] |
| [T11](T11-fitter-weights.md) | 119: fitter fallback appends; aux-edge weights | same agent | `src/layout/dot/{edge-route-helpers,init}.ts`, tests | T10 | [ ] |
| [T12](T12-flat-arrows.md) | 120: no-free arrows on the flat aux route | same agent | `src/layout/dot/splines-flat.ts`, tests | T11 | [ ] |
