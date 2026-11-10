# Mission: issue #138: audit the per-render resets against no-free relayouts

## Objective

AD-4 (part 3) gives every module holding C process state a reset, registered
with `registerRenderState` (`src/common/render-state.ts:29`). Every public
render entry and `GvcContext.layout` (`src/gvc/context.ts:312`, part-4 AD-8)
runs all of them first. Native, in one libgvc process, runs no such reset:
on a layout with no `gvFreeLayout` before it, a C static keeps its value, and
the layout also meets the stale records the last layout left. Part 11 T8 found
one static where that matters: decompose's `Cmark` restarted at 1, equal to a
stale `ND_mark` 1, and `graphs/nestedclust.gv` render 3 went wrong (item 129).
The fix carries the count with the root's record (`nextCmark`,
`src/layout/dot/decomp.ts:138-163`). No other reset was audited.

At planning, 23 non-test files under `src/` call `registerRenderState` (about
27 statics). `decomp.ts` is the audited one; the other 22 are:

`layout/dot/rank.ts` (`CL_type`), `layout/dot/mincross-cross.ts` (`ReMincross`),
`layout/dot/mincross-build.ts` (fill-node sequence), `layout/neato/start.ts`
(start=self once flag), `layout/fdp/tlayout-parms.ts` (`parms`),
`layout/fdp/xlayout.ts` (`xParams`, `X_marg`), `render/color-resolve.ts`
(known-colour list), `common/layout-state.ts` (`State`), `common/agerr.ts`
(pending message, last level), `common/multicolor.ts` (parseSegs flag),
`common/htmltable-emit-fill.ts` (leaked pen width),
`common/htmltable-emit-rules.ts` (anchor id and environment),
`common/textmeasure.ts` and `common/textmeasure-lookup.ts` (warning sets),
`common/emit-once.ts` (emit_once set), `common/random.ts` (drand48),
`common/crand.ts` (rand), `common/safefile.ts` (`Gvimagepath`, image hooks),
`common/shapes.ts` (`UserShape`), `common/color.ts` (colour scheme),
`common/htmltable.ts` (missing-image and size-warning sets),
`common/postproc.ts` (`Rankdir`, `Offset`).

