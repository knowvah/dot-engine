# T5: `fix(T5)` or journal only: `makeGraphData` weight and direction branches (item 18)

Diagnosis-led (AD-3 budget ~2 h). Agent: debugger (opus).

**Context:**
- C `lib/neatogen/neatoinit.c:747-840` `makeGraphData`:
  - `haveWt = E_weight != 0` (not for `MODEL_SUBSET`) allocates `eweights` and accumulates
    `ED_factor` (`+=` on a repeated neighbour, :810).
  - `haveDir = mode == MODE_HIER || mode == MODE_IPSEP` allocates `ewgts` and, when there is
    no `len`, stores `1.0` per edge (:823); with `DIGCOLA` it also fills `edists`
    (`dir=none` → 0, else ±1).
- Port `src/layout/neato/init.ts:357-395` `makeGraphDataC(g, nodeList, haveLen)` handles
  `haveLen` only.
- Planning found no reader of `eweights` in `lib/neatogen` other than `neatoinit.c`
  (`grep -rn eweights ~/git/graphviz/lib/neatogen`), so `haveWt` may be output-neutral.
  `MODE_HIER` is unsupported in the port (`start.ts:151`); `MODE_IPSEP` is supported when it
  has no constraints (`start.ts:153`).

**Task:**
1. `haveWt`: confirm or refute "no reader" across `lib/` (sparse graph consumers, stress,
   SGD, KK). Port if any path the port supports reads it; otherwise document.
2. `haveDir` under `mode=ipsep`: determine what consumes `ewgts`/`edists` (the ipsep
   solver; `computeWeightedApspPacked` vs `computeApspPacked` choice at `init.ts:337`).
   Build a native dump of the distance matrix (or final positions) for a small ipsep graph
   with and without `len`, and compare with the port. Port the branch if output differs.
3. Tests first for whatever is ported.

**Write-set:** `src/layout/neato/init.ts`, `src/layout/neato/init*.test.ts`.
**Read-set:** the ranges above; `src/layout/neato/start.ts:105-165`.

**Acceptance criteria:**
- *Given* the `haveWt` analysis, *then* the journal row names every C reader (or none) with
  grep evidence, and the port matches C for every reachable one.
- *Given* `mode=ipsep` on a 6-node graph with a repeated edge, *when* the port and native
  render, *then* positions match within 0.5 pt (iterative-engine tolerance) or the
  divergence is diagnosed.
- *Given* the neato walk on the task head, *then* no pass→worse.

**Observability:** N/A. **Rollback:** reversible.
