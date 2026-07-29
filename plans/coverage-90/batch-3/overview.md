<!-- SPDX-License-Identifier: EPL-2.0 -->

# Batch 3 — next families (6 parallel sonnet agents)

Same rules as batch-2 (template: T3-agent-template.md). Helpers owner: T3c.
T1's rebalance step may fold families whose gap shrank.

| ID | Family | Mode | Done |
|----|--------|------|------|
| T3a | ortho/ortho-parallel.ts + ortho-route.ts | mixed | [x] |
| T3b | layout/neato/overlap-prism.ts + set-aspect.ts + init.ts | mixed | [x] |
| T3c | xdot/parse.ts + xdot/misc.ts | unit; OWNS test/helpers/ | [x] |
| T3d | common/record.ts + common/compass-port.ts | unit | [x] |
| T3e | layout/dot/straight-edges.ts + splines-flat.ts + position-bbox.ts | mixed | [x] |
| T3f | gvc/anchor.ts + layout/pack/index.ts | mixed | [x] |
