# T10: documentation

## Context

After batches 1–3 every unported attribute is either ported or loud. Sources of
truth: the code (each `UNSUPPORTED_FEATURE` throw site; grep
`UNSUPPORTED_FEATURE` in `src/`), `../decisions.md` ADR-2, and
`../decision-journal.md`.

## Task

1. `docs-site/guide/errors.md`: under `UNSUPPORTED_FEATURE`, a table of every
   attribute=value that raises it (engine, attribute, value, the Graphviz
   feature it needs), generated from the actual throw sites. Include the
   error-hierarchy ones (sfdp smoothing/rotation, fdp overlap modes, special
   shapes).
2. `README.md` "Migrating to 2.0": rows for each attribute that rendered
   approximately in 1.x and now throws; rows for the behaviour fixes (nslimit,
   start=regular, inputscale, freeLayout, UTF-8 escaping).
3. `plans/port-catalog/README.md`: tick what this mission ported; correct the
   notes the inventory found wrong (mds and beautify are ported; the fdp
   trigger is `splines=compound`, not "clusteredges"); point loud items at the
   errors page.
4. `docs/known-divergences.md`: only if a port task left an accepted residual
   (see the journal); otherwise no change.

## Write-set

`docs-site/guide/errors.md`, `README.md`, `plans/port-catalog/README.md`,
`docs/known-divergences.md`.

## Acceptance criteria

- Every `UNSUPPORTED_FEATURE` throw site in `src/` appears in the errors-page
  table (show the grep-vs-table check in the report), and nothing else does.
- `npm run docs:build` succeeds with no new dead links.

## Observability

N/A — no new observable operations.

## Rollback

Reversible (revert commit). Docs only.

## Commit

`docs(errors): list unsupported attributes and 2.0 fidelity changes`
