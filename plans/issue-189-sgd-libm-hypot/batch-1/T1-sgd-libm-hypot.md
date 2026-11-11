# T1: sgd uses the libm-hypot model

## Context

C `lib/neatogen/sgd.c:223` computes `mag = hypot(dx, dy)` in the SGD inner loop. The
port's `sgdIteration` (`src/layout/neato/sgd.ts:346`) calls `Math.hypot`, which
misses the oracle's macOS libm on 18516 of 49590 calls on sgd58
(`plans/post-16-1-followups-11/harness/T6/results/libm-misses.txt`). The first miss
is the first differing value in the T6 trace, and with the libm model the port's
trace runs on until the `exp` difference at `sgd.c:216`. The ruling on #133 adopts
the existing model and rejects an `exp` model.

## Task (TDD)

1. **Red:** add to `src/layout/neato/sgd.test.ts` a test that imports
   `sgdIteration` and runs this step, from the T6 trace (step 0, term 2):

   ```ts
   // native (macOS libm): mag = 0x1.ed53ed6ed918fp+0, one ulp below Math.hypot
   const pos = Float64Array.of(0.9459929482215521, -1.6788879764409057, 0, 0);
   sgdIteration(pos, [{ i: 0, j: 1, d: 3, w: 1 }], [true, false], 1);
   expect(pos[0]).toBe(1.2093451279240262);
   expect(pos[1]).toBe(-2.146268635993602);
   expect(pos[2]).toBe(0);
   expect(pos[3]).toBe(0);
   ```

   `d: 3` is chosen, not traced: `d: 1` gives the same `pos` for both magnitudes.
   Run the file. The first assertion must fail on the base source, with
   `1.209345127924026` (`Math.hypot`'s value).
2. **Green:** in `sgd.ts` import `libmHypot` from `../../common/libm-hypot.js`,
   next to the other `common` imports, and make line 346
   `const mag = libmHypot(dx, dy);`. Leave `Math.exp` and the `mag === 0` guard.
3. Replace the `2-D mode=sgd (accepted, A1)` bullet in
   `docs/known-divergences.md` (lines 1462-1466) with the text in
   [AD-3](../decisions.md#ad-3-update-the-ledger-entry-in-place). Translate that
   change into the bullet of each `docs-site/<locale>/divergences.md` (`grep -n
   'mode=sgd'` finds it, once per page), keeping each page's existing word for
   "accepted" and for "native". Set each page's `sourceHash` to the output of
   `node scripts/i18n-hash.mjs docs/known-divergences.md`. Check all 23 by marker:
   each bullet contains `libm-hypot.ts`, `sgd.c:216` and `#133`, and contains
   neither `1.59` nor `1,59`. Do not touch `README.md:174`: it describes the mode,
   not the drift.
4. In `plans/post-16.1-followups/README.md` mark items 143 and 144 in the style of
   item 142: `**[DONE — issue #189: sgd.ts calls libmHypot]**` and
   `**[WONTFIX — ruling on #133: exp residual stays accepted]**`.
5. Gates 1-6 (README), then journal, then the squash in the README.

## Write-set

- `src/layout/neato/sgd.ts` (the import and line 346 only)
- `src/layout/neato/sgd.test.ts`
- `docs/known-divergences.md` (lines 1462-1466 only)
- `docs-site/<locale>/divergences.md`, all 23 (the `mode=sgd` bullet and
  `sourceHash` only)
- `plans/post-16.1-followups/README.md` (items 143 and 144 only)
- `plans/decision-journal.md` (one row), `plans/issue-189-sgd-libm-hypot/decision-journal.md`
- `.agent-notes/issue-189.md` (only if novel)

## Read-set

- `src/layout/neato/sgd.ts:10-22,335-356`
- `src/layout/neato/sgd.test.ts:1-20`
- `src/common/libm-hypot.ts`
- `src/layout/fdp/tlayout.ts:25` (the import precedent)
- `~/git/graphviz/lib/neatogen/sgd.c:214-236`
- `plans/post-16-1-followups-11/harness/T6/results/first-diff.txt`
- `docs/known-divergences.md:1462-1466`
- `.agent-notes/issue-143.md` (how to edit the locale pages)
- `git show d6d0a91b --stat` (the precedent: one ledger clause, 23 locale pages)

## Interface contracts

None. `sgdIteration`'s signature does not change.

## Acceptance criteria

- Given the pinned step, when `sgdIteration` runs, then `pos[0]` is
  `1.2093451279240262` and `pos[1]` is `-2.146268635993602`, exactly, and the fixed
  node stays at the origin.
- Given `src/layout/neato/sgd.ts`, when grepping `Math.hypot`, then there are no
  matches.
- Given the 23 locale pages, when `npm run docs:i18n-status` runs, then it reports
  `stale pages: 0`, and every page's `mode=sgd` bullet passes the marker check in
  step 3.
- Given the smoke list, when the base and head bundles are compared, then every job
  is identical.
- Given the sgd inputs, when compared with native, then the counts in the table
  under [Targeted survey](#targeted-survey) hold.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue189-head.mjs`. Build the base from `git archive
b7d2680b` extracted under `$TMPDIR`, with `node_modules` symlinked and `npm run
parser:regen`, and copy its bundle to `$TMPDIR/issue189-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue189-base.mjs $TMPDIR/issue189-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue189-bytediff.json
```

Expected: identical on every job. Of the smoke list only `2613` sets `mode=sgd`, and
only on `-Kneato`; it stayed identical in a bytediff at planning.

## Targeted survey

How the ids were chosen: the change is reachable only through `mode=sgd` on neato.
A grep of every applicable input in `test/corpus/corpus-manifest.json` for
`mode=sgd` finds only `2613`; re-run it. `sgd58` is the T0 probe from part 11 and the
issue's own measure.

Plugin dir (`/tmp/ghl` has no neato):

```
G=$TMPDIR/issue189-ghl; B=~/git/graphviz/build; mkdir -p $G
for p in core dot_layout neato_layout; do
  ln -sf $B/plugin/$p/libgvplugin_$p.8.dylib $B/plugin/$p/libgvplugin_$p.dylib \
    $B/plugin/$p/libgvplugin_$p.8.0.15.dylib $G/
done
GVBINDIR=$G $B/cmd/dot/dot -c
```

Compare (`node` is run from the repo root, so `$PWD` resolves):

```
GVBINDIR=$G node plans/issue-189-sgd-libm-hypot/harness/compare.mjs \
  $TMPDIR/issue189-base.mjs $TMPDIR/issue189-head.mjs \
  $PWD/plans/post-16-1-followups-11/harness/T0/sgd58.gv ~/git/graphviz/tests/2613.dot
```

Expected, as measured at planning (`head` and `max` are upper bounds; `structure`
must be true):

| Input | Format | Lines | base | head | max |
|---|---|---|---|---|---|
| `sgd58.gv` | dot | 255 | 133 | 6 | 0.01 |
| `sgd58.gv` | xdot | 521 | 398 | 15 | 0.01 |
| `sgd58.gv` | plain | 134 | 133 | 7 | 0.0001 |
| `2613.dot` | dot | 38 | 0 | 0 | 0 |
| `2613.dot` | xdot | 46 | 0 | 0 | 0 |
| `2613.dot` | plain | 5 | 0 | 0 | 0 |

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
