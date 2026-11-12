# Decisions: issue #173

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-11. No issue was labelled `queue:planned`. The lowest-numbered
`queue:ready` issue, #172, was skipped: c29f47fa fixed it on this branch
(`Refs: #172`), and its three inputs are pinned in
`src/layout/dot/flat-adj-ordering.test.ts`. Its label was swapped to
`queue:on-branch`, with a comment. #173 has no "Blocked by" references. Nobody
confirmed the decisions below. Each one names the options it rejected and the
evidence, so the maintainer can audit it.

### AD-1: no separate diagnosis task; the issue's artifact stands, re-measured

- **Decision:** T1 goes straight to red tests and the fix. The issue already has
  every part of the diagnosis artifact, and planning re-ran its controlled
  experiment on `cbf48285`: the six-site truncation turns all six probes equal to
  native in three formats.
- **Rejected:** a T0 that re-instruments native. The issue's native trace gives
  the first divergent value (box 0 `UR.y` 94 against 94.5), and planning's
  experiment confirms the effect on the current tip. Doing it again adds cost and
  no evidence.
- **Guard:** stop condition 1 covers the case where the mechanism turns out
  incomplete.

### AD-2: port the `position.c:276` sibling in the same mission, with a unit test

- **Decision:** T2 changes `src/layout/dot/position-aux.ts:201` to
  `Math.trunc(edgeMinlen(e) * nodesep / 2)`, which is C's `int m0`. A unit test in
  `position-aux.branch.test.ts` pins it: for an odd product, the aux edge's
  `minlen` is `cround(trunc(p/2) + rw + lw)`.
- **Rejected:** leaving it with a follow-up issue. CLAUDE.md says the C types are
  the spec, the defect class is the same (C `int` arithmetic on
  `GD_nodesep`/`GD_ranksep`), and the change is one line.
- **Rejected:** fixing it without a test. That would be untested logic, against
  `testing.md`.
- **Evidence that no render changes:** `ND_alg(u)` is set only for a labelled
  non-adjacent flat edge. A labelled graph runs `edgelabel_ranks`, which doubles
  every `ED_minlen` (`rank.c:176-180`). So `ED_minlen(e) * GD_nodesep(g)` is even,
  and float and `int` division agree. Planning marker: `nodesep=0.32` (23) gave
  `m0` = 23 (minlen 2) and 69 (minlen 6). Stop condition 5 holds this to account.

### AD-3: truncate inline at each site, as the C writes it

- **Decision:** each of the six expressions becomes `Math.trunc(ranksep / 2)`,
  with a short comment citing `GD_ranksep` as `int` (types.h:335) at the first
  site of each file. `ranksep` is always a non-negative integer here (`POINTS`
  rounds it, and `rank.ts:171` floors), so `Math.trunc` equals C's `/`.
- **Rejected:** a shared `halfRanksep()` helper. The C has no such function, and
  CLAUDE.md says to keep function boundaries.
- **Rejected:** truncating once in the callers' `ranksep` argument. The C divides
  at the use site, and other readers of the same argument (none today) would get
  a halved value.
- **Precedent:** `Math.trunc((g.info.nodesep ?? 18) / 4)` for `Splinesep`
  (`edge-route-chain.ts:57`, `splines-flat.ts:538`), and
  `Math.floor((g.info.nodesep ?? 0) / 2)` in `classify.ts:177` (`class2.c:44`).

### AD-4: tests render through the public API and pin native's text

- **Decision:** T1 adds `src/layout/dot/flat-adj-ranksep.test.ts`. For each probe
  it renders `-Tplain` with `render(parse(src), 'plain', { engine: 'dot' })` and
  compares with `harness/native/<probe>.plain`, inlined as a constant with a
  provenance comment, and compares exactly (`toBe`), as
  `flat-adj-ordering.test.ts:185` does. `two-labelled` also
  pins `-Tdot`, because its `bb` growth is the visible symptom (9 lines).
- **Rejected:** only unit tests on the end boxes. The issue's done criterion is
  output equality.

## Baseline

On `cbf48285` at planning: `npm run typecheck` exit 0; `npm test` 573 files,
13521 tests, all passed. Oracle preflight: `/tmp/ghl/config8` present.

## Rollback

Reversible: revert the one squashed commit. No data, API or format change. The
library's output changes only where it now equals native.

## Size

All touched source files are well under 500 lines (`splines-path-begin.ts` 243,
`splines-path-end.ts` 231, `position-aux.ts` 388). The edits add no lines, beyond
a comment.
