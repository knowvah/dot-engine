# T5: port `quad_prog_vpsc.c` (item 96a, AD-3)

**Context:** constrained ipsep solves each axis with `constrained_majorization_vpsc` on a
`CMajEnvVPSC` that `initCMajVPSC` builds. Today none of it is ported. The pieces that
exist are:
- the VPSC solver under `src/vpsc/` (`newVariable`, `newConstraint`, `newIncVPSC`,
  `satisfyVPSC`, `solveVPSC`, `genXConstraints`, `genYConstraints`; see
  `src/vpsc/index.ts`);
- partial private copies of `generateNonoverlapConstraints` and `removeoverlaps` inside
  `src/layout/neato/vpsc-adjust.ts:30-70`, which serve `adjust.c:vpscAdjust`
  (`overlap=vpsc`);
- `computeHierarchy` (`src/layout/neato/compute-hierarchy.ts`) for DiG-CoLa levels.

C has no unit tests for this file.

**Task:**
1. Port into `src/layout/neato/quad-prog-vpsc.ts`. Each item keeps its C boundary and an
   `@see`.
   - Types:
     - `CMajEnvVPSC` (`quad_prog_vpsc.h:37-52`);
     - `IpsepOptions` (`digcola.h:30-41`);
     - `ClusterData` (`defs.h:24-32`);
     - `DigColaLevel`.
   - Functions:
     - `constrainedMajorizationVpsc` (54–182);
     - `initCMajVPSC` (196–324);
     - `deleteCMajEnvVPSC` (326–346).
2. Port into `src/layout/neato/quad-prog-vpsc-overlap.ts`:
   - `generateNonoverlapConstraints` (359–558), including the cluster branch and the
     `transitiveClosure` flag;
   - `removeoverlaps` (564–580);
   - `assign_digcola_levels` (584–616);
   - `get_num_digcola_constraints` (619–628).

   The C file is split across two TS files only because of the 500-line limit.
3. Float discipline: C arrays are `float`, so use `Float32Array` and `Math.fround` where C
   assigns to `float`. Use the fused helpers only where the linked dylib fuses (check
   `neato_layout.dis` in part-6 `$BASE`, or disassemble `_constrained_majorization_vpsc`
   per `.agent-notes/post-16-1-followups-3.md`), and journal the evidence.
4. Replace `vpsc-adjust.ts`'s partial copies with calls to the new `removeoverlaps`, so
   each C function is ported once. `overlap=vpsc` corpus output must stay byte-identical
   (bytediff). A difference is stop 8: diagnose which copy diverges from C.
5. Tests first. Build a native harness the way part-4 T22 did
   (`src/layout/neato/__fixtures__/hier-majorization.ts` header: clang `-O3 -flto=thin
   -arch arm64`, linking the oracle's own `lib/neatogen` and `lib/vpsc` with
   `-DIPSEPCOLA -DDIGCOLA`). Dump these into `src/layout/neato/__fixtures__/quad-prog-vpsc.ts`:
   - `initCMajVPSC` output: constraint count `m` / `gm`, `nldv` / `ndv`;
   - `constrainedMajorizationVpsc` coordinates after 1 and N iterations;
   - `generateNonoverlapConstraints` constraint lists;
   - `removeoverlaps` coordinates.

   Cover diredges 0/1/2, noverlap 1/2 and one cluster case.

**Write-set:** `src/layout/neato/quad-prog-vpsc.ts`, `src/layout/neato/quad-prog-vpsc-overlap.ts`
(new), `src/layout/neato/vpsc-adjust.ts`, tests beside each,
`src/layout/neato/__fixtures__/quad-prog-vpsc.ts` (new); the harness source goes in the
scratchpad.
**Read-set:** `lib/neatogen/quad_prog_vpsc.c`, `quad_prog_vpsc.h`, `digcola.h:30-44`,
`defs.h:20-35`, `lib/vpsc/csolve_VPSC.cpp`, `src/vpsc/index.ts`,
`src/layout/neato/vpsc-adjust.ts`, `src/layout/neato/compute-hierarchy.ts:1-80`.

**Interface output** (consumed by T8):

```ts
export interface ClusterData { nvars: number; nclusters: number;
  clustersizes: Int32Array; clusters: Int32Array[]; ntoplevel: number;
  toplevel: Int32Array; bb: Box[] }               // defs.h:24-32
export interface IpsepOptions { diredges: 0 | 1 | 2; edgeGap: number;
  noverlap: 0 | 1 | 2; gap: Point; nsize: Point[]; clusters: ClusterData } // digcola.h
export function initCMajVPSC(n: number, packedMat: Float32Array | null,
  graph: VtxData[] | null, opt: IpsepOptions, diredges: 0 | 1 | 2): CMajEnvVPSC;
export function constrainedMajorizationVpsc(e: CMajEnvVPSC, b: Float32Array,
  place: Float32Array, maxIterations: number): number;
export function deleteCMajEnvVPSC(e: CMajEnvVPSC): void;
export function generateNonoverlapConstraints(e: CMajEnvVPSC, nsizeScale: number,
  coords: Float32Array[], k: 0 | 1, transitiveClosure: boolean, opt: IpsepOptions): void;
export function removeoverlaps(n: number, coords: Float32Array[], opt: IpsepOptions): void;
```

Field names follow the C. Adjust the types to the C where this sketch is wrong, and
journal the change.

**Acceptance criteria:**
- *Given* each harness case, *when* the port runs the same call, *then* the constraint
  counts are equal and the coordinates are bit-equal as float32.
- *Given* the corpus ids that use `overlap=vpsc`, *when* bytediff runs, *then* output is
  identical.
- *Given* the test file, *then* coverage of both new files is at least 90% for lines,
  branches and functions.

**Commit:** `feat(T5): port quad_prog_vpsc constrained majorization`.
**Observability:** N/A. **Rollback:** reversible.
