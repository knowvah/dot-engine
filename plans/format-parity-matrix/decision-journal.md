<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission execution journal

Per-batch execution decisions for this mission. **Corpus fixes and accepted
divergences go to the repo-root `plans/decision-journal.md`** (project
convention) — this file is only for mission-flow decisions (batch order changes,
scope calls, blocked-and-waiting notes).

| Date | Batch/Task | Decision / Note | Gate result |
|------|-----------|-----------------|-------------|
| 2026-07-24 | B1 plan | 4 parallel typescript-pro agents (T1/T2/T3/T4), disjoint write-sets, no deps. Agents do not commit; orchestrator commits per-task after batch gates (typecheck+test). | pass |
| 2026-07-24 | B1/T1 | Comparator compares edge `pointCount` structurally in iterative mode (not a coord per AD-4 reading). WATCH: if plain triage floods neato/fdp/sfdp with pointCount diffs, relax to deterministic-only. Ports + malformed-line-skip also per agent judgment. | typecheck+3270 tests green |
| 2026-07-24 | B1/T3+T4 | `render-one-json.ts`/`render-one-map.ts` already engine-parameterized since their initial commits — no edit needed (write-set unused, logged not silent). json/map walkers gained JSONL resume (didn't exist before; spec's "keep current dot JSONL path" was vacuous). dot oracle invocation kept byte-identical; engine-keyed oracle caches. map engine-mode reuses dot-scoped accepted-divergences list for all engines pending T8. | typecheck+3270 tests green |
