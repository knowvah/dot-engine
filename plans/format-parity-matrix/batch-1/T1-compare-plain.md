<!-- SPDX-License-Identifier: EPL-2.0 -->

# T1 — Plain comparator

## Context
Port a semantic comparator for Graphviz `plain`/`plain-ext` output, peer to
`test/golden/compare-xdot.ts`. The `plain` grammar (`lib/common/output.c`
`write_plain`): `graph <scale> <w> <h>` / `node <name> <x> <y> <w> <h> <label>
<style> <shape> <color> <fill>` / `edge <tail> <head> <n> <x1 y1..xn yn>
[<label> <lx> <ly>] <style> <color>` / `stop`.

## Task
Parse both outputs into records keyed by name (node) and tail→head#i (edge).
Compare per AD-1 (±0.01 numeric, exact non-numeric) and AD-4 (an `iterative`
flag switches edge/node coords to position-agnostic: compare record/field
presence and non-numeric fields only). Return `{ verdict: 'pass'|'diverged',
diffs: Array<{ kind, id, field, port, native }> }`.

## Write-set
- `test/golden/compare-plain.ts` (create)
- `test/golden/compare-plain.test.ts` (create)

## Read-set
- `test/golden/compare-xdot.ts` — mirror its structure, keying, tolerance helper.
- `../decisions.md#ad-1--plain-comparator-design`, `#ad-4`.
- `lib/common/output.c:129` `write_plain` (grammar authority; already read).

## Interface contract (consumed by T5)
```ts
export function comparePlain(
  portOut: string, nativeOut: string,
  opts: { iterative: boolean },
): { verdict: 'pass' | 'diverged'; diffs: PlainDiff[] };
```

## Acceptance criteria
- Given identical outputs, when compared, then `verdict:'pass'`, `diffs:[]`.
- Given a deterministic-mode node coord off by 0.02, then `diverged` with a diff
  naming the node, field, both values.
- Given `iterative:true` and only coords differing, then `pass` (structural).
- Given a differing node `shape` (non-numeric), then `diverged` in both modes.
- Given an edge with a label whose position differs by 0.005 (deterministic),
  then `pass`.

## Observability / rollback
N/A — pure comparator. Reversible.

## Quality bar
`tsc --noEmit` clean; new tests green; ≥90% branch coverage of the comparator.
