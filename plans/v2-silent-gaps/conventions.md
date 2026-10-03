# Conventions shared by every task

## Step 0 (before changing code)

Re-confirm the gap on a discriminating fixture: native output must change with
the attribute and the port must differ from native. If the port already matches,
journal it and skip the item (success, not a stop). If native behaves unlike the
task's premise, stop (stop condition 3).

## Native oracle

`/tmp/ghl` links only core + dot_layout. Use a scratch GVBINDIR with neato too:

```sh
O=<scratchpad>/gvall; mkdir -p $O
for p in core dot_layout neato_layout; do
  ln -sf ~/git/graphviz/build/plugin/$p/libgvplugin_$p.* $O/
done
GVBINDIR=$O ~/git/graphviz/build/cmd/dot/dot -c
GVBINDIR=$O ~/git/graphviz/build/cmd/dot/dot -K<engine> -Tplain in.gv
```

Port: `render(parse(src), 'plain', { engine })` from `src/index.ts` via a scratch
script run with `npx tsx`. `-v2` prints overlap diagnostics ("overlap [i] : n",
"Node separation: …") — a cheap way to see which adjuster C ran. For internal
functions (polyOverlap, cAdjust, sAdjust), dump C inputs/outputs with temporary
stderr instrumentation in a scratch copy, never in ~/git/graphviz itself.

Pitfalls (from v2-fidelity): neato `pos` is inches unless `inputscale` is set;
a multiplicative `sep` scales by 1+x; run loops under bash, not zsh; never edit
`src/` while a corpus gate runs from live source (bundles are snapshots).

Record per task in the agent report: fixtures, commands, max |Δ| per coordinate,
verdict. The executor journals it.

## Quality bar (every task)

- TDD (tests first). Strict TS, no `any`, SPDX header on new files, `@see` C
  reference on every ported symbol, C function boundaries kept.
- Complexity hook: ≤30 NLOC/function, CCN ≤10, ≤5 params, files ≤500 lines; a
  file already over 500 lines may not grow (`src/layout/neato/init.ts` is 503).
- No module-level mutable `let` (test/architecture/module-globals.fitness.test.ts).
- Hot loops reuse typed arrays (CLAUDE.md memory rule).
- Agents run only `npx tsc --noEmit --stableTypeOrdering`, `npx tsgo --noEmit`
  and `npx vitest run <their dirs>`; no npm scripts (pre-scripts race), no git
  commit/stash/checkout. Graphs without the task's attributes must stay
  byte-identical: save port output for a few fixtures before editing, compare
  after.

## Observability / rollback (every task)

Observability: N/A — no new observable operations (library). Rollback:
Reversible (revert commit); nothing is published.

## File-size headroom at 4fe3d1ca (500-line cap)

`neato/init.ts` 503 (shrink only) · `neato/sgd.ts` 461 · `fdp/layout.ts` 485 ·
`dot/ns.ts` 506 (read-only here) · `neato/index.ts` 307 · `sfdp/index.ts` 231 ·
`circo/circular.ts` 227 · `neato/fdp-adjust.ts` 176. Split into a new module
inside the write-set rather than grow past the cap (push-forward).
