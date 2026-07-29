<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 4 — sweep, ratchet, closeout (serial)

| ID | Description | Done |
|----|-------------|------|
| T4 | Long-tail sweep: re-rank after batch-3 gate; if >2pp of any metric remains, one more parallel mini-batch over the remaining mass (template rules); else close inline | [ ] |
| T5 | Threshold ratchet: vitest.config.ts coverage thresholds per D6 (90 global with >=0.3pp headroom, else floor(actual) + journaled follow-up) | [ ] |
| T6 | Closeout: journal summary (four globals, tests added, bugs found), README checkboxes, .agent-notes/memory updates, surface all todosForBugs findings | [ ] |

T5 acceptance: `npm run coverage` passes WITH thresholds enforced; a
deliberate one-line test deletion locally trips the threshold (then restore)
— proving the gate bites.
