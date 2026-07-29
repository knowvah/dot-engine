<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 1 — scrub tooling

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T1 | scrub.mjs + dry-run report (pins expected counts) | typescript-pro | plans/dot-engine-scrub/tools/scrub.mjs, plans/dot-engine-scrub/tools/dry-run-report.md | — | [x] |

T1's report is the interface contract consumed by T2/T3 (per-tree replace
counts) and T4 (expected remaining occurrences).
