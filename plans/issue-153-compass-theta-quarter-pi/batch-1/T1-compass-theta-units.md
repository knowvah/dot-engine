# T1: compass-port theta in quarter-pi units

## Context

Graphviz 16.1.1 (upstream `54360ff3b`) holds `compassPort`'s `theta` as an
`int` count of π/4 and converts it to radians once, at the end of
`invflip_angle` (`~/git/graphviz-16.1.1/lib/common/shapes.c:2605-2637`,
`compassPort` at `:2698-2863`). The port (`src/common/compass-port.ts`) still
does 16.1.0's radian arithmetic: `invflipAngleRL` at `:117`, `invflipAngle` at
`:128`, and the radian literals in `dirN`/`dirS`/`dirW` at `:191-215`. See
[AD-1](../decisions.md#ad-1-theta-travels-in-quarter-pi-integer-units-as-1611-holds-it)
to [AD-3](../decisions.md#ad-3-cs-direction-table-not-the-issues).

## Task (TDD)

1. **Red.** In `src/common/compass-port.branch.test.ts`, add
   `describe('invflipAngle — 16.1.1 quarter-pi table (shapes.c:2607)')` using
   the file's `resolve(compass, rankdir)`:
   - An `it.each` over all 8 compass points × TB/LR/BT/RL. Expected values come
     from C's integer table as `k * 0.25 * Math.PI`, asserted with
     `expect(Object.is(theta, expected)).toBe(true)` (or `toBe`, which uses
     `Object.is`), not `toBeCloseTo`. The units after the flip, per compass
     `e ne n nw w sw s se`:
     - TB `0 1 2 3 4 -3 -2 -1`
     - BT `0 -1 -2 -3 -4 3 2 1`
     - LR `-2 -1 0 1 2 -5 -4 -3`
     - RL `2 1 0 -1 -2 -3 4 3`
   - BT zero sign: `resolve('e', RANKDIR_BT).theta` and
     `resolve('c', RANKDIR_BT).theta` are `+0` (`Object.is(x, 0)`).
   Import `RANKDIR_LR` alongside the existing `RANKDIR_BT`/`RANKDIR_RL`. Run
   `npx vitest run src/common/compass-port.branch.test.ts`. Expected red: the
   two BT `e` rows (matrix and zero-sign) and BT `c` fail with `-0`; every
   other row passes on the base, because the old radians are bit-identical
   (AD-1 evidence). Journal the exact failures. If any other row fails, stop:
   AD-1's evidence is wrong.
2. **Green.** Change `compass-port.ts` per AD-1 and AD-2:
   - `DirectionResult.theta` doc: "C's `int theta`, in units of ¼×π".
   - `dirN`: `2, 1, 3`; `dirS`: `-2, -1, -3`; `dirW`: `4`; `dirE`, `_`,
     `dirDefault`, `dirUnrecognized` keep `0`.
   - `invflipAngleRL`: integer comparisons in C's order.
   - `invflipAngle`: switch on rankdir mutating a local, BT as `0 - a` with
     AD-2's comment, then `return a * 0.25 * Math.PI;`. Its doc says it takes
     quarter-pi units and returns radians, as C's comment does.
   - `@see` line numbers per AD-1.
3. Make the existing RL table test (`compassPort — invflipAngle under
   rankdir=RL`) exact (`toBe`) or drop it if the new matrix covers it
   (push-forward). Leave `compass-port.test.ts` as it is unless a test there
   breaks (it should not: its thetas are TB, tested `toBeCloseTo`).
4. Re-run the test file, then gates 1-6 (README). Journal each.
5. **Finish:** the README's squash step.

## Write-set

- `src/common/compass-port.ts` (modify)
- `src/common/compass-port.branch.test.ts` (modify)
- `plans/issue-153-compass-theta-quarter-pi/decision-journal.md`, the README's
  batch status, `plans/decision-journal.md`, `.agent-notes/issue-153.md`
  (only if novel)

## Read-set

- `~/git/graphviz-16.1.1/lib/common/shapes.c:2605-2637`, `:2698-2870`
- `git -C ~/git/graphviz-16.1.1 show 54360ff3b`
- `src/common/compass-port.ts:110-135`, `:160-235`, `:255-275`
- `src/common/compass-port.branch.test.ts:1-115`
- `src/common/splines-path-shared.ts:225-252` (the constrained-theta readers)

## Interface contracts

`compassPort(n, args, pp)` and `polyPort` keep their signatures. `pp.theta`
stays radians, bit-identical to the base except +0 for -0 under BT (AD-2).
`DirectionResult` and `invflipAngle` are module-private; no other file reads
them.

## Acceptance criteria

- Given rankdir=LR and compass `nw`, when `compassPort` runs, then
  `pp.theta` is exactly `1 * 0.25 * Math.PI`.
- Given rankdir=RL and compass `sw`, when `compassPort` runs, then `pp.theta`
  is exactly `-3 * 0.25 * Math.PI` (no RL match, unchanged).
- Given rankdir=BT and compass `e`, when `compassPort` runs, then `pp.theta` is
  `+0` (`Object.is(pp.theta, 0)`).
- Given the 49 smoke ids and the 56 survey ids, when bytediffing base and head,
  then every job is identical.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue153-head.mjs`. Build the base from
`git archive <base>`, extracted under `$TMPDIR`, with `node_modules` symlinked and
`npm run parser:regen`, and copy its bundle to `$TMPDIR/issue153-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue153-base.mjs $TMPDIR/issue153-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue153-bytediff.json
```

Expected: identical on every job.

## Targeted survey

**How the ids were chosen** ([harness/survey-ids.txt](../harness/survey-ids.txt),
56 ids): theta comes only from `compassPort`, and only rankdir changes how
it's computed. [harness/scan-compass.mjs](../harness/scan-compass.mjs) lists
every applicable corpus input whose text has a compass port (`:n` … `:nw`, or
`tailport`/`headport` set to one): 47 ids, all dot, 6 of them LR. The other 9
are corpus inputs with rankdir BT or RL. Two more of those, `2475_1` and
`2621`, were left out: they have no port syntax, so `compassPort` never runs on
them, and they time out at 120 s on both sides. No input has both BT and a
compass port, so the four probes stand in for that case.

```
BD_ENGINES=dot BD_FORMATS=svg,xdot,plain,json,cmapx npx tsx test/tools/bytediff.ts \
  $TMPDIR/issue153-base.mjs $TMPDIR/issue153-head.mjs \
  plans/issue-153-compass-theta-quarter-pi/harness/survey-ids.txt $TMPDIR/issue153-survey.json
for rd in TB LR BT RL; do
  BD_ENGINES=dot BD_FORMATS=svg,xdot,plain,json,cmapx npx tsx test/tools/bytediff.ts \
    $TMPDIR/issue153-base.mjs $TMPDIR/issue153-head.mjs \
    --file plans/issue-153-compass-theta-quarter-pi/harness/probes/compass-$rd.gv \
    $TMPDIR/issue153-probe-$rd.json
done
```

Expected, as at planning: survey 280 jobs, 280 identical, 0 capped; probes
4 × 5 jobs, all identical. A cap is not a diff: re-run a capped job alone with
`BD_CAP_MS=570000` and journal it.

**Head vs native on the probes:** run the oracle preflight, then for each probe
and for xdot, plain and cmapx compare
`GVBINDIR=/tmp/ghl1611 ~/git/graphviz-16.1.1/build/cmd/dot/dot -T<fmt>` with
`npx tsx test/tools/bd-job.ts $TMPDIR/issue153-head.mjs <probe> dot <fmt>`, cut
exactly at `\n--stderr--`. At planning the base equalled native byte for byte
on all 12. The head must too.

## Observability

N/A. C prints nothing here.

## Rollback

Reversible: revert the commit. No format, data or API change.
