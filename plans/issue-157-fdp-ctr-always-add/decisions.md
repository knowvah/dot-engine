# Decisions: issue #157

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #157 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: drop the guard exactly as upstream did

- **Decision:** in `fdpTLayout` (`src/layout/fdp/tlayout.ts:311-316`), remove
  the `if (ctr.x !== 0.0 || ctr.y !== 0.0)` wrapper and keep its loop as it is:
  every node of `g` gets `pos[0] += ctr.x; pos[1] += ctr.y`, in `g.nodes`
  order. Touch nothing else in `fdpTLayout` or `initPositions`.
- **Why:** upstream `3135d895a` ("fdpgen fdp_tLayout: remove micro-optimization
  of 'ctr' additions") deletes only that `if` (`git show -w 3135d895a` in
  `~/git/graphviz`). The 16.1.1 oracle source has the loop unguarded
  (`~/git/graphviz-16.1.1/lib/fdpgen/tlayout.c:593-596`). CLAUDE.md: port every
  branch as the C has it.
- **What it changes:** only the sign of a zero. The old guard skipped the add
  when both `ctr` components compare equal to 0 (that includes `-0`). Adding
  `±0` to a non-zero coordinate returns it unchanged, bit for bit. Adding `+0`
  to `-0` gives `+0`. So the only nodes that change are those with a `-0`
  coordinate while that axis's `ctr` is `+0`. At planning, on the base, the
  pinned probe [harness/pinned-neg-zero.gv](harness/pinned-neg-zero.gv)
  (`a` at `-1,-1!`, `b` at `-0,0!`, `c` at `1,1!`, so `ctr = (+0, +0)`) leaves
  `b.pos[0]` as `-0` after `fdpTLayout`; 16.1.1's code makes it `+0`.
- **Rejected:**
  - Keeping the guard because the change is invisible in output. The C is the
    specification, and a later stage may read the sign (an `atan2`, say).
  - Adding only where a coordinate is `-0`. That has no C counterpart.

### AD-2: the test drives fdpTLayout on a derived component

- **Decision:** add to `src/layout/fdp/fdp.test.ts` a
  `describe('fdpTLayout — adds ctr unconditionally (tlayout.c:593-596)')`
  that does what the file's `findCComp` test does: `parse`, `fdpInitGraph`,
  `deriveGraph(g, initInfo(g))`, `findCComp(dg, { value: 0 })`, and then calls
  `fdpTLayout(comps[0], { numIters: 0, T0: 0, K: 0, C: 0, loopcnt: 0 })` (the
  `xpms` that `layoutComponents` passes, `layout.ts:450`). Cases:
  1. The probe graph: `Object.is(b.pos[0], 0)` is true, and the other five
     coordinates are exactly their inputs (pinned nodes do not move).
  2. Control, `ctr` non-zero: one pinned node `a [pos="1,2!"]` and a free node
     `z` joined to it. `a`'s pos comes back exactly `[1, 2]`.
- **Why:** the output formats cannot show the change. fdp translates the
  drawing so its bb starts at the origin, so a `-0` x picks up a non-zero
  offset. Native 16.1.1 on the probe prints `b` at `1.005 1.005` in `-Tplain`
  (`-Gnotranslate=true` changes nothing for fdp). The layout state is the only
  place to look. Measured at planning: case 1 fails on the base (`-0`), as
  the red step needs. Case 2 passes on the base and the head.
- **Rejected:**
  - A native capture. `fdp_tLayout` needs a full derived graph with ports and
    params set up, so a linked harness would be most of `fdp_layout`. The C
    statement is plain IEEE addition with nothing in between.
  - A golden. Nothing in any format changes (AD-3).

### AD-3: no corpus record or ledger edit

- **Decision:** do not edit `docs/known-divergences.md` (its 16.1.1 table groups
  #157 with #150, #152–#156, #160, #161, #165 as "none in the corpus or the
  goldens"), its locale copies, or any `test/corpus/*` record.
- **Why:** this is what the #150–#156 missions did. The maintainer's full survey
  over the queue branch rewrites records. The issue's own comment says no corpus
  id, format walk, engine walk, attribution row or golden changed verdict at
  16.1.1 because of this change. The detector agrees (README, Evidence).

## Baseline

Measured at planning on `760f7cc1`, load 5-13:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 580 files, 13690 passed, 18 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Rollback

Reversible: revert the squashed commit. No data, API or format change.
`fdpTLayout`'s signature is unchanged.
