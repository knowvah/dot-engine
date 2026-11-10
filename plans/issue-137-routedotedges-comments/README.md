# Mission: issue #137: retire references to the removed routeDotEdges backstop

## Objective

Part 11 T8 (`plans/post-16-1-followups-11/decision-journal.md`, T8 row) deleted the
port-only `routeDotEdges` backstop from `finalizeSplines` and the `edge-order.ts` module
that only the backstop used. Five places still give the backstop, or `edge-order.ts`, as
the reason for what they do (planning grep over `src test docs`; no other hits):

| Site (base `9466ec3f`) | Says | True now |
|---|---|---|
| `src/layout/dot/splines-flat-labeled.ts:153-154` | mark `lost` so "the routeDotEdges backstop" does not route the edge again | the reader is `routeLoneEdge`'s `lost` skip (`edge-route.ts:464`). The flat group loop calls it for each member (`splines-groups.ts:121`) |
| `src/model/edgeInfo.ts:175-177` | `lost` exists "so the routeDotEdges backstop does not re-attempt" | same reader; `beginRoutingPass` clears `lost` per pass (`edge-route-rank.ts:125,133`) |
| `src/render/svg.ts:117-119` | the spline is on `e.info.spl` "only after layout has run routeDotEdges" | after layout has routed the edges (the renderer is engine-generic) |
| `src/util/bsd-qsort.ts:11` | `edge-order.ts` as the example of a comparator that never ties | the module is gone |
| `src/layout/dot/splines-flat.ts:372-376` | the chain edge routes in routeDotEdges after `dotSplines_`'s label pass, so labels are placed again here | `dotSplines_` routes every collected edge in its group loop, and `finalizeSplines` already runs `placeRegularEdgeLabels` afterwards (`splines.ts:488`). The extra call at `:376` repeats it with unchanged vnode coords |

The last row is code, not only a comment. C's `make_flat_adj_edges` runs
`dot_splines_(auxg, 0)` and then `dotneato_postprocess(auxg)` with nothing in between
(`lib/dotgen/dotsplines.c:1236-1240`). The port inserts `placeRegularEdgeLabels(aux.auxg)`
(added by `2e13de28`, DOT-12). The only reason given for it was the backstop. Planning read
it as a no-op now: `placeVnlabel` (`splines-label.ts:69-80`) sets `l.pos` from the vnode's
coord and `labelXPos`, and `updateBB` only grows the box. Between the two calls only
`placePortLabels` and `setState` run, and neither moves a vnode. AD-1 removes the call
and requires byte-identical output to show it.

Done means: none of the five sites names `routeDotEdges` or `edge-order.ts`, and each
comment states the current reason. The redundant call is gone (AD-1), or it is kept with
a comment stating its proven mechanism and a follow-up is filed (AD-1 fallback). Every
bytediff and survey job is byte-identical base to head. Follow-ups README item 151 is
marked DONE. Gates are green.

**Out of scope:** removing `lost` itself (it still has a reader, see AD-2);
`makeFlatAdjEdges` ignoring `dotSplines_`'s return code (C returns `rc`); the
`plans/` archaeology, which keeps its historical mentions.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (injected into the session). They override this brief where the
   two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 9466ec3f..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `9466ec3f3931010aa5973f28f82e3c0f90c8ab8d` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-137 brief` (this
  directory), then `refactor(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-137/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  refactor(dot): retire references to the removed routeDotEdges backstop

  Part 11 T8 deleted the routeDotEdges backstop and edge-order.ts, but
  five comments still gave them as the reason for code. The lost flag's
  reader is now routeLoneEdge's skip in the flat group loop. The extra
  placeRegularEdgeLabels on the flat-adjacent aux graph only existed to
  run after the backstop; finalizeSplines already places the labels, and
  C runs nothing between dot_splines_ and dotneato_postprocess, so the
  call is removed. Output is byte-identical.

  Refs: #137
  ```

  Add a gates line to the body as #136's commit does. If the AD-1 fallback applied, use
  `docs(dot): ...` and say the call stays and why. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-retire-backstop-refs.md#bytediff) | every job identical |
| 6 | Targeted survey | see [T1](batch-1/T1-retire-backstop-refs.md#targeted-survey) | every row identical base to head; native counts recorded |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl`. The path is dot-only. Run `oraclePreflight`
(`test/corpus/oracle-env.ts`) before trusting native output. A missing `config8` is
fixed with `GVBINDIR=/tmp/ghl <dot> -c`. Check `uptime` before gates 5 and 6, and wait
while it is above 12. Load was 16 at planning.

Baseline at planning: typecheck and `npm test` green on `9466ec3f`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. Any bytediff or survey job differs base to head after the AD-1 fallback is applied
   (that is, with only comments changed). That cannot come from a comment: halt with
   the diff.
4. An architecture decision in [decisions.md](decisions.md) turns out wrong (for
   example, `lost` has no reachable reader, or a sixth site names the backstop in `src/`).
   File what you found and stop if it changes the scope; journal and continue if it
   only adds a comment edit inside the write-set.

## Push-forward (decide alone, journal it)

- Wording of each rewritten comment, within the "True now" column.
- In `bsd-qsort.ts`, whether to name another live never-tie sort site or drop the
  example. If you name one, check it exists.
- Applying the AD-1 fallback when removal changes any output. Diagnose why, keep the
  call, and file the follow-up.
- Filing a `follow-up` issue for anything found on the way: `makeFlatAdjEdges` ignoring
  `rc`, or `lost`'s reader being unreachable in practice.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-retire-backstop-refs.md](batch-1/T1-retire-backstop-refs.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | aux-graph sequence, C vs port |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-137.md` for anything novel. Otherwise state that nothing was novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 done (T1). AD-1 applied as planned; the fallback was not needed.
- **Decisions:** 4 journalled judgment calls. `bsd-qsort.ts` names `routeCurvedGroup`'s sort
  as the never-tie example. Gate 6 was widened with eight labelled fixtures, because no
  corpus id that reaches `makeFlatAdjEdges` has a labelled vnode in its aux graph. The 13
  capped marker targets were ruled out by a text scan. The gate 6 survey ran at load 12.04.
- **Gates:** typecheck 0; `npm test` 562 files / 13275 tests; goldens 5/5; corpus + docs 2837
  tests; smoke bytediff 1960 of 1960 identical; survey 54 rows (10 marked ids and 8
  fixtures x svg, xdot, json): base = head on 54, native finished 54, head equals native
  on 54.
- **Filed:** #187 (follow-up: a failed flat-adjacent aux layout falls through where C
  returns `rc`), #188 (follow-up: `lost`'s reader was taken 0 times on the corpus).
- **Outside T1's planned write-set:** `harness/` (survey script, marker patch, fixtures,
  results).
