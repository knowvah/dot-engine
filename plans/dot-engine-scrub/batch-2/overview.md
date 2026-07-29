<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 2 — apply the scrub (two disjoint tree sets, parallel)

| ID | Description | Agent | Writes | Depends On | Done |
|----|-------------|-------|--------|------------|------|
| T2 | scrub plans/ + docs/ + CLAUDE.md | typescript-pro | plans/** (except dot-engine-scrub/ and graphviz-ts-port dir name), docs/**, CLAUDE.md | T1 | [ ] |
| T3 | scrub src/ + test/ comments + golden banners | typescript-pro | src/**, test/** | T1 | [ ] |

Write-sets are disjoint; launch both in one response. Both consume T1's
pinned per-tree counts from tools/dry-run-report.md.