**Done when** (the issue's criterion): each registered reset is listed with
its C static and one verdict, with evidence:

- **M**: matches C on a no-free relayout. C assigns the static before every
  read on each layout, or the reset value equals what C holds at that point.
- **N**: differs from C on a no-free relayout but reads no layout record. It
  stays as it is under AD-4 and part-4 AD-8.
- **S**: compared against stale records, as `Cmark` was. Fixed at its origin
  as `nextCmark` was, with a native no-free fixture test (AD-2).

Plus:
- The list is `docs/process-statics.md`, and a fitness test fails when a
  registration is added or removed without a row (AD-3).
- Follow-ups README item 152 is marked DONE.
- All gates are green.

The commit type depends on the result: `fix(dot)` (or the scope of the S
module) if any S row needed a code change, otherwise `docs`.

**Out of scope:** changing AD-4 or AD-8, so no N row changes behaviour (AD-1);
module statics that register no reset; port-only per-layout fields kept on
records (`abomShift`, part-10 AD-8); caller-installed hooks.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 27402ece..`.
4. Read `.agent-notes/post-16-1-followups-11.md` (the `Cmark` finding),
   `.agent-notes/issue-131.md` (stderr probes; check the bases first), and the
   T8 rows of `plans/post-16-1-followups-11/decision-journal.md`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch and never merge `main` into it.
- **Base sha:** `27402ece3de05e63200dbaf212e27cef113ac006` (the tip at planning
  time). If the tip has moved, use the tip at execution start as the base and
  journal it.
- Per-task commits while you work: first `docs(mission): add issue-138 brief` (this
  directory), then `test(T1): ...`, `fix(T1): ...`, `docs(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-138/pre-squash`, then
  `git reset --soft <base>` and one commit. With no S row:

  ```
  docs: audit the per-render resets against no-free relayouts

  Part 11 found that decompose's Cmark, reset per render, met a stale
  ND_mark on a layout with no free before it. docs/process-statics.md
  now lists every registered reset with its C static and a verdict:
  it matches C on such a layout, or it reads no layout record. A
  fitness test keeps the list in step with the registrations.

  Refs: #138
  ```

  With an S row, the subject becomes `fix(<scope>): ...` naming the static, and the
  body states its mechanism. Rewrite the body to match what the audit found. Lines
  ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a PR, or use
  `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | only if `src/` changed (non-test); see [T1](batch-1/T1-audit.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | only if `src/` changed (non-test); see [T1](batch-1/T1-audit.md#targeted-survey) | head = base on first renders |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), `GVBINDIR=/tmp/ghl`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`)
before you trust native output. If `config8` is missing, run
`GVBINDIR=<dir> <dot> -c`. The no-free probes use libgvc in one process through
`plans/post-16-1-followups-9/harness/T11/twice.c` (build recipe:
`src/gvc/__fixtures__/rerender/regen.sh`; build into `$TMPDIR`). Check `uptime`
before native runs and wait while it is above 12.

Baseline at planning: `npm run typecheck` and `npm test` (13275 tests) are green
on `27402ece` (see [decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change. (The queue rules let you go
   ahead when a stated mechanism requires it; journal why.)
2. The same gate check fails twice in a row after fix attempts: diagnose it to a
   stated mechanism, journal it, and stop.
3. An S row's fix would change a first render (a render with no layout before it
   on that graph, or one after a free). Part-10 AD-8 makes that a hard stop.
4. An S row's fix needs more than the `nextCmark` pattern: a change to AD-4's
   reset contract, to `render-state.ts`'s API, or to `layout-reset.ts`. File that
   row as `needs-ruling` with its probe evidence, finish the rest, and say so in
   the summary.
5. The smoke bytediff or the targeted survey shows an output that differs from
   the base: halt, per the queue rules.
6. A native no-free probe does not repeat across 3 runs (native variance,
   part-10 AD-10): record it, and judge that row from the code alone.

## Push-forward (decide alone, journal it)

- The verdict of each row, and how much evidence an M or N row needs past the
  C and port citations (a probe is required only where the code alone does not
  settle it; see T1).
- Probe inputs, fixture names, and whether a fix's test sits beside
  `rerender-nestedclust.test.ts` or in a new `rerender-*.test.ts`.
- The doc's column layout and wording; the fitness test's parsing approach
  within AD-3.
- Filing a `follow-up` issue for an N row whose difference shows on a public
  render entry (which would be a defect, not the AD-8 contract).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-audit.md](batch-1/T1-audit.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the resets run against a no-free relayout |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the verdict
  count per class, every S mechanism, files, gates.
- Write `.agent-notes/issue-138.md` only for something novel. Otherwise the journal
  row says there was nothing novel.
- Append a `## Summary (<date>)` section here (tasks, result, not-as-planned,
  decisions, gates, follow-ups, known limits), as the #131 brief did.
- The final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** T1 of 1, done.
- **Result:** `docs/process-statics.md` lists the 24 registered resets in 26 rows:
  16 M, 9 N, 1 S. The S row is `Cmark`, already fixed in part 11 T8. No new S row,
  so no file under `src/` changed and the commit is `docs`. The fitness test
  (`test/docs/process-statics.test.ts`) keeps the table in step with the
  registrations. Follow-ups item 152 is DONE.
- **Not as planned:** `/tmp/ghl` serves dot only, so the neato and fdp probes used a
  plugin dir under `$TMPDIR`. `twice.c` silences stderr, so the probes used a
  `$TMPDIR` copy. Three probe bases were replaced or dropped (wedged: accepted
  divergence; clusters and newrank: native segfaults on the relayout). A port-side
  check not in the brief was added: the resets skipped after layout 1, on the
  probes and on a sweep of 274 dot inputs and 89 per other engine.
- **Decisions:** 9 journal rows, none flagged for review. `drand48` is M and
  `rand()` is N. Port-only statics cite the C line they stand in for.
- **Gates:** typecheck 0; `npm test` 13277; goldens 5 of 5; corpus + docs 2839.
  Gates 5 and 6 not applicable (no `src/` change).
- **Follow-ups filed** (none from a registered reset): #190 stale node label on a
  no-free relayout (bug); #191 anchor ids restart per render (question); #192
  `attach_phase_attrs` not ported (bug); #193 neato KK bb on a no-free relayout
  (mechanism not established).
- **Known limits:** native is no reference on 86 of the 275 dot sweep inputs (it
  crashes on the relayout), so those rest on layout 1 and the code. The N rows
  change stderr, and for `anchorSeq` ids, on a second `layout` of one context;
  that is the AD-8 contract and nothing was changed.
