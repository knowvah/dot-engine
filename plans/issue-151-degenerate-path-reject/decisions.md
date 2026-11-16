# Decisions: issue #151

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-16. #151 is the lowest-numbered open `queue:ready` issue. Its one
blocker, #147, is closed. No issue is `queue:planned`. Nobody confirmed these
decisions. Each one names the rejected options and the evidence, so the
maintainer can audit it.

### AD-1: widenPathBoxes skips slots at or past P.nbox

- **Decision:** in `widenPathBoxes` (`src/layout/dot/edge-route-faithful.ts:289`),
  the loop over `fb-1..lb` skips any `i >= P.nbox` before it reads `P.boxes[i]`.
  A comment states why: C writes those slots in its preallocated array, and no
  reader looks at them. The second loop (`overlapPathBoxes`) is already bounded
  by `P.nbox`, and stays as it is.
- **Why it is equivalent to C:** every C reader of a path's boxes is bounded by
  `nbox`. The audit, a grep of `P->boxes`/`pp->boxes`/`p->boxes` in
  `lib/dotgen/*.c`, `lib/common/splines.c` and `lib/common/routespl.c` at 16.1.1,
  found these readers:
  - `routesplines_` passes `pp->nbox` as `boxn` (`routespl.c:314-317`);
  - `checkpath`, `limitBoxes` and the routing that follows are bounded by `boxn`;
  - `printpath` reads `< pp->nbox` (`:765`);
  - `recover_slack` reads `b < p->nbox` and breaks when `b >= p->nbox`
    (`dotsplines.c:2074-2077`);
  - `adjustregularpath`'s second loop reads `i + 1 < P->nbox` (`:2007`);
  - `showpath` (DEBUG only) reads `< p->nbox`.

  `add_box` (`splines.c:316`) overwrites slot `nbox` before it increments
  `nbox`, so a slot written while dead never becomes live with that value.
  `adjustregularpath`'s first loop reads and writes only `bp1 = &P->boxes[i]`,
  so a dead slot never feeds a live one.
- **Rejected:**
  - Preallocating `P.boxes` with zero boxes as `dotsplines.c:338` does. The three
    `Path` literals would change (`edge-route-faithful.ts:388`,
    `edge-route-chain.ts:113`, `splines-flat.ts:525`), and so would their
    sizing. Nothing reads
    the extra slots, so it buys nothing.
  - Guarding on `P.boxes[i] === undefined` only. In a chain walk, `P` is reused
    across segments, so stale slots past `nbox` hold box objects. `addBox` stores
    references where C copies values, so mutating a stale object can reach a box
    that is still live elsewhere. C cannot do that. Skipping at `nbox` cannot
    either.
- **Evidence:** [harness/detector.sh](harness/detector.sh) found 0 widening reads
  past `nbox` on the 49 smoke ids. So the guard changes nothing there, and gate 5
  checks that.

### AD-2: checkPath rejects an all-degenerate path with printPath

- **Decision:** in `checkPath` (`src/common/splines-routespl.ts:168`), right after
  `removeDegenerateBoxes`, add:

  ```ts
  if (bn === 0) {
    agerrorf('in checkpath, all bounding boxes are below threshold');
    printPath(pp);
    return true;
  }
  ```

  `printPath(pp)` is a new non-exported function in the same file,
  `@see lib/common/routespl.c:printpath`. It writes `routespl.c:763-775`'s lines
  with `console.error`, one call per line:

  - `${pp.nbox} boxes:`
  - for each `bi < pp.nbox`: `${bi} (llx, lly), (urx, ury)`
  - `start port: (x, y), tangent angle: θ, constrained|not constrained`
  - `end port: (x, y), tangent angle: θ, constrained|not constrained`

  Each double goes through `gfmt5` (`src/render/dot/xdot-ops.ts:345`, C's
  `%.5g`). Each `size_t` prints as a plain integer.
