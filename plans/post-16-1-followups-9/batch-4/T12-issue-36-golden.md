# T12: pin plantuml-ts issue 36 (AD-11)

**Context:** plantuml-ts issue 36 (a flat adjacent unlabelled edge with no port, endpoints 0.1–0.3 px off) no longer reproduces. Against
native 16.1.0, pinned 2.4.0 differs on the filed repro, on `zodela-36-sica712` (1 attribute) and on `cimare-47-deke334` (2), and the part-9 base
differs on none. Nothing pins it. The fixing commit is unknown and need not be found, because there is no defect left to diagnose.

**Task:**
1. Copy the filed repro and the two jar DOT files from `~/git/knowvah/plantuml-ts/test-results/dot-cache/{unknown/zodela-36-sica712,usecase/cimare-47-deke334}/svek-1.dot`
   to `test/golden/inputs/pt-issue-36{,-zodela,-cimare}.dot`, and generate `test/golden/refs/` with the oracle, as
   `test/golden/inputs/PROVENANCE.md` describes for the other `pt-issue-*` inputs.
2. Add `test/golden/pt-issue-36.test.ts` in the shape of `pt-issue-30.test.ts`, including a quote case for the filing's `pos` values.
3. Confirm the test fails on the 2.4.0 bundle in `~/git/knowvah/plantuml-ts/node_modules/@knowvah/dot-engine/dist/index.js`, by rendering its inputs
   through that bundle and comparing against the refs. Do not edit anything in plantuml-ts.

**Write-set:** `test/golden/pt-issue-36.test.ts`, `test/golden/inputs/pt-issue-36*.dot`, `test/golden/refs/pt-issue-36*`, `test/golden/inputs/PROVENANCE.md`.

**Acceptance criteria:**
- *Given* the head, *when* the test runs, *then* all three inputs match native.
- *Given* the 2.4.0 bundle, *when* its output is compared with the refs, *then* it differs, which proves the test can fail.

**Commit:** `test(T12): pin plantuml-ts issue 36 against native`.
**Observability:** N/A — no new observable operations. **Rollback:** Reversible.
