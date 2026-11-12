# Decisions: issue #189

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. Nobody confirmed these; each one names the rejected options and the
evidence so the maintainer can audit it.

### AD-1: swap the one call at sgd.c:223

- **Decision:** `src/layout/neato/sgd.ts:346` becomes `libmHypot(dx, dy)`, imported
  from `../../common/libm-hypot.js`. Nothing else in `sgd.ts` changes.
- **Rejected:** also modelling `sgd.c:22` (`calculate_stress`): it runs only under
  `Verbose` to print stress and has no port counterpart, so there is no call to
  change. Modelling `exp` at `sgd.c:216`: ruled wontfix on #133.
- **Evidence:** the ruling on #133. Measured at planning on a copy of the source:
  sgd58 goes from 133 to 6 of 255 differing `-Tdot` lines, max delta 0.01. The
  model costs no more than `Math.hypot` (6 ns against 10 ns per call).

### AD-2: pin one native-traced step, not an sgd58 snapshot

- **Decision:** a unit test calls `sgdIteration` on the first step at which the T6
  trace saw `Math.hypot` miss native (`first-diff.txt`, step 0, term 2). It asserts
  the resulting coordinates exactly.
- **Rejected:** a golden of sgd58's output. It is not byte-equal to native (the
  accepted `exp` residual), and `Math.exp` differs by platform, so a snapshot would
  pin variance the project has accepted and could fail on Linux CI (PR 119,
  `kk-large`).
- **Evidence:** at that step native's magnitude is `0x1.ed53ed6ed918fp+0`,
  `libmHypot` returns it, and `Math.hypot` returns one ulp more. With `d: 3` the
  two give different `pos` values, so the test is red on the base.

### AD-3: update the ledger entry in place

- **Decision:** replace the `2-D mode=sgd (accepted, A1)` bullet
  (`docs/known-divergences.md:1462-1466`) with this text, wrapped at the file's
  width, and carry the same change into the bullet of every
  `docs-site/<locale>/divergences.md` (23 pages, one bullet each), refreshing each
  page's `sourceHash`:

  > - **2-D `mode=sgd` (accepted, A1).** The port models macOS libm `hypot` at
  >   `lib/neatogen/sgd.c:223` with `src/common/libm-hypot.ts`. The layout still
  >   differs from native in the last bit of `exp` (`sgd.c:216`), by at most 0.01
  >   points on the graph tested. A macOS `exp` model is not planned (#133, PR 119).

- **Rejected:** leaving it. It says "no code changed" and cites the 1.59 points that
  this mission removes. Adding a second bullet: the ledger states current status per
  divergence. Refreshing the hashes without translating: `.agent-notes/issue-143.md`
  records that defect, a fresh hash over an untranslated change.
- **Evidence:** the accepted bullets next to it state current status. Each of the
  last eight commits that edited this file also edited all 23 locale pages. At
  planning all 23 are fresh at `698db30518ae` (`npm run docs:i18n-status`).

### AD-4: no golden or corpus record changes

- **Decision:** the mission changes no `test/golden` or `test/corpus` file.
- **Rejected:** re-walking neato as part 11 T6 proposed. That walk is the
  maintainer's full run over the queue branch, per the queue rules.
- **Evidence:** of the corpus manifest's applicable inputs only `2613` sets
  `mode=sgd`, and swapping the call leaves it byte-identical to the base and equal
  to native. Apart from the parity records, nothing under `test/` mentions sgd.

## Baseline

Green on `b7d2680b` at planning: `npm run typecheck`, `npm test`,
`bash test/golden/gates.sh` (5/5), `npx vitest run test/corpus test/docs`,
`npm run docs:i18n-status` (0 stale). `npm test` is 571 files / 13485 tests; corpus
and docs are 24 files / 2844 tests. The project has no lint script. Measured on a
temporary copy of `src/` with the swap applied: the nine neato test files that
mention sgd all pass (329 tests), and T1's pinned test is red with `Math.hypot`
and green with `libmHypot`.

## Rollback

Reversible: revert the commit. No data, API or dependency changes.

## Operational readiness (auto-confirmed)

A browser library, no service: no SLIs, alerts, dashboards, or on-call story. No API
or schema change. The only behaviour change is `mode=sgd` coordinates moving toward
native.
