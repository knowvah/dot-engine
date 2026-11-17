# Decisions: issue #175

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17. No issue was labelled `queue:planned`. #175 was the
lowest-numbered open `queue:ready` issue, and it has no "Blocked by"
references. Nobody confirmed the decisions below. Each one names the options it
rejected and the evidence, so the maintainer can audit it.

Filed during planning (queue rules, new defects): #247 (map coordinates ignore
`rotate=90`).

### AD-1: `mapTransform` takes C's `gvrender_ptf_A` form

- **Decision:** `MapCtx` (`src/gvc/anchor.ts:243`) carries `translation: Point`
  and a signed `scale: Point` in place of `scale: number` and `marginOff`.
  `buildMapCtx` (`src/render/map.ts:612`) fills them as `setup_page` does in
  the non-rotated `GVRENDER_Y_GOES_DOWN` branch, with the port's existing
  stand-ins for `clip` and `canvasBox.LL`:
  `translation.x = -(bb.ll.x - pad.x) + margin.x / zoom`,
  `translation.y = -(bb.ur.y + pad.y) - margin.y / zoom`,
  `scale = { x: zoom * devscale, y: zoom * -devscale }` (`devscale` =
  dpi / 72, negated on y as `emit.c:3632-3633` does). `mapTransform` becomes
  `applyScale(p, translation.x, translation.y, scale.x, scale.y)` from
  `src/gvc/device-transform.ts`, which already ports `gvrender_ptf`'s
  no-rotation branch. `@see lib/gvc/gvrender.c:gvrender_ptf_A ;
  lib/common/emit.c:setup_page (1548-1555)`.
- **Rejected:** a formatter-only fix. The port's value at the formatter is `+0`
  (`harness/trace-port.ts`), so a sign-keeping formatter alone prints `0`.
- **Rejected:** flipping the sign of a zero result inside the current
  `mapTransform`. C has no such step. It would also stay wrong where the
  current form's association differs from C's (margin added after the
  multiply).
- **Rejected:** porting `setup_page`'s whole `clip`/`focus`/`pageSize`/
  `canvasBox` derivation, and its rotation branch. That is larger than this
  issue. Rotation is #247. The `clip` stand-in (bb ± pad) is the port's current
  behaviour, and conformance on the map corpus is 100% with it
  (`test/corpus/PARITY-MAP.md`).
- **Risk:** with `margin` nonzero, or `bb.ll.x` nonzero, the new association can
  move a nonzero value's last bit. A printed integer changes only if that value
  sits on a `.5` boundary. Any change must equal native (stop conditions 3 and
  6). With zero margin the y value is bit-identical up to the sign of zero:
  `p.y + -(T)` is exactly `-(T - p.y)`.
- **Evidence:** lldb trace of native `map_output_shape` (README); C source at
  the lines named; the base's 120 probe rows.

### AD-2: a `%.0f` helper beside `printfFixed`; `printfFixed` unchanged

- **Decision:** add `printfFixed0(v: number): string` to
  `src/util/printf-round.ts`: C's `%.0f`, that is `printfFixed(v, 0)` except
  that an exact `-0` prints `-0`. Use it for every coordinate in
  `cmapxCoordsRect`, `cmapxCoordsCircle` (the radius too, as
  `printfFixed0(pts[1].x - pts[0].x)`, the same subtraction C does),
  `cmapxCoordsPoly` and `mapOutputImap`. `@see
  plugin/core/gvrender_core_map.c:map_output_shape`.
- **Rejected:** changing `printfFixed`'s `-0` result. Its contract is "mirrors
  `toFixed` on every non-tie input", a unit test pins `printfFixed(-0, 2)` as
  `'0.00'`, and its callers (`job.ts` `gvprintdouble`, `layout-bb.ts`,
  `position-aux.ts`, `xdot-ops.ts`) each have their own C formatter. Changing
  it would reach outputs this issue does not cover. Push-forward: a caller
  whose C prints raw `%.Nf` becomes a `follow-up` issue.
- **Rejected:** a private helper in `map.ts`. The file is 806 lines and may not
  grow (stop condition 2). `printf-round.ts` (169 lines) is where the port's C
  printf formatting lives.
- **Evidence:** `harness/printf-check.ts` against macOS `printf '%.0f'`:
  `-0 0 -0 -0 0 2 2` for `-0 0 -0.3 -0.5 0.5 1.5 2.5`.

### AD-3: the map comparator stays numeric; its header comment is corrected

- **Decision:** `test/golden/compare-map.ts` keeps comparing parsed numbers, so
  `-0` equals `0` there. This mission's evidence is byte equality (the probe
  harness and the gate-5 bytediff). Only the header comment changes: it says
  the port rounds with `Math.round` (lines 11-21), which stops being true.
- **Rejected:** a sign-aware comparator. The project's bar is structural match
  at a tolerance (CLAUDE.md); a stricter map comparator is a separate decision
  for the maintainer.
- **Evidence:** `compare-map.ts:100-139` (`extractNumbers`, `compareCoords`);
  `PARITY-MAP.md` reports 100% with the `-0` difference present.

### AD-4: one task; new tests in a new file

- **Decision:** a single task T1: red tests, the fix, the gates, the squash. New
  tests go in `src/render/map-coords-sign.test.ts` (new). It holds unit cases
  for `printfFixed0`, the three cmapx coordinate formatters and
  `mapOutputImap` (`-0`, `-0.3`, `2.5`), plus probe cases that render each
  `-0` probe through `render(parse(src), fmt, { engine })` and compare with
  native stdout, inlined with a provenance comment. The existing `MapCtx`
  fixtures in `src/render/map-renderers.test.ts` and
  `src/gvc/anchor.branch.test.ts` change to the new shape.
- **Rejected:** adding the cases to `map.test.ts` (447 lines) or
  `map.branch.test.ts` (666). The complexity hook also checks `src/**/*.test.ts`
  and blocks growth past 500 lines.
- **Rejected:** separate diagnose and fix tasks. Planning traced both
  mechanisms on both sides. The journal still records the artifact.
- **Evidence:** `wc -l` at base; `~/.claude/hooks/check-complexity.py:57-61,
  227-241` (skip dirs, directional line rule).

## Baseline

At `5993dc50` on 2026-11-17: `npm run typecheck` exit 0. `npm test`: 591
files, 13874 tests, all passed. There is no lint script, so typecheck is the
lint bar.

## Rollback

Reversible: revert the one squashed commit. It changes the text of `cmapx`,
`cmapx-np`, `imap` and `imap-np` output only (a `-0` where native has one). No
API, data or other format change.

## Operational readiness

A library, so there are no SLIs, dashboards or on-call. Library users see `-0`
in imagemap coordinates where native graphviz prints it. Browsers parse
`coords` numerically, so the rendered map is unchanged. Backwards compatible:
`MapCtx` is internal (not exported from `src/index.ts`).
