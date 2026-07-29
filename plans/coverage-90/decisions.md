<!-- SPDX-License-Identifier: EPL-2.0 -->

# Method decisions (approved 2026-07-28)

## D1: Treatment split
Pipeline/layout code -> golden fixtures (oracle-referenced conformance).
Branch-heavy pure modules -> colocated unit tests with CONCRETE-VALUE
assertions (testing.md); a test that could not fail is a defect
(vacuous-coverage policy). Task specs name the expected mode.

## D2: Parallel model
Batches of 4-6 SONNET test-writer agents, one module family each, disjoint
write-sets; helpers ownership pre-assigned per batch. Prompts embed the
family's uncovered-line/branch digest (from T1) + the C `@see` refs.

## D3: Measurement cadence
Agents verify with module-filtered `npx vitest run --coverage <file>`;
orchestrator full-runs `npm run coverage` at each batch gate and journals.

## D4: Fixture/oracle policy
Today's proven recipe; agents generate refs for their OWN fixture ids only;
zero churn on existing refs; manifest merge is orchestrator-only.

## D5: Dead code
0%/unreferenced candidates get precise import-path grep first; delete only
with evidence; a file matching a C module per the port catalog that is
unreferenced may be UNWIRED, not dead — stop condition, not deletion.

## D6: Ratchet
`vitest.config.ts` coverage thresholds global 90/90/90/90 as the FINAL task,
only if each actual >= 90.3 (headroom); else floor(actual) + journaled
follow-up. No per-file thresholds this mission.

## Stop conditions
1. A single port bug blocks 3+ modules' targets, or implies a corpus
   conformance regression.
2. Any fix would require `src/` BEHAVIOR edits (deletions of proven-dead
   code excepted).
3. Two consecutive batch-gate failures on the same check.
4. Ambiguous dead-code candidate (unreferenced but catalog-expected — the
   unwired/engine-init class).
5. Any EXISTING golden ref would need regeneration.
6. Post-batch-4 metric still < 90 where the remainder is judged
   unreachable-by-design at scale (exclusion-vs-ratchet policy call).
7. Suite wall-clock > 60s and the fix would sacrifice coverage.
8. Standing: write-set escape; 3 same-site consecutive fix attempts;
   contradiction of D1-D6.

## Push-forward conditions
- Fixture geometry/attr iteration; dropping non-conformant variants
  (journaled, no-silent-caps).
- Single-branch "unreachable-by-design" notes in test files (one line).
- Rebalancing families between agents mid-batch (write-sets stay disjoint).
- Helper extraction by the batch's designated owner.
- `.todo`-skip of a bug-finding test with journal reference (single-module).
- Coverage/suite re-runs at will.
