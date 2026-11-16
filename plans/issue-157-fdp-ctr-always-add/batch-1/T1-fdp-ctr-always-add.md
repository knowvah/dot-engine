# T1: add ctr back unconditionally in fdpTLayout

## Context

`fdp_tLayout` (`~/git/graphviz-16.1.1/lib/fdpgen/tlayout.c:573-599`) moves
every node back by the pinned-node centre `ctr` that `initPositions` (`:413-571`)
subtracted. 16.1.1 dropped the `ctr.x != 0.0 || ctr.y != 0.0` guard around that
loop (upstream `3135d895a`). The port's `fdpTLayout`
(`src/layout/fdp/tlayout.ts:293-318`) still has the guard at `:311`. See
[AD-1](../decisions.md#ad-1-drop-the-guard-exactly-as-upstream-did) and
[AD-2](../decisions.md#ad-2-the-test-drives-fdptlayout-on-a-derived-component).

## Task (TDD)

1. **Red.** In `src/layout/fdp/fdp.test.ts`, import `fdpTLayout` from
   `./tlayout.js` and add the AD-2 describe block with its two cases. The probe
   source is [harness/pinned-neg-zero.gv](../harness/pinned-neg-zero.gv):
   `graph G { a [pos="-1,-1!"]; b [pos="-0,0!"]; c [pos="1,1!"]; a -- b; b -- c; }`.
   Read positions from the component's nodes (`comps[0].nodes.get('b')!.info.pos`).
   Assert with `Object.is`, or `expect(x).toBe(0)` together with
   `expect(Object.is(x, -0)).toBe(false)` (vitest's `toBe` uses `Object.is`, so
   `toBe(0)` already fails on `-0`). Assert the other coordinates exactly with
   `toEqual`. Run `npx vitest run src/layout/fdp/fdp.test.ts` and journal the
   failure. Expected: case 1 fails (`-0`), case 2 passes.
2. **Green.** Remove the guard per AD-1. Keep the loop body as it is. Add a line
   to `fdpTLayout`'s doc comment saying that ctr is added unconditionally as in
   16.1.1 (upstream `3135d895a`), and keep its `@see`.
3. Re-run the test file, then gates 1-6 (README). Journal each.
4. **Finish:** the README's squash step.

## Write-set

- `src/layout/fdp/tlayout.ts` (modify: the guard and the doc comment)
- `src/layout/fdp/fdp.test.ts` (modify: one import and the new describe block)
- `plans/issue-157-fdp-ctr-always-add/decision-journal.md`, the README's batch
  status and summary, `plans/decision-journal.md`, `.agent-notes/issue-157.md`
  (only if novel)

## Read-set

- `~/git/graphviz-16.1.1/lib/fdpgen/tlayout.c:413-599`
- `src/layout/fdp/tlayout.ts:285-318`
- `src/layout/fdp/fdp.test.ts:1-50`, `:132-186` (imports, the `deriveGraph`
  and `findCComp` blocks this one copies)
- `src/layout/fdp/layout.ts:440-460` (`layoutComponents`, the `xpms` literal)

## Interface contracts

None. `fdpTLayout(g: Graph, xpms: XParams): void` keeps its signature. Its one
caller is `layoutComponents` (`layout.ts:452`).

## Acceptance criteria

- Given the probe component (`ctr = (+0, +0)`, `b` pinned at `-0, 0`), when
  `fdpTLayout` runs, then `b.pos[0]` is `+0` and `a`, `c` and `b.pos[1]` are
  their inputs exactly.
- Given a component with one pinned node at `1, 2`, when `fdpTLayout` runs,
  then that node's pos is exactly `[1, 2]`.
- Given the 49 smoke ids, when bytediffing base and head bundles, then every
  job is identical.
- Given the survey ids on fdp, when bytediffing base and head, then every job
  is identical.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and
copy `dist/index.js` to `$TMPDIR/issue157-head.mjs`. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked
and `npm run parser:regen`, and copy its bundle to `$TMPDIR/issue157-base.mjs`.
Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue157-base.mjs $TMPDIR/issue157-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue157-bytediff.json
```

Expected: identical on every job. No smoke id reached the changed case at
planning (README, Evidence).

## Targeted survey

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt)):
the change can only act inside fdp's `fdpTLayout`, and only when `ctr` is zero,
which happens when a component has no pinned node or its pinned nodes centre
exactly on the origin. The ids are:

- every corpus input with a pinned node (`pos="…!"` or `pin=true`):
  `tree-doc-neato-G4_pinned`, `2239`, `42`;
- fdp's cluster path, where `initPositions` places boundary ports and
  `fdpTLayout` runs once per cluster: `graphs-fdp`, `graphs-clust`,
  `graphs-clust1`…`graphs-clust5`, `share-clust3`, `graphs-nestedclust`;
- every id the planning detector flagged: none (README, Evidence).

```
BD_ENGINES=fdp BD_FORMATS=svg,xdot,plain,cmapx,json npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue157-base.mjs $TMPDIR/issue157-head.mjs \
  plans/issue-157-fdp-ctr-always-add/harness/survey-ids.txt $TMPDIR/issue157-survey.json
```

Expected: 60 jobs (12 ids × 5 formats), identical 60. The detector
([harness/detector.sh](../harness/detector.sh) with
[harness/detector.patch](../harness/detector.patch)) is a base-only
instrument. It compares the guarded add with the unguarded one, so it has
nothing to compare on the head. Do not re-run it.

## Observability

N/A. C prints nothing here.

## Rollback

Reversible: revert the commit. No format, data or API change.
