<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Baseline renders, target identification, perf calibration

## Context

dot-engine, faithful TS port of Graphviz; oracle = native
`~/git/graphviz/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl`. Target:
`tests/2621.dot` (~3,670-node DAG, rankdir=BT, newrank=true, clusters,
721KB). Recorded divergence: `svg/g[1]/g[14]/path[1]/@d`, maxΔ 18188.6,
path-structure. Positional XPath is UNRELIABLE for edge identity
(honda RCA lesson: positional mapping once fingered the wrong edge) —
resolve to the edge's `<title>` (tail->head names).

## Task

1. Oracle render: `-Tsvg` AND `-Txdot` once each, cached to scratchpad
   (`timeout -s KILL 900`, sequential).
2. Port render: `-Tsvg` via `npx tsx test/corpus/render-one.ts
   ~/git/graphviz/tests/2621.dot dot` — background, `timeout -s KILL 10800`,
   `time`d. Record wall-clock (calibrates decisions.md D5; the >30min
   quarantine figure may be stale). Then one `-Txdot` port render (or derive
   from the same run if the harness allows only one format per run — two
   renders count as ONE budget unit only if unavoidable; prefer rendering
   xdot only and diffing xdot, since SVG paths derive from xdot ops).
3. Identify ALL diverging edges by title, not position. Build the full per-op
   delta table: command sequences, point counts, coordinate deltas, both
   sides.
4. Orphan check after every render: `ps -eo pid,%cpu,command | awk '$2>10 && /node/'`.

## Write-set

Scratchpad only (`$SCRATCHPAD/2621/`). No tracked files.

## Read-set

- `test/corpus/parity.json` (2621 record)
- Memory `2621-perf-quarantine` (recipes, gotchas)
- `test/corpus/render-one.ts`, `render-one-xdot.ts` usage headers

## Interface out (consumed by T3/T4)

```
{ edges: [{ name, tail, head, portOps: [...], oracleOps: [...] }],
  portWallClockSec, oracleWallClockSec }
```
Written as `$SCRATCHPAD/2621/target.json` + a human-readable summary in the
journal.

## Acceptance criteria

- Given both xdot renders, when diffed, then every diverging edge is listed
  by name with per-op deltas (not just the first).
- Given the port render, when timed, then the wall-clock is recorded in the
  journal and compared to the D5 budget.
- Given the renders finish, when the orphan check runs, then no stray node
  processes remain.

## Observability: N/A — no new observable operations.
## Rollback: Reversible (no tracked writes).
