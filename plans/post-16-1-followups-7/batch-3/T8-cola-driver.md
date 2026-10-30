# T8: `stress_majorization_cola` and ipsep options (item 96b, AD-3, AD-4)

**Context:** this task depends on T1, T5 and T7.
- T1 landed the cola prologue inside the kD kernel (`colaScaleLayout`), and the 7
  unconstrained probes are byte-identical.
- T5 ported `quad_prog_vpsc.c`.
- T7 ported the subset and circuit models.

This task ports the driver and its option setup as new, unwired files. T10 switches
`init.ts:solveStress` (`src/layout/neato/init.ts:361-380`) to it.

**Task:**
1. `src/layout/neato/stress-cola.ts`: port
   `constrained_majorization_ipsep.c:stress_majorization_cola` (61–467). Keep its order
   and port every branch:
   - the `n == 1` / `initLayout` early return (100–111), with `initLayout`'s return
     ignored;
   - `maxi == 0` (122);
   - the model branch (128–150), with T7's models and the circuit-disconnected warning
     text verbatim;
   - the diameter, the prologue (166–191; copy `colaScaleLayout` here as is — T10 deletes the kD copy), the
     Laplacian, and the cluster `clap` extension (205–235);
   - `initCMajVPSC` (288);
   - the iteration loop with cola's own convergence test (363–367);
   - the `nsizeScale` loop with `generateNonoverlapConstraints` (377–403) and `noverlap`
     1 and 2 (`removeoverlaps`);
   - the write-back and `deleteCMajEnvVPSC`.

   Reuse the kD kernel's ops only where C calls the same function: `conjugate_gradient_mkernel`
   is one shared fused body (part-5 T15), and the square-add is unfused
   (`constrained_majorization_ipsep.c:313-316`). The hook forces splits; record each split
   in the doc comment.
2. `src/layout/neato/ipsep-opts.ts`: port `neatoinit.c:cluster_map` (198–245) and the
   option block (1121–1170): `edge_gap = levelsgap`, `diredgeconstraints` → 0/1/2 via
   `mapbool` / `strncasecmp(…, "hier", 4)`, `noverlap` from `am->mode` (`AM_IPSEP` → 1,
   `AM_VPSC` → 2), `gap` from `sepFactor` (2·PS2INCH), and `nsize` from
   `ND_width/height`. Use the port's existing `sepFactor` and overlap-mode parse; name
   them in the doc comment.
3. Tests first:
   - for each T0 `ipsep/` case, call the driver with options built by `ipsep-opts.ts` and
     compare the per-iteration stress with the native `-v` trace (`<case>.trace`) and the
     final coordinates with native xdot node positions;
   - unconstrained cases are bit-equal to T1's output;
   - one test per option field against hand-checked values from `neatoinit.c`.

**Write-set:** `src/layout/neato/stress-cola.ts`, `src/layout/neato/ipsep-opts.ts` (new),
tests beside each. `stress-kernel.ts` is read-only here (stop 10).
**Read-set:** `lib/neatogen/constrained_majorization_ipsep.c`, `neatoinit.c:190-250,1110-1185`,
`digcola.h`, `src/layout/neato/stress-kernel.ts`, `quad-prog-vpsc.ts`, `stress-models.ts`,
`init.ts:355-400`, `.agent-notes/post-16-1-followups-6.md` (cola).

**Interface output** (consumed by T10):

```ts
export function stressMajorizationCola(graph: VtxData[], n: number,
  dCoords: Float64Array[], nodes: Node[], o: { dim: number; model: number;
  maxi: number; opt: IpsepOptions }): number;           // C return value
export function ipsepOptions(mg: Graph, g: Graph, nodes: Node[]): IpsepOptions;
```

**Acceptance criteria:**
- *Given* each unconstrained probe, *when* the driver runs, *then* its coordinates are
  bit-equal to T1's kD-kernel result.
- *Given* each constrained probe, *then* the per-iteration stress follows native's trace
  and final positions are within 0.01. A probe that misses after ~2 h is parked with its
  artifact (push forward).
- *Given* `diredgeconstraints="Hierarchy"` / `"true"` / `"no"`, *then* `ipsepOptions`
  returns diredges 2 / 1 / 0.

**Commit:** `feat(T8): port stress_majorization_cola and ipsep options`.
**Observability:** N/A. **Rollback:** reversible.