- **Why `console.error`, not `agerr`:** C's `printpath` is `fprintf(stderr)`, so
  it bypasses `agseterrf`'s `usererrf`. `src/common/agerr.ts:5-6` keeps
  `fprintf(stderr)` sites off the agerr writer. `console.error` puts the lines on
  the same channel as the `Error:` line just before them, and
  `src/ortho/partition.ts:282` sets that precedent for `fprintf(stderr)`.
- **Rejected:**
  - `console.warn`, which pathplan's `prerror` ports use. It would split one
    native message block across two browser channels.
  - Exporting `printPath`. It has one caller in C (`checkpath`), and it is static
    there.
  - A local `%.5g` formatter. `gfmt5` is already C's `%.5g`, with half-to-even
    ties and a two-digit exponent: `7.286e+17` matched native on all 7 ids at
    planning. `src/common` already imports from `src/render`
    (`htmltable-emit-fill.ts`, `poly-gencode.ts`), and no fitness test forbids it.
- **Evidence:** on the scratch copy, the port's stderr equals native's line for
  line on `2773`, `2773_1`, `2774`, `2774_1`, `2776`, `2778` and `2780`
  ([harness/native-stderr.txt](harness/native-stderr.txt)).

### AD-3: the other two checkPath failures are a follow-up

- **Decision:** leave `checkPath`'s two existing `return true`s (box 0, and box
  `bi+1`, `has LL coord > UR coord`) without their `agerrorf` and `printpath`.
  Open a `follow-up` issue that names `routespl.c:654-666` (the `agerrorf` calls at `:656` and `:663`) and says `printPath`
  now exists.
- **Rejected:** adding them now. #151 defines done as the new branch. Giving
  them their messages would change stderr on whatever ids reach them, and no
  reach check was run for those ids. The queue rules route new defects to
  `follow-up` issues.

### AD-4: the ledger and corpus records stay as they are

- **Decision:** no edit to `docs/known-divergences.md`. Its 16.1.1 table row for
  #151 names `2778` (`:1291`). No edit to its locale copies or to
  `test/corpus/*`.
- **Rejected:** dropping the #151 row now. The table's rows come from the
  maintainer's full survey over the branch. The #149 and #150 missions left their
  rows for the same reason.

### AD-5: 2776_1 waits on #162

- **Decision:** `2776_1` is in the targeted survey, but it is not expected to
  equal native. Native 16.1.1 stops with `Edge length 300000000000000000.000000
  larger than maximum 2147483647 allowed.` and writes a 1030-byte SVG. The port
  does not port that check yet (#162). At planning, the scratch head went from
  THROW to a full render: the #151 lines first, then the edge-length error
  printed after routing. Record it in the report as "changed, not toward native,
  waits on #162". It is not a halt: it is not a smoke id, and the base already
  differed from native (THROW against exit 1).
- **Rejected:** keeping the throw for `2776_1` alone. That would mean special
  code with no C counterpart.

## Baseline

Green on `c558762c` at planning:

- `npm run typecheck`: exit 0.
- `npm test`: 577 files, 13561 passed, 18 expected fail.
- Oracle: `/tmp/ghl1611/config8` and `/tmp/ghl1611-all/config8` are present.
  Native 16.1.1 ran on all 8 ids.

The project has no lint script. The golden and corpus gates were not run at
planning: the tip is the #150 mission's verified head, whose journal row records
them green.

## Rollback

Reversible: revert the one squashed commit. No data, API, format or dependency
change. No exported signature changes. Behaviour changes only for a path whose
boxes all drop, which used to throw.

## Operational readiness (auto-confirmed)

A browser library, not a service, so there are no SLIs, alerts, dashboards or
on-call story. The one new observable is three-plus stderr lines on
`console.error`, for an input that threw before. A consumer that set
`agseterrf` does not receive the `printpath` lines, just as a C `usererrf` does
not.
