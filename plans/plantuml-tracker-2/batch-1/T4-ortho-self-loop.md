# T4 — Issue 29: ortho self-loop is lost

**Agent:** typescript-pro. **Depends on:** T0. **Rollback:** Reversible.
**Observability:** N/A — no new observable operations.

## Context

plantuml-ts issue 29 (`unknown/xagonu-36-sudi116`): `digraph g { splines=ortho; a -> a; }`.
Native 15.x draws
`M27,-54.42C27,-63.28 27,-72 27,-72 27,-72 72,-72 72,-72 72,-72 72,0 72,0 72,0 27,0 27,0 27,0 27,-6.06 27,-6.06`
on an 80×80pt canvas; the port logs `lost a a edge`, emits no path, canvas 80×44.
C: `lib/ortho/ortho.c:addLoop` (412-440), call site ~1246; port:
`src/ortho/sgraph.ts:263-` `addLoop`, `src/ortho/index.ts:171`. "lost" is
printed by `src/common/postproc.ts:230` (`map_edge`) — the edge reached
postproc with no spline. Unknown whether the loop never reaches `orthoEdges`
(dot's self-loop dispatch under `et == ORTHO`, `dotsplines.c` ~`_dot_splines`
self-loop branch), or `shortPath`/`convertSPtoRoute` fails for `start === dest`.

## Task

Diagnosis first (AD-7): instrument (env-gated, reverted) both the port and an
rsync'd scratchpad copy of graphviz to find where the paths diverge; write the
artifact (mechanism, origin `file:line`, causal chain, ruled out) to
`.agent-notes/pt29-ortho-loop.md`. Then TDD: `test/golden/pt-issue-29.test.ts`
for `pt-issue-29` and `pt-issue-29-pair`; fix at the origin.
If the origin turns out to be in `src/layout/dot/` (self-loop dispatch), that is
outside this write-set → STOP condition 1 (report; the orchestrator re-plans).

## Acceptance

- Given `splines=ortho; a -> a`, when rendered, then the SVG matches
  `pt-issue-29.svg` within 0.01 and nothing is logged.
- Given `splines=ortho; a -> b; a -> a`, then it matches `pt-issue-29-pair.svg`.
- Given every existing ortho test/golden, then unchanged.
- Given a fresh survey, then 0 regressions vs T0 baseline.

## Read-set

`~/git/graphviz/lib/ortho/ortho.c:400-450,1200-1300`, `src/ortho/index.ts:120-206`,
`src/ortho/sgraph.ts:250-300`, `src/common/postproc.ts:215-240`,
`~/git/graphviz/lib/dotgen/dotsplines.c` (search `EDGETYPE_ORTHO`, self-loop branch).

## Write-set

`src/ortho/index.ts`, `src/ortho/sgraph.ts`, `src/ortho/ortho.test.ts`,
`src/ortho/sgraph.test.ts`, `test/golden/pt-issue-29.test.ts`,
`.agent-notes/pt29-ortho-loop.md`.

## Commit

`fix(ortho): route self-loops instead of losing them`
