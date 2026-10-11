# Batch 2 — faithful `findMaxDev` + flat-adjacent aux endpoints

Parallel after Batch 1; disjoint write-sets. T5 consumes T1's contraction map;
T6 edits files T3 owned, so it starts only after T3 is merged. Both spawn with
`isolation: "worktree"` (first step: `git switch -c <id> fix/plantuml-tracker-issues-2`);
the orchestrator lands them one at a time, each followed by gates + a fresh sweep.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T5 | Faithful `findMaxDev`: `libmHypot` + strict `>` + contraction mirroring (23/32/33/35, A3) | typescript-pro (model: opus) | `src/pathplan/route.ts`, `src/pathplan/route.branch.test.ts`, `test/golden/pt-issue-{23,32,33,35}.test.ts` | T1 | [ ] |
| T6 | Issue 30: port-less edge in flat-adjacent aux layout | typescript-pro | `src/layout/dot/splines-flat.ts`, `src/layout/dot/position-aux.ts`, `src/layout/dot/edge-route.ts` (+ their tests), `test/golden/pt-issue-30.test.ts`, `.agent-notes/pt30-flat-adj-aux.md` | T3 | [ ] |

Specs: [T5](T5-findmaxdev-faithful.md) · [T6](T6-flat-adj-aux.md)

T5 is the mission's highest-risk change (every routed edge). If its sweep shows
any conformant→worse id, revert and STOP (README stop 4) — no strict-only fallback.
