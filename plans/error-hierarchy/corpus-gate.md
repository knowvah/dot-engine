# Corpus gate: port-only main vs branch

Run after batch 2 (2a + 2b both done) and after batch 3. Never edit `src/` while it
runs (the renders read live source).

## Why not the full survey

The full `npm run survey` took ~4.5 h on 2026-10-01 (tail: `world`,
`2475_1`, and the `2593` oracle overran its cap). The committed
`test/corpus/parity-rules.json` is stale (2026-07-30). Comparing port output
between main and the branch is cheaper and stricter: it needs no oracle and checks
bytes, not verdicts.

## Procedure

1. `git worktree add <scratch>/main-wt main`; symlink `node_modules`; copy the
   gitignored generated parser `src/parser/dot.js` and `dot.d.ts` into it.
2. For each tree, render **in a fresh process per input** (pool workers leak module
   state between jobs: the 2026-09-23 journal found `2242`/twopi differing only under
   worker reuse):
   - golden cross-product: every `test/golden/inputs` file × 8 engines × {svg, xdot};
   - corpus: every `applicable` id in `test/corpus/corpus-manifest.json`, engine
     `dot`, svg. Skip ids whose `test/corpus/perf.json` `portMs` ≥ 600000 (the
     over-cap tail: `world`, `2475_1`; `2475_1` is a pre-existing V8 heap OOM,
     identical on main per the 2026-09-23 journal). List the skipped ids in the journal.
   Record per (input, engine, format): exit status, stdout sha1, and for failures the
   thrown `name` + `code`.
3. Compare. **Pass:** every success is byte-identical; every failure either matches
   or differs only as listed in [reclassification.md](reclassification.md).
   Anything else is stop condition 4.
4. Journal: counts compared, skipped ids, every allowed reclassification observed.
   The script lives in the scratchpad and is not committed.
