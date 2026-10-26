# T5: agerr prefixes and console channel (items 54, 55; AD-9)

**Context:** part 3 T5 routed these through `agerrLineOn` with text unchanged, so they
lack the prefix `out` adds natively (`lib/cgraph/agerror.c`):
- `Warning: ` missing: `src/layout/neato/edge-len.ts:28` (bad edge len), `kk.ts:293`
  (Max. iterations), `start.ts:147` (Illegal value … mode), `fdp-adjust.ts:165`
  (Unrecognized overlap value), `src/ortho/index.ts:150` (Orthogonal edges …).
- `Error: ` missing: `src/common/postproc.ts:232` (lost <t> <h> edge),
  `src/common/splines-routespl.ts:454` (in routesplines, Pshortestpath failed).
Item 55: these agerr warnings pass the `'error'` channel because tests spy on
`console.error`: `poly-init.ts:121`, `layout/dot/cluster.ts:301`, `layout/dot/conc.ts:296`,
`common/graph-init.ts:92`, `parser/dot.pegjs:78` (macros; regenerate `dot.js` with
`npm run parser:regen`), the number-ambiguity warning in `parser/number-scan.ts`.

**Task:**
1. For each prefix site, confirm the C call (`agwarningf`/`agerrorf`/`agerr(AGWARN…)`) and
   switch to `agwarningf`/`agerrorf` so the prefix and channel follow C. Keep `fprintf`
   sites raw.
2. Remove the `'error'` channel override at the 6 sites; update every test that spies on
   `console.error` for these warnings to `console.warn`.
3. Golden "logs nothing" allow-lists: adjust only where a native-matching line moves.

**Write-set:** the 13 files above (+ `src/parser/dot.js` regenerated) and the tests that
spy on these messages (find with `grep -rln "console, 'error'" src test`).
**Read-set:** `src/common/agerr.ts`; C counterparts (`neatogen/neatoinit.c`, `kkutils.c`/
`stuff.c`, `fdpgen`/`neatogen/adjust.c`, `ortho/ortho.c`, `common/postproc.c`,
`common/routespl.c`, `common/shapes.c`, `dotgen/cluster.c`, `dotgen/conc.c`,
`common/input.c`, `cgraph/grammar.y`, `cgraph/scan.l`).

**Acceptance criteria:**
- *Given* one case per message (T0's `$BASE/native/`), *when* probed, *then* each port
  line equals native's.
- *Given* the 6 channel sites, *then* their warnings arrive on `console.warn` and nothing
  for them on `console.error`.
- *Given* the corpus, *then* bytediff main outputs identical (console diffs only, each
  toward native).

**Observability:** N/A. **Rollback:** reversible. **Release note:** warnings formerly on
`console.error` now arrive on `console.warn`.
