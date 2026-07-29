<!-- SPDX-License-Identifier: EPL-2.0 -->

# Mission: 2621 path-structure — the last unaccepted deterministic divergence

## Objective

Diagnose and close `tests/2621.dot` on the dot SVG track: verdict `diverged`,
maxΔ 18188.6, first diff `svg/g[1]/g[14]/path[1]/@d`, bucket `path-structure`
(edge path has a different command sequence or point count). Outcome per
`~/.claude/rules/diagnosis.md`: mechanism + `file:line` + causal chain +
ruled-out list, then EITHER a faithful fix (fresh 939-sweep, 0 regressions,
per-id verify) OR a documented acceptance (registry + prose) meeting the
injection-evidence bar. The ~10–16× per-op perf gap is OUT OF SCOPE
(stays quarantined; see [decisions.md](./decisions.md) D-scope).

## Branch

`fix/2621-path-structure` off `main`. Merge with a MERGE COMMIT (not squash)
if multi-commit history matters to the journal; otherwise squash is fine —
per-task commits are referenced only inside this plan directory.

## Critical operational constraints

- **NEVER iterate on full port renders.** 2621 is a ~3,670-node DAG; native
  takes ~240s and the port's historical position+splines ran >30min (may have
  improved — T1 calibrates). Max **3 full port renders** for the whole mission.
- Full port renders: background, `timeout -s KILL` (SIGTERM is ignored by the
  sync layout loop), NEVER in parallel with the oracle. After every render:
  `ps -eo pid,%cpu,command | awk '$2>10 && /node/'` and kill orphans.
- Oracle renders are not budget-capped (cheap by comparison); cache outputs in
  the scratchpad and reuse.

## Quality gates

- `npx tsc --noEmit` — clean
- `npm test` — 3396+ green
- Fresh 939-sweep: `GVBINDIR=/tmp/ghl ORACLE_TIMEOUT_MS=900000 npx tsx
  test/corpus/survey.ts` (background), then per-id verdict diff vs HEAD —
  exactly the intended 2621 flip, 0 regressions
- `git -C ~/git/graphviz status` — unchanged vs mission start (env-gated
  additions documented in the journal are the only exception)
- Lizard caps (500-line / CCN 10) on touched files

## Stop conditions

See [decisions.md](./decisions.md#stop-conditions). Highlights: render budget
exhausted; localization recurses >2 stages above routing; calibration render
>3h; acceptance without injection-grade evidence; 3 consecutive failed fix
attempts at one site; contradiction of a faithful-port rule.

## Batches

| Batch | Purpose | Status |
|-------|---------|--------|
| [batch-1](./batch-1/overview.md) — Localize | T1 baseline+target, T2 dump inventory, T3 staged localization, T4 isolated replay, T5 RCA (commit 1) | [x] |
| [batch-2](./batch-2/overview.md) — Resolve | T6a fix OR T6b acceptance (commit 2), T7 end gates + closeout (commit 3) | [ ] |

## Index

- [decisions.md](./decisions.md) — method decisions D1–D5, scope, stop/push-forward
- [batch-1/overview.md](./batch-1/overview.md) · [T1](./batch-1/T1-baseline-target.md) · [T2](./batch-1/T2-dump-inventory.md) · [T3](./batch-1/T3-staged-localization.md) · [T4](./batch-1/T4-isolated-replay.md) · [T5](./batch-1/T5-rca-artifact.md)
- [batch-2/overview.md](./batch-2/overview.md) · [T6a](./batch-2/T6a-faithful-fix.md) · [T6b](./batch-2/T6b-acceptance.md) · [T7](./batch-2/T7-end-gates.md)
- [diagrams/data-flow.md](./diagrams/data-flow.md) — route-stage pipeline + localization flow
- [diagrams/component-map.md](./diagrams/component-map.md) — suspect components
- [decision-journal.md](./decision-journal.md) — appended during execution

## Prior art the executor must know exists (read on demand)

- Memory `2621-perf-quarantine` — perf numbers, SIGKILL gotcha, mincross
  trace recipe, phase-split timers, esbuild+`node --prof` recipe
- Memory `path-structure-bucket-done` — the closed sibling bucket
  (LR_balance, ltail pre-clip, ortho tie-break, spacing)
- `.agent-notes/honda-samehead-shared-port.md` — the 4-stage GV_XDUMP vs
  __XDUMP staged-dump method this mission reuses
- Memories `c-harness-raw-intermediate-dump`, `instrument-c-before-quarantine`,
  `v8-prof-for-hangs`, `bezier-emit-size-not-length`,
  `edge-routing-order-done` (routeSplines MUTATES boxes — dump before/after)
