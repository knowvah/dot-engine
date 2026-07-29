<!-- SPDX-License-Identifier: EPL-2.0 -->

# T6b — Documented acceptance (commit 2; only if T5 = irreducible tie)

## Context

D4 bar: acceptance requires injection-grade evidence recorded in the RCA
(forcing the C-side value at the fork byte-matches the stage output / the
final edge). Class must map to an existing documented family (A3 hypot tie,
A8 fp-contract, A9 libm-vs-V8) or justify a new class in prose.

## Task

1. Add the per-id entry to `test/corpus/accepted-divergences.json` (dot-track
   registry; `match.id: "2621"`, class, scope "parity", verdict "diverged"
   or "structural-match" per the sweep record, bound describing the edge set
   and delta, reason citing the RCA, ref anchor). Surgical Edit on raw text —
   never a json.dump rewrite.
2. Extend the matching class prose in `docs/known-divergences.md` (registry
   comment mandates paired prose).
3. Commit: `test(corpus): accept 2621 as <class>`.

## Write-set

`test/corpus/accepted-divergences.json`, `docs/known-divergences.md`,
plan checkboxes.

## Read-set

`.agent-notes/2621-path-structure.md`; existing sibling entries in the
registry for shape; the class's prose section.

## Acceptance criteria

- Given the entry, when `npx vitest run test/corpus/` runs, then registry
  validation passes.
- Given the RCA, when reviewed, then the injection evidence section exists
  (D4) — otherwise STOP (condition 7).

## Observability: N/A. ## Rollback: Reversible (additive entries).
