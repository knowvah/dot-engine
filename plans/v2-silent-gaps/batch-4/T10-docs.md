# T10: documentation

## Task

1. `docs-site/guide/errors.md`: regenerate the UNSUPPORTED_FEATURE table from the
   throw sites (grep `UNSUPPORTED_FEATURE` in non-test `src/`); show the
   grep-vs-table check in the report. Voronoi's condition is now C's exact test.
2. `README.md` "Migrating to 2.0" behaviour-fix rows: neato `mode=KK` (KK solver),
   `mode=sgd` honoured, unknown `mode` warns, overlap `oscale`/`ortho*`/
   `portho*`/`vpsc` on neato/twopi/circo/sfdp, sfdp non-prism modes, circo
   multi-component overlap, fdp subgraph-only `coords`, voronoi exact overlap test.
3. `docs/known-divergences.md`: remove the "still silent" entries this mission
   closed and the voronoi bbox residual; keep anything still open (e.g. the
   Voronoi adjuster itself, loud).
4. `plans/port-catalog/README.md`: tick what was ported.

Sources of truth: the code, `../decisions.md`, `../decision-journal.md`.

## Write-set

`docs-site/guide/errors.md`, `README.md`, `docs/known-divergences.md`,
`plans/port-catalog/README.md`.

## Acceptance criteria

- Every UNSUPPORTED_FEATURE throw site appears in the errors table and nothing else.
- `npm run docs:build` succeeds with no new dead links.
- No known-divergences entry describes behaviour the code no longer has.
