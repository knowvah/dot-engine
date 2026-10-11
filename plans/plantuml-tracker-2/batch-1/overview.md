# Batch 1 — contraction map + independent fixes

All four run in parallel after T0; write-sets are disjoint. Each fix task adds
its own `test/golden/pt-issue-NN.test.ts` (no shared manifest edits). Subagents
report observations in their hand-back; the orchestrator journals and commits.
Survey gate: T3 and T4 (they touch `src/layout` / `src/ortho`); run sweeps one at
a time — never while another task is editing `src/`.

| ID | Description | Agent | Writes | Depends On | Done |
|---|---|---|---|---|---|
| T1 | Map clang FMA contractions in `route.c`/`solvers.c` (research only) | cpp-pro | `.agent-notes/pathplan-fma-contraction-map.md` | T0 | [ ] |
| T2 | Issue 27: reject `node/edge/graph { }` | typescript-pro | `src/parser/dot.pegjs`, `src/parser/parser.test.ts`, `test/golden/pt-issue-27.test.ts` | T0 | [ ] |
| T3 | Issue 28: flat edge honours `splines=line/polyline` | typescript-pro | `src/layout/dot/splines-flat.ts`, `splines-flat-multi.ts`, `edge-route.ts` (+ their tests), `test/golden/pt-issue-28.test.ts` | T0 | [ ] |
| T4 | Issue 29: ortho self-loop | typescript-pro | `src/ortho/index.ts`, `src/ortho/sgraph.ts` (+ their tests), `test/golden/pt-issue-29.test.ts`, `.agent-notes/pt29-ortho-loop.md` | T0 | [ ] |

Specs: [T1](T1-contraction-map.md) · [T2](T2-parser-brace-block.md) ·
[T3](T3-flat-edge-et.md) · [T4](T4-ortho-self-loop.md)

Isolation: spawn T2, T3, T4 with `isolation: "worktree"` so their `src/` edits
never overlap a running sweep. Sweep serialization: the survey reads live `src/`,
so the orchestrator lands them one at a time on the mission branch — merge T2 →
gates; merge T3 → gates + fresh sweep; merge T4 → gates + fresh sweep. T1 needs no
worktree (writes only `.agent-notes/` + scratchpad).
Worktrees branch from `origin/main` by default (`worktree.baseRef: fresh`), which
lacks T0's refs and the mission branch: each worktree agent's first step is
`git switch -c <task-id> fix/plantuml-tracker-issues-2` (the branch is local; it
needs no push).
