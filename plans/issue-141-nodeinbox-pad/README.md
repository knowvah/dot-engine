# Mission: issue #141: the node_in_box pad follows the device

## Objective

C picks the job's pad per render device. `init_job_pad` (`lib/common/emit.c:3290-3304`)
takes the graph's `pad=` when it is set, and otherwise the render plugin's
`features->default_pad`. That value is 4 for svg (`plugin/core/gvrender_core_svg.c:810`)
and map (`gvrender_core_map.c:244`), and 0 for dot, canon, plain and xdot
(`gvrender_core_dot.c:734,745`) and for json and json0 (`gvrender_core_json.c:745`).
`setup_page` derives `job->clip` from the padded bb, and `emit_node` gates every node on
`node_in_box(n, job->clip)` (`emit.c:1808`).

The port has no per-device pad. Three places try to make up for it:

1. `render` (`src/gvc/device.ts:456`) sets `job.pad = parseGraphPad(...)`, which falls
   back to the svg constant `SVG_PAD` = 4 (`src/gvc/viewport.ts:106`) on every device.
2. `deviceClip` (`src/gvc/emit-xdot.ts:39-44`) works out its own pad: `job.pad` for
   svg, and `pad=` or 0 for every other renderer. That makes the map renderers' clip
   pad 0 where C's is 4.
3. `nodeInBox` (`src/gvc/emit-gates.ts:49-55`) skips `job.clip` and builds
   `job.bb ± job.pad`. On xdot and json the node gate therefore uses pad 4 where C uses 0.

The fix ports `init_job_pad`. Each renderer states its `defaultPad`, as C's render
features do. `render` resolves `job.pad` from `pad=` or that default. `deviceClip` uses
`job.pad`. `nodeInBox` reads `job.clip`, as C's call passes `job->clip`. See
[decisions.md](decisions.md) AD-1..AD-4.

**Planning evidence (16.1.0):** no native input found shows the difference. A node has to
lie outside `GD_bb` and within 4 pt of it. `compute_bb` and `dot_compute_bb` cover every
node. neato `-n` recomputes the root bb even when `bb=` is given
(`lib/neatogen/neatoinit.c:556`). On corpus `2825` (degenerate bb after the dot abort),
native draws no node in either svg or xdot. The done-when allows "a note that none exists".
T1 still has to search for a probe ([T1](batch-1/T1-node-in-box-pad.md#probe)), and a
unit test shows the port difference on a hand-built job.

**Done when:** the four changes; unit tests for the per-device pad, the clip and the node
gate on xdot, json, svg and cmapx; the native-probe result (a fixture with refs, or the
note); follow-ups README item 155 marked DONE; gates green with every changed output equal
to native. Commit type `fix`.

**Out of scope:**
- `page=` pagination, `pageBox` (`emit.c:1542`), and the GVDEVICE_EVENTS clip branch.
  The port has none of them.
- The `job.scale`/`job.zoom` paths beyond what `job.pad` feeds them. If xdot or json
  output reads `job.scale`, stop (stop condition 1).
- The `margin` defaults (`init_job_margin`). They are device-specific in C too, but
  that is a separate defect. File a `follow-up` if it is wrong.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline ca9c09f3..`.
4. Read `.agent-notes/issue-129.md` (non-dot plugin dirs, `.mts` temp scripts).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `ca9c09f37f03dd3a9422ae1885f1170dafc36baa` (the tip at planning time). If
  the tip has moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-141 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-141/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(gvc): take the job pad from the render device as init_job_pad does

  C resolves job->pad from pad= or the render plugin's default_pad:
  4 for svg and map, 0 for dot, xdot, plain and json. The port used
  the svg 4 everywhere; deviceClip patched xdot back to 0 by renderer
  type, which left map at 0, and nodeInBox rebuilt bb +/- job.pad
  instead of reading job.clip, so xdot and json gated nodes with
  pad 4. Renderers now state defaultPad, render resolves job.pad from
  it, deviceClip uses job.pad and nodeInBox reads job.clip.

  Refs: #141
  ```

  Add a gates line to the body as #139's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-node-in-box-pad.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-node-in-box-pad.md#targeted-survey) | no head-only regression against native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` for dot. Other engines need a plugin dir under `$TMPDIR`,
built per `.agent-notes/issue-129.md`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
for each dir and engine before trusting native output. Check `uptime` before gates 5-6;
above 12, wait.

Baseline at planning: typecheck and `npm test` green on `ca9c09f3`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change. One exception: an existing test that
   builds a `RenderJob` by hand and relies on `nodeInBox` reading `job.bb ± job.pad`. Set
   its `job.clip` to that same box, keep what it expects, and journal it.
2. The same gate check fails twice in a row after fix attempts. Diagnose it to a stated
   mechanism, journal it, and stop.
3. The smoke bytediff or the targeted survey shows a changed output that does not equal
   native. Halt per the queue rules.
4. `job.pad` turns out to feed xdot, dot, plain or json output through some path other
   than the clip (for example `job.scale`). Stop with the path.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test file names and helper shape (mirror `device-styling.test.ts` AC17).
- Comment wording in the touched doc comments.
- Whether `SVG_PAD` stays as the svg renderer's constant or moves next to the renderer.
- Which extra corpus ids join gate 6, within the rule in T1.
- Filing a `follow-up` issue for an unrelated native difference that the survey shows on
  base and head alike, or for a wrong `margin` default.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-node-in-box-pad.md](batch-1/T1-node-in-box-pad.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | pad → clip → node gate |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism, files, gates.
- Write `.agent-notes/issue-141.md` with the native-probe result (which paths can put a
  node outside `GD_bb`) and anything else novel. Otherwise state that nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** 16 journal rows. For review: a native probe exists (the planning note said none),
  so the done-when is met with fixtures and refs; `deviceClip` lost its `renderer` parameter;
  two files outside the planned write-set changed (`dot.branch.test.ts`, `job.ts` comments);
  AD-4's visible change for third-party renderers.
- **Gates:** 1 typecheck green; 2 `npm test` green (566 files, 13411 tests); 3 `gates.sh` 5/5 after
  one fix to `map.ts`'s line count; 4 corpus and docs green; 5 smoke bytediff 1960 of 1960
  identical; 6 survey 108 of 108 identical, and 20 of 20 probe rows equal native on the head.
- **Follow-ups filed:** #198 (plain's `graph` scale ignores `pad=`), #199 (json subgraph `nodes`
  order). Neither is fixed here.
- **Stop:** done.
