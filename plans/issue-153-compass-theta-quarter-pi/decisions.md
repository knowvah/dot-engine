# Decisions: issue #153

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #153 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: theta travels in quarter-pi integer units, as 16.1.1 holds it

- **Decision:** port upstream `54360ff3b` exactly, as it is at
  `~/git/graphviz-16.1.1/lib/common/shapes.c:2605-2637` (`invflip_angle`) and
  `:2698-2863` (`compassPort`):
  - `DirectionResult.theta` holds C's `int theta` (comment: "in units of ¼×π").
    The per-direction helpers set `e 0, ne 1, n 2, nw 3, w 4, sw -3, s -2,
    se -1`; `_`, `c`, the default and an unrecognized compass stay `0`.
  - `invflipAngle(angle, rankdir)` takes units and returns radians:
    TB no change; BT negate (AD-2); LR `angle -= 2`; RL the integer table
    `4→-2, 3→-1, 2→0, 0→2, -1→3, -2→4`, anything else unchanged. It returns
    `angle * 0.25 * Math.PI`, evaluated left to right as C does
    (`(angle * 0.25) * M_PI`).
  - Keep `invflipAngleRL` as its own function (the complexity hook's limits);
    keep the names; update the `@see` lines to 16.1.1's numbers (`invflip_angle`
    at `shapes.c:2607`, `compassPort` at `:2698`).
- **Why:** the issue asks for it, CLAUDE.md keeps C's types and branches, and
  the float `===` comparisons in `invflipAngleRL` are the fragile code upstream
  removed.
- **Rejected:**
  - Keeping radians and only changing `invflipAngleRL` to compare against
    integers. That's not C's data flow, and half-converted code is worse to read.
  - A lookup table from (compass, rankdir) to radians. It merges two C functions
    and drops the RL branch structure.
- **Evidence (planning):**
  [harness/theta-identity.mjs](harness/theta-identity.mjs) evaluates the old
  and new formulas for 9 compass values × 4 rankdirs with `Object.is`. 34 of 36 are
  bit-identical: every product `k * 0.25 * π` the old code built by subtraction
  is exact in IEEE double, because `π`'s significand ends in `…1000` binary, so
  `3π/4` and `5π/4` need at most 52 significant bits. The two exceptions are
  AD-2's.

### AD-2: rankdir=BT on theta 0 yields +0, not -0

- **Decision:** write the BT negation so a zero stays +0, as C's `int` does:
  `a = 0 - a`, with a comment saying why (`-a` and `a *= -1` give `-0` in JS).
  Do not use `-a`.
- **Why:** C 16.1.0 negated a double (`angle *= -1` on `0.0` gives `-0.0`), and
  the port copied that. 16.1.1 negates an `int`, so `0` stays `0`, and
  `0 * 0.25 * M_PI` is `+0`. This is the only bit the change moves: BT with
  compass `e` (constrained, so `beginpath`/`endpath` read the theta), and BT with
  `c`, `_`, an unrecognized compass or the default (unconstrained, so theta is
  never read).
- **Reach:** a constrained theta reaches `routesplines` as the tangent
  `(cos θ, sin θ)` (`src/common/splines-routespl.ts:397-400`); `sin(-0)` is
  `-0`. The four probes in [harness/probes/](harness/probes/) include `c:e` and
  `b:e` under BT; base and scratch head are byte-identical on all 5 formats. No
  corpus input has BT and a compass port ([harness/scan-compass.mjs](harness/scan-compass.mjs)).
  The only other reader is the `printpath` debug dump
  (`splines-routespl.ts:165`, `tangent angle: %.5g`), which 16.1.1 now prints as
  `0` there.
- **Rejected:** `-a | 0`. It works, but `| 0` reads as a truncation the C
  doesn't have.

### AD-3: C's direction table, not the issue's

- **Decision:** use the values in `shapes.c` at 16.1.1: `n 2`, `ne 1`, `nw 3`,
  `s -2`, `se -1`, `sw -3`, `e 0`, `w 4`.
- **Why:** the issue body lists `se:1, s:2, sw:3, ne:-1, n:-2, nw:-3`, which has
  the sign reversed for the north and south families. The C is the spec
  (CLAUDE.md). The port's current radians agree with the C (`n` is `+π/2`), and
  `compass-port.test.ts`'s header already records that north is `+π/2`.
- **Action:** the #153 comment at session end says the body's table is
  reversed for the north and south families.

### AD-4: no output changes, so no corpus records change

- **Decision:** expect byte-identity, base to head, on every bytediff. Edit no
  `test/corpus/*` record and no `docs/known-divergences.md` entry.
- **Why:** AD-1's evidence, the probes, and the planning survey (README
  Evidence). #147's classification also found no id that changed verdict
  because of upstream `54360ff3b` (issue comment).

## Baseline

Measured at planning on `74b09d00`, load 7-17:

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 579 files, 13584 passed, 18 expected fail |
| `bash test/golden/gates.sh` | 5/5 PASS |
| `npx vitest run test/corpus test/docs` | 25 files, 2863 passed |

## Rollback

Reversible: revert the squashed commit. No data, API or format change;
`invflipAngle` and `DirectionResult` are module-private.
