# T12 — reports and docs (`docs(T12)`)

## Steps (orchestrator, then documentation-engineer for the locales)
1. Reports: `npx tsx test/corpus/parity-report.ts` (PARITY.md, PARITY-<engine>.md, PARITY-dot-dot.md,
   PARITY-dot-plain.md) and the dashboards not yet run (`npm run survey:dashboard`, `xdot-`, `json-`,
   `map-dashboard.ts`).
2. `docs/known-divergences.md`: replace "929-item universe (graphviz 16.1.0)" and the count table (`:115-224`) with
   16.1.1 numbers; `:75`, `:338`, `:1212` oracle prose → 16.1.1 and `/tmp/ghl1611`; add a section
   **"Pending 16.1.1 ports"**: one row per issue (#149–#165 and any new `upstream-16.1.1` issue) with its id count
   and engines, from `classification/*.md` (AD-3). `known-divergences-examples.test.ts` must still pass.
3. `docs-site/divergences.md` and `docs-site/divergences-proc3d-a2.md` (`:86-103`): same facts.
4. Locales: dispatch **documentation-engineer** with the English diffs of the pages changed in steps 2–3 for the 23
   locale copies (`docs-site/<prefix>/`): translate only the changed passages, set each page's `sourceHash` with
   `node scripts/i18n-hash.mjs <english-path>`. Gate: `npm run docs:i18n-status` 0 stale × 23, `test/docs` green.
5. `docs/adr/0002-graphviz-16.1.1-oracle.md`: Status → Accepted (date, this mission); add AD-5's note (src fixtures
   stay 16.1.0 until each port re-captures) and AD-2's `ghl1611-all` builder.
6. Project `CLAUDE.md` Verification section: oracle = 16.1.1 at `~/git/graphviz-16.1.1/build/cmd/dot/dot`,
   `GVBINDIR=/tmp/ghl1611` (dot) and `/tmp/ghl1611-all`, ADR-0002; 16.1.0 kept for bisecting until #149–#165 land.

## Write-set
`test/corpus/PARITY*.md`, `test/corpus/PERF.md` only if `parity-report.ts` rewrites it, `docs/known-divergences.md`,
`docs-site/divergences*.md`, `docs-site/<23 prefixes>/divergences*.md`, `docs/adr/0002-graphviz-16.1.1-oracle.md`,
`CLAUDE.md`.

## Acceptance criteria
- Given `known-divergences.md`, then no "16.1.0" remains except in history passages, and the pending-ports section
  lists every issue with ≥1 id from T9.
- Given the locale check, then 0 stale × 23 and `npx vitest run test/docs` green.
- Given ADR-0002, then Status reads Accepted.
- Gates: typecheck, `npm test`, goldens, corpus + docs green.

## Observability / rollback
N/A. Reversible.
