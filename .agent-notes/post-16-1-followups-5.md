# post-16-1-followups-5 mission — observations (2026-10-27)

## Observation: locale staleness is cleared by the page front-matter, not the hash banner
- **Context**: T6 (24 `errors.md` pages).
- **Finding**: `npm run docs:i18n-hashes` writes `docs-site/.vitepress/i18n-hashes.json`,
  which is gitignored. `docs:i18n-status` judges staleness by each locale page's
  `sourceHash:` front-matter line against `node scripts/i18n-hash.mjs <english page>`,
  so after an English edit every locale page's `sourceHash` must be set to the new hash
  (2 changed lines per locale page: the passage and the hash).
- **Impact**: a locale edit task's write-set includes the front-matter line; running the
  hashes script alone leaves 1 stale page per locale.
- **Confidence**: High

## Observation: the `mode=hier` `maxiter == 0` return is in constrained_majorization.c
- **Context**: T6 verifying the errors-table wording.
- **Finding**: `lib/neatogen/constrained_majorization.c:164-168`
  (`stress_majorization_with_hierarchy`) returns when `maxi == 0` before the
  `MODEL_SUBSET`/`MODEL_CIRCUIT` checks (173, 179); `neatoinit.c:majorization` has no
  `maxiter` return, and `neatoLayout` (`neatoinit.c:1290`) returns on
  `nG < 2 || MaxIter < 0`.
- **Impact**: cite the right file when documenting hier-mode behaviour.
- **Confidence**: High

## Observation: native `parse_style` faults print twice for nodes, once for edges
- **Context**: T5 (item 80).
- **Finding**: C parses a node's style in `emit_node` (`emit.c:1820`) and again in
  `stylenode`→`checkStyle` (`shapes.c:476`), so `nesting not allowed` / `unmatched ')'` /
  `truncating style` print twice per node; an edge is parsed once in `emit_edge`
  (`emit.c:3061`). The port's two reporting node calls are `applyNodeStyle` and
  `applyPenState` in `poly-gencode.ts`; every other re-read must use `styleTokensQuiet`.
- **Impact**: do not dedupe the doubled node message; keep exactly one reporting call per
  C parse site.
- **Confidence**: High

## Observation: the 5 s timeout test in `xdot-public.branch.test.ts` flakes under load
- **Context**: batch-2 landings and five agents' gate runs at load 100–150.
- **Finding**: "rethrows a GvError-like object as-is" has a 5 s cap and times out on a
  cold vitest transform cache when other vitest runs overlap; it passes alone every time.
- **Impact**: re-run that file alone before treating a Gate 2 / `npm test` failure as a
  regression; run `gates.sh` with no other vitest run on the machine.
- **Confidence**: High

## Observation: golden Gate 4 is a per-file line-count ratchet
- **Context**: T4, T7, T2 (`map.ts` 808, `json.ts` 734, `neato/splines.ts` 1014).
- **Finding**: `test/golden/line-limit-baseline.txt` pins each listed file at its current
  length; adding even one import line fails Gate 4 until something else in the file is
  trimmed.
- **Impact**: budget line trims when a task adds code to a baselined file.
- **Confidence**: High

## Observation: `probe.ts` limits
- **Context**: T7, T9.
- **Finding**: `probe.ts` is svg-only (no `-T`), takes DOT source or a file path only as
  the case argument, and its shape check sees text x/y and ellipse rx/ry but not fill
  colour, penwidth, bgcolor, gradients or peripheries; json stderr and cluster fills need
  a direct bundle render and a full-SVG diff.
- **Impact**: pick the comparison tool per attribute.
- **Confidence**: High

## Observation: zsh parses `==` and `====` as `=cmd` expansion
- **Context**: every agent's shell loops.
- **Finding**: `echo == $x` fails with `= not found`; quote the marker.
- **Impact**: quote separators in zsh one-liners.
- **Confidence**: High
