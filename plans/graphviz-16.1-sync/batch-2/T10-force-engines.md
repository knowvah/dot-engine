# T10 — Force-directed engines and xlabels

**Agent:** typescript-pro (model: opus). **Depends on:** T3. Follow
[area-task-protocol.md](area-task-protocol.md). **Perf gate** at land (for the
engines T3 lists).

**Rollback:** Reversible. **Observability:** N/A — library code; the SLIs are
survey verdicts and the ratchet length.

## Context

16.1 changes in `lib/sfdpgen` (`post_process.c`, `spring_electrical.c`,
`Multilevel.c`, `sparse_solve.c`, `stress_model.c`), `lib/sparse`
(`SparseMatrix.c`, `general.c`, `mq.c`, `clustering.c`, `DotIO.c` — likely
outside), `lib/neatogen` (24 files, e.g. `quad_prog_vpsc.c`, `dijkstra.c`,
`overlap.c`, `constraint.c`, `neatoinit.c`, `sgd.c`), `lib/fdpgen`,
`lib/circogen`, `lib/vpsc`, `lib/label/xlabels.c` (bbox parameter threading,
`d89d3b156`; set → bool; leak fix). Numeric edits can move force-directed output
by ULPs. A1 (force-directed FP determinism) is an accepted class, so judge moved
walk ids against `accepted-divergences-engines.json` rules. Port side:
`src/layout/{neato,sfdp,fdp,circo,twopi,osage,patchwork}/*` (sparse in
`src/layout/sfdp/`), `src/label/*`, `src/vpsc/*`.

## Acceptance

- Given every T3 row for T10, then each is ported with a test, or recorded as refactor-only with a reason.
- Given the engine walks T3 lists as moved, when re-run for the touched engines
  (orchestrator at land), then no id regresses vs the T2 walk counts.
- Given xlabel placement goldens, then they pass vs 16.1.0.

## Write-set

`src/layout/{neato,sfdp,fdp,circo,twopi,osage,patchwork}/*`, `src/label/*`,
`src/vpsc/*` + tests; `test/golden/known-failing.json` (removals).

## Commit

`fix(layout): mirror graphviz 16.1 force-directed and xlabel changes`
