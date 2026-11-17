# Mission: issue #175: print -0 in imagemap coords as native's %.0f does

## Objective

Native prints `coords="0,-0,83,59"` for the root graph area in `-Tcmapx`; the
port prints `coords="0,0,83,59"`. The same `-0` appears on cluster and node
areas whose top edge lies on the page top (`pad=0`), and in `-Timap` lines.
Make the port's map coordinates byte-equal to native's there.

**Mechanism (traced at planning, base `5993dc50`, graphviz 16.1.1).** Two
defects, and both must go for the symptom to go:

1. **The value.** C computes every map point with `gvrender_ptf_A`
   (`lib/gvc/gvrender.c:154-175`): `AF.y = (af.y + translation.y) * scale.y`,
   where `translation.y = -clip.UR.y - canvasBox.LL.y / zoom`
   (`lib/common/emit.c:1550-1552`) and `scale.y = zoom * devscale.y`, with
   `devscale.y` negated for `GVRENDER_Y_GOES_DOWN` (`emit.c:3631-3633`). At the
   page top `af.y + translation.y` is `+0`, and `+0 *` a negative scale is
   `-0.0`. lldb at `map_output_shape` on `harness/probes/repro.gv` read
   `AF[1].y = 0x8000000000000000` (exactly `-0.0`). The port's `mapTransform`
   (`src/gvc/anchor.ts:254-259`) uses a reworked form,
   `(bb.ur.y + pad.y - p.y) * scale + marginOff.y`: a positive scale on a
   reversed difference, plus a margin term added after the multiply. It gives
   `+0` (`harness/trace-port.ts` prints `82.66666666666666 0`; the x bits equal
   native's `0x4054aaaaaaaaaaaa`). Even a `-0` there would turn `+0` on the
   `+ marginOff.y` (`-0 + +0` is `+0`).
2. **The text.** C prints with `%.0f` (`plugin/core/gvrender_core_map.c:42-58,
   64, 113-128`). The port's `cmapxCoordsRect`/`Circle`/`Poly`
   (`src/render/map.ts:470-487`) and `mapOutputImap` (`map.ts:517-532`) use
   `Math.round` and `String`. `String(-0)` is `"0"`, `Math.round(-0.3)` prints
   `"0"` where `%.0f` prints `-0`, and `Math.round(2.5)` is `3` where `%.0f`
   gives `2`. `printfFixed(v, 0)` (`src/util/printf-round.ts:101`) matches
   macOS `printf %.0f` on `-0.3`, `-0.5`, `0.5`, `1.5`, `2.5`, `-2.5`, but
   returns `"0"` for an exact `-0` (`harness/printf-check.ts`).

**Evidence ([harness/](harness/)).** Ten probes under dot, neato and fdp in
`cmapx`, `cmapx_np`, `imap`, `imap_np` (120 cases). Native stdout is in
`harness/native/<probe>.gv.<engine>.<fmt>`. On the base, every difference is a
`-0` the port prints as `0`, except three causes outside this issue:
`rotate.gv` (all rows: the port ignores `rotate=90` on maps, filed as #247),
the edge-label area id `edgeN-label` on `nodes.gv`/`labels72.gv` (#177), and
`2258.dot`'s `G2_` id prefix (#176). `margin.gv` is byte-equal everywhere,
because its margin moves the page top off zero. No probe reached an exact `.5`
tie: layouts snap to integers at 72 dpi and give thirds at 96 dpi. So unit
tests carry the half-even case. The partial corpus survey
([harness/survey.md](harness/survey.md)) found the `-0` on `1880.dot` and
`2258.dot`, and nothing else.

Done means: every probe row whose only base difference is `-0` is byte-equal
to native on the head; the rows with #176/#177/#247 lines keep only those
lines; nothing that was byte-equal changes. Type `fix`, a patch release.

**Out of scope:** `rotate=90` on maps (#247); area ids (#176, #177); the
`cmap` and `ismap` formats, which the port does not offer (the issue names the
`ismap` branch, but the port has nothing there to fix); `printfFixed`'s `-0`
contract for its other callers (AD-2); the port's approximation of C's `clip`
(bb ± pad) and `canvasBox.LL` (margin, no centering), kept as it is (AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 5993dc50..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `5993dc509b751868dd2fd5ad7cb94428d9ba6de1` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-175 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-175/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(map): print -0 in imagemap coords as native's %.0f does

  <two to four lines: C maps points with gvrender_ptf_A's negative y scale,
  so the page top is -0.0, and prints them with %.0f; the port reworked the
  transform (giving +0) and printed with Math.round/String>

  Refs: #175
  ```

  Lines ≤ 80, subject ≤ 72, lowercase, no period, no attribution. Never push,
  rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-sign.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-sign.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says; `harness/compare.mjs` imports it. Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) for `dot` and for `neato`
before trusting native output. `config8` was present in both dirs at planning;
a missing one is fixed with `GVBINDIR=<dir> <dot> -c`. The issue has no
`upstream-16.1.1` label. Check `uptime` before gates 5 and 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `5993dc50`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-sign.md#write-set) must change.
   Journal why and stop.
2. `src/render/map.ts` (806 lines at base) or `src/gvc/anchor.ts` (519) would
   end longer than at base. The complexity hook blocks a write that makes a
   file over 500 lines longer. Shorten within the same file (comments,
   joined lines). If that is not enough, stop: a split is a refactor this
   mission does not own.
3. A probe row or survey row that was byte-equal to native on the base differs
   on the head, or a changed line on the head does not equal native's line.
   Write the diagnosis artifact and stop.
4. After the fix, a probe row whose only base difference was `-0` still
   differs. Diagnose it to a mechanism, then stop. Do not patch the formatter
   to force the sign.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong,
   for example a nonzero coordinate changing its last bits in a way that
   moves an output away from native.

## Push-forward (decide alone, journal it)

- Helper and test names, comment wording, how `buildMapCtx` lays out the
  translation, within the write-set and the line limits.
- More probes in `harness/extra/` to settle a path the ten do not reach (a
  `size=` that zooms, a nonzero `margin` with `pad=0`, an exact `.5` tie).
- A probe or survey row that differs for a reason older than this change
  (stdout differs on base and head in the same lines): note it and link or open
  a `follow-up` issue (queue rules).
- If another `printfFixed` caller's C counterpart prints `%.Nf` raw (so it
  would print `-0`), open a `follow-up` issue naming it. Do not change it here
  (AD-2).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-sign.md](batch-1/T1-sign.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the ten inputs |
| [harness/native/](harness/native/) | native 16.1.1 stdout per probe, engine and format |
| [harness/compare.mjs](harness/compare.mjs) | native, base and head per input, engine and format |
| [harness/trace-port.ts](harness/trace-port.ts) | the port's graph-area points with the sign of zero |
| [harness/printf-check.ts](harness/printf-check.ts) | `printfFixed(v, 0)` against `Math.round` |
| [harness/survey.md](harness/survey.md) | the planning-time corpus sweep (partial) |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where a map coordinate is computed and printed |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-175.md` only for something novel. Otherwise, say in
  the journal row that nothing was novel.
- The final message ends with the driver's status line.

## Summary (2026-11-17)

- **Tasks:** 1 of 1 (T1).
- **Result:** the 44 probe rows whose only base difference was `-0` are
  byte-equal to native 16.1.1. So are `1880.dot` (dot, neato, fdp) and
  `graphs-url` under patchwork. `2258.dot` keeps only its #176 lines, and
  `nodes`, `labels72` and `graphs/url.gv` only their #177 lines.
- **Decisions:** 18 journal entries. Three are flagged for review: entry 3 (the
  probe cases read the harness files, not inlined), entry 7 (**AD-1 replaced in
  part**: `MapCtx` carries `pageBox`, and the translation comes from C's clip
  through `setupPageClip`, because native's `-0` on x in `size.gv`/fdp comes
  from `job->pageBox` against `job->clip`) and entry 14 (#248).
- **Gates:** typecheck, `npm test` (13974), golden gates 5/5, corpus and docs,
  smoke bytediff (1953 of 1960 identical; 7 changed, all `graphs-url` cmapx),
  targeted survey (308 rows; none away from native, none lost). See entries
  12-15.
- **Open:** #248 (`needs-ruling`): the `rotate.gv` probe's six cmapx rows and
  `graphs-url`/sfdp/cmapx changed (`0` to `-0` on the root line) on lines an
  older cause keeps different from native (#247, accepted sfdp drift).
  Unchanged and still open: #176, #177, #247.
- **Files beyond the planned write-set:** `src/gvc/viewport.ts`
  (`setupPageSize`, `setupPageBox`), `harness/extra/` scripts and probes.
