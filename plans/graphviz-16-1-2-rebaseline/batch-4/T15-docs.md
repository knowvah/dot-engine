# T15 — reports and docs (`docs(T15)`)

## Steps (orchestrator, then documentation-engineer for the locales)
1. Reports: `npx tsx test/corpus/parity-report.ts` (PARITY.md, PARITY-<engine>.md, PARITY-dot-dot.md,
   PARITY-dot-plain.md) and any dashboard not yet re-run (`npm run survey:dashboard`, `xdot-`, `json-`,
   `map-dashboard.ts`). If `parity-report.ts` rewrites `PERF.md`, restore it (AD-10).
2. `docs/known-divergences.md`:
   - the universe sentence and count tables → 16.1.2 numbers; oracle prose → 16.1.2 carried and its dirs;
   - `## Pending 16.1.1 ports` (`:1306`): mark which issues remain open, and add **`## Pending 16.1.2 ports`**:
     one row per issue (#300–#303 and any new `upstream-16.1.2` issue) with its id count and engines (AD-3);
   - a **"16.1.2 render skip (pending #299)"** section: the ids and formats, what native does now, and that
     the port keeps rendering until #299 is ruled (AD-2);
   - the U-series section (`:1280`): the carried patch is still not upstream as of 16.1.2.
   `known-divergences-examples.test.ts` must still pass.
3. `docs-site/divergences.md` and `docs-site/divergences-proc3d-a2.md`: same facts.
4. Locales: dispatch **documentation-engineer** with the English diffs of the pages changed in steps 2–3 for the
   23 locale copies (`docs-site/<prefix>/`): translate only the changed passages, include #311's
   `buildNodeLabel` → `makeNodeLabel` code-span fix, and set each page's `sourceHash` (`npm run
   docs:i18n-hashes` or `node scripts/i18n-hash.mjs <english-path>`, whichever the repo uses now). Gate:
   `npm run docs:i18n-status` 0 stale × 23, `test/docs` green.
5. `docs/adr/0002-graphviz-16.1.1-oracle.md` and `docs/adr/0003-upstream-fix-forward.md`: a line under Status:
   "Version clause superseded by ADR-0004 (graphviz 16.1.2)".
6. Project `CLAUDE.md` Verification section: oracle = 16.1.2 carried (`~/git/sseely/graphviz-carried-1612`,
   `/tmp/ghl1612-carried{,-all}`), pristine 16.1.2 bisect build (`~/git/graphviz-16.1.2`, `/tmp/ghl1612{,-all}`),
   ADR-0004; 16.1.1 builds kept for bisecting a 16.1.1 → 16.1.2 change; keep CLAUDE.md under 200 lines.

## Write-set
`test/corpus/PARITY*.md`, `docs/known-divergences.md`, `docs-site/divergences*.md`,
`docs-site/<23 prefixes>/divergences*.md`, `docs/adr/0002-graphviz-16.1.1-oracle.md`,
`docs/adr/0003-upstream-fix-forward.md`, `CLAUDE.md`.

## Acceptance criteria
- Given `known-divergences.md`, then no "16.1.1" remains as the current oracle (history passages may keep it),
  the pending-16.1.2 section lists every issue with ≥1 id from T12, and the render-skip section lists every
  #299 id.
- Given the locale check, then 0 stale × 23 and `npx vitest run test/docs` green.
- Gates: typecheck, `npm test`, goldens, corpus + docs green.

## Observability / rollback
N/A. Reversible.
