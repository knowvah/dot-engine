<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — gates + closeout

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T4 | count identity, coverage, fresh sweep, closeout | orchestrator | plans/dot-engine-scrub/** (journal, README checkboxes), test/corpus/parity-rules.json (iff sweep refreshes) | T2, T3 | [x] |

Run by the orchestrator directly (gates + docs, no code).
