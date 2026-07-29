<!-- SPDX-License-Identifier: EPL-2.0 -->

# T2x agent prompt template (orchestrator: instantiate per family)

Sections per parallelism.md; fill {family} fields from the batch-2 table
and the T1 appendix.

0. Prior observations: fixture recipe + coverage-probe hazard from
   ../README.md "Executor notes"; vacuous-test policy from decisions.md D1.
1. Context: dot-engine, faithful TS port of Graphviz; C source at
   ~/git/graphviz is the spec; tests are vitest, colocated
   `<module>.branch.test.ts`; strict no-behavior-change rule (test-only).
2. Task: raise {family} branch coverage using its Uncovered appendix
   (embedded below); mode {fixture|unit|mixed}. Unit tests must assert
   concrete output values against the C-documented behavior (read the
   `@see` C refs). Fixtures: author test/golden/inputs/{id}.dot (<50
   nodes; pin pos for iterative engines), generate refs for YOUR ids only,
   declare intended manifest entries in your final report (do NOT edit
   manifest.json). If a test exposes a real port bug: `.todo`-skip it with
   a one-line reason and report it prominently.
3. Write-set: {files} (+ test/golden/inputs/refs for your ids; helpers only
   if you are the designated owner).
4. Read-set: {family source files at the uncovered ranges}, matching C
   refs, one existing sibling test for conventions.
5. Architecture decisions: decisions.md D1/D4/D5 (locked).
6. Interface contract (report back, <=1.5k tokens): { familyBranchPctBefore,
   after, testsAdded, fixturesAdded: [{id, engine, toleranceClass,
   description}], todosForBugs: [], unreachableNotes: [] }.
7. Quality bar: `npx vitest run --coverage <your test files>` shows the
   family's branch pct >= 85 or unreachableNotes explain the residue;
   `npx tsc --noEmit` clean; full `npx vitest run` green.
8. Boundaries: NEVER edit src behavior, manifest.json, suite count pin, or
   existing refs. Ask-first: nothing (report instead). Always: concrete
   assertions.

## Acceptance criteria (all instances)
- Given the appendix, when tests run, then family branch coverage >= 85%
  or the residue is itemized as unreachable-by-design.
- Given any fixture, when the golden suite runs, then it passes and no
  existing ref changed.

## Observability: report per interface contract. ## Rollback: Reversible.
