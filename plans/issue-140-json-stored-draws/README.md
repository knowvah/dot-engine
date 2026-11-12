# Mission: issue #140: json prints stored draw strings for undrawn objects

## Objective

Issue #140 (follow-ups item 154, part 11 T7b) says `-Tjson` reads only this render's draw
strings (`drawStringsByObject`, `src/render/json.ts`), where C prints the `_draw_`/`_ldraw_`
an earlier render or the input stored. **Done when:** a no-free second json render of a
graph with undrawn objects equals native.

**Planning found no defect: the done condition already holds at the base.** The C path:
`write_attrs` prints `agxget` values (`plugin/core/gvrender_core_json.c:342-362`), and the
inner xdot render agxsets only non-empty buffers (`gvrender_core_dot.c:237-291`). An
undrawn object therefore prints what was stored before. The port reaches the same
values two ways. (1) `emitAttrs` (`json.ts:397-419`) starts from the object's own
attributes, which hold the input values and the previous render's write-back. (2) Since
T7b's (A), the overlay is the re-parsed xdot text, which prints `renderedDraws`
(`src/render/dot/write-back.ts:136-146`), stored strings included. `drawStringsByObject`
is only a lossless overlay for objects drawn in this render (`json.ts:263-279`). The
issue's premise comes from the doc comment at `src/render/dot.ts:107`, which calls the
side table "what `-Tjson` reads via agxget".

Planning evidence (16.1.0 oracle `/tmp/ghl`, preflight passed; refs in
[harness/out/](harness/out/), made by [harness/regen.sh](harness/regen.sh)):

- `hidden.gv` through [harness/hide-render.c](harness/hide-render.c): layout, render xdot
  (or json), set `style=invis` and `color=red` on every node and edge, render json again.
  Native's render 2 prints render 1's black strings, `\"` and `\` label text included. The
  port is equal on every object and key, and was equal before T7b too (tree at
  `aba5ad4f`).
- `stored-input.gv`: input draw strings on an invisible node, edge and cluster, a
  non-cluster subgraph with `_draw_`/`xdotversion`, and text with `\"` and `\`. The port
  equals native.
- `subg.gv` in `subnofree` mode (part-10 `subg-after-free.c`): render 3 prints the
  `_draw_` and `xdotversion` that subgraph `s` kept from render 2. The port equals native.
  `nofree`, `root` and `twice`, for `s` and `cluster_k`, were equal too.
- **Mutation check:** a scratch copy where json takes draw keys only from this render's
  side table fails all three fixtures (6 diffs on `stored-input`, 7 on each `hidden`
  render 2, `s._draw_` on `subg` render 3). So the fixtures catch the defect the issue
  describes.

Done means: a regression test pins the done condition against those native refs, and
the mutation check is repeated and journalled. The two comments that misname the source
are corrected. Item 154 is marked done with "no defect". The drafted viewport follow-up
is filed. Gates are green. Type `test`.

**Out of scope:** `viewport` (not ported in any renderer:
[followup-viewport.md](followup-viewport.md)), `nodeInBox`'s svg pad on xdot (#141),
cluster `_draw_` with inf/nan points (#144), and json key order.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 2b03bae9..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `2b03bae9d93e85151d9b8b59d9ce2b4de98694e5` (tip at planning). If the tip
  moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-140 brief` (this
  directory), then `test(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-140/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  test(json): pin stored draw strings on undrawn objects

  Follow-up 154 said -Tjson prints only this render's draw strings. It
  does not: emitAttrs starts from the object's own attributes, which hold
  the input and the last write-back, and the re-parsed xdot overlay prints
  renderedDraws. So an object this render does not draw prints what was
  stored, as write_attrs prints agxget values. Native refs now pin a
  hidden-object second render, input draw strings and a subgraph's kept
  _draw_ and xdotversion. Two comments named the side table as the source.

  Refs: #140
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-json-stored-draws.md#bytediff) | 0 changed jobs (comments only) |
| 6 | Targeted survey | see [T1](batch-1/T1-json-stored-draws.md#targeted-survey) | 0 draw-key diffs vs native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot` (16.1.0),
plugin dir `/tmp/ghl` (dot engine only; every fixture and survey row uses dot). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) before trusting native output; a missing
`config8` is fixed with `GVBINDIR=/tmp/ghl <dot> -c`. Check `uptime` before gates 5 and
6, and wait while it is above 12. Load was 37 at planning.

Baseline at planning: typecheck and `npm test` green on `2b03bae9`
([decision-journal.md](decision-journal.md)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`: the premise is in doubt. Stop with the diff.
4. The new test fails on the base, or the mutation check does not make it fail: the
   no-defect finding is wrong. Stop. The issue then needs a fix brief, not this one.
5. Gate 5 shows any changed job, or gate 6 any diff on head that the base does not have.
6. A comment edit would grow `json.ts` past 722 lines or `dot.ts` past 503, or the
   complexity hook blocks the edit.

## Push-forward (decide alone, journal it)

- Test names, helper shape, and how objects are keyed (name, `_gvid`, edge order).
- Comment wording, within AD-2.
- Adding a fixture or survey input that reaches an undrawn-object path the planned ones
  do not (e.g. `layerselect`), with a native ref from `regen.sh`.
- Filing a `follow-up` issue for an unrelated native difference seen on base and head
  alike.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-json-stored-draws.md](batch-1/T1-json-stored-draws.md) | the task |
| [harness/](harness/) | fixtures, C driver, `regen.sh`, native refs in `out/`, survey probe and ids |
| [followup-viewport.md](followup-viewport.md) | draft issue: `viewport` is not ported |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where json's draw strings come from |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): the finding with its
  mechanism, files, gates.
- `.agent-notes/issue-140.md`. Candidate observation: a follow-up written from a doc
  comment, never probed, turned out false. Probe a follow-up's premise against native
  before planning a fix. Otherwise state that nothing was novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1).
- **Outcome:** the issue's premise does not reproduce: json prints stored draw strings
  through `emitAttrs`'s base and the re-parsed xdot text. Five native-ref cases pin it
  (`src/render/json-stored-draws.test.ts`), and the mutation check fails all of them.
- **Open rows, for the maintainer:** a labelled cluster's or root's `_ldraw_` when the
  label buffer is empty (invisible cluster, `"\n"` label). C clears it; the port's xdot
  writer keeps the stored string, and json repeats it. This includes a no-free second
  json render after a labelled cluster is hidden, so the done condition does not hold
  there. Diagnosed, not fixed (xdot-writer change, out of this `test` brief): **#196**,
  `needs-ruling`. Three more test cases pin the exact differing rows.
- **Decisions:** 10 journal rows. For review: the #196 finding and the choice not to fix
  it here; item 154's wording ("no defect as written" plus the open rows); one added
  fixture (`empty-buffer.gv`).
- **Issues filed:** #196 (cluster/root `_ldraw_`), #197 (`viewport` not ported).
- **Gates:** 1-6 green. Gate 5: 1960 jobs identical. Gate 6: 30 of 32 native-ref rows
  with 0 draw-key diffs; `1435` and `2239` differ in coordinates on base and head alike
  (registered); 8 rows have no native ref.
