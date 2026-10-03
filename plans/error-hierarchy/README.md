# Mission: error-hierarchy

## Objective

Give @knowvah/dot-engine an idiomatic TypeScript error model:
- an abstract `DotEngineError` base for every failure the library raises about an
  input graph, including internal invariant failures that are bare `Error`s today;
- standard `TypeError` / `RangeError` / `Error` with Node-style `code`s for caller
  mistakes at every public entry point;
- ES2022 `{ cause }` so wrapped failures keep their original stack.

Ships as **2.0.0** (breaking: `renderSvg` / `tryRenderSvg` contracts narrow, new
codes). Locked design: [decisions.md](decisions.md).

## Branch

`feature/error-hierarchy` off `main`. **Do not merge to main when this mission
ends.** `.releaserc` releases from `main` on every push: any `feat` commit landing
there publishes a minor version, and T8's breaking commit publishes 2.0.0. The owner
decided (2026-10-02) that 2.0 also includes a follow-on mission (unported features
fail loudly or get ported; see the journal). That mission builds on this branch, and
a single PR to main, titled `feat!: …`, releases 2.0.0 once. Do not push or publish.

## Startup

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full
   (`rules/autonomous-execution.md` is a stub).
2. Read this README, then [decisions.md](decisions.md), then the current batch's
   `overview.md`. Read task files on demand.
3. Read [decision-journal.md](decision-journal.md) (entries from before compaction).
4. Check `.agent-notes/`. Relevant: `survey-oracle-cap-overrun.md` (the full survey
   takes ~4.5 h, which is why the corpus gate below is port-only).

## Quality gates (after every batch)

| command | pass | on_fail |
|---|---|---|
| `npm run typecheck` | exit 0 | fix_and_rerun |
| `npm run typecheck:ts7` | exit 0 | fix_and_rerun (a tsgo-only rejection of an ADR pattern = stop) |
| `npm test` | exit 0; test count ≥ baseline + new tests | fix_and_rerun |
| `npm run coverage` | changed/new code ≥ 90% line/branch/function | fix_and_rerun |
| corpus gate (after batches 2 and 3), see [corpus-gate.md](corpus-gate.md) | byte-identical successes; only listed class/code changes on failures | stop |

Also verify `git diff --name-only` stays within each task's write-set.

## Stop conditions

1. A file outside the task's write-set needs changing.
2. The same gate fails twice in a row.
3. Evidence contradicts an ADR (including tsgo rejecting an ADR-1/ADR-2 pattern).
4. Corpus gate: any byte difference on a successful render, or an error class/code
   change not in the reclassification table (= control flow leaked).
5. A C-port throw site cannot be classified: the port throws where C neither
   asserts, throws, nor exits. Journal it and stop; do not pick a class.
6. A change would alter a C-port site beyond swapping the thrown class.
7. More than 3 files beyond the planned write-sets need changes.
8. A public symbol outside the error surface would need its signature changed.

## Push forward (decide alone, journal it)

Usage-error message wording (must name the parameter and what was received); test
and fixture names and how a C-port throw is triggered (if infeasible, assert on a
constructed instance and journal why); internal helper names in `errors.ts`; README
migration-table layout; splitting code into helpers to stay under the complexity
limits (≤30 NLOC/function, CCN ≤10, ≤500 lines/file).

## Batches

| Batch | Tasks | Depends on | Status |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 error foundation | — | [x] |
| [2a](batch-2a/overview.md) | T2 parse errors · T3 registry · T4 C-port sites A · T4b GTS-faithful CDT | T1 | [x] |
| [2b](batch-2b/overview.md) | T5 C-port sites B · T6 `/api` · T7 host hooks | T1 | [x] |
| [3](batch-3/overview.md) | T8 public boundaries (BREAKING CHANGE) | 2a, 2b | [x] |
| [4](batch-4/overview.md) | T9 error reference page, README migration, guide updates | T8 | [x] |

2a and 2b have disjoint write-sets and may run concurrently.

## Index

- [decisions.md](decisions.md): ADR-1…7 (locked) with sources
- [reclassification.md](reclassification.md): old → new class/code table (T4/T5
  fill in the C-port rows; the corpus gate and T9 read it)
- [cport-classification.md](cport-classification.md): how T4/T5 classify each C-port
  throw site against its C source
- [corpus-gate.md](corpus-gate.md): the port-only main-vs-branch comparison
- [diagrams/data-flow.md](diagrams/data-flow.md) ·
  [diagrams/component-map.md](diagrams/component-map.md)
- [decision-journal.md](decision-journal.md): append during execution; also add a
  summary row to the project journal `plans/decision-journal.md`.

## Commits

Conventional Commits, subject ≤72 chars, body wrapped at 80, no attribution footer.
One commit per task. Scope `errors`. T8 carries the `BREAKING CHANGE:` footer.

## Model

Execute with `fable` (long-horizon). Task agents: `typescript-pro` on `sonnet`
(T9: `documentation-engineer` on `sonnet`).

## Session summary (2026-10-02)

- **Tasks:** 9/9 planned + 2 added (T4b GTS-faithful CDT, owner option B; T8b
  last unguarded entry points). 13 commits on `feature/error-hierarchy`; the
  breaking one is d40c6695.
- **Gates (final):** typecheck, typecheck:ts7, vitest 6297/6297, build:js OK.
  Corpus gate after batches 2 and 3: every success byte-identical; the only
  failure change is 2723 RENDER_ERROR → INTERNAL_ERROR (a foreign throw, as
  designed).
- **Stops:** T4 hit stop condition 5 at two CDT sites; resolved by owner (B)
  with a GTS 0.7.6 C oracle (500 random cases, all agree).
- **Not merged, by design:** this is the 2.0 integration branch. The
  unported-features follow-on mission lands here first; one `feat!:` PR then
  releases 2.0.0.
- **Follow-ups for that mission** (journal): freeLayout cleans up the wrong
  engine; gvXmlEscape UTF-8 path treats JS chars as bytes; 2723 port bug;
  silent no-op unported features (owner: fail loudly or port, inside 2.0);
  move `requireObject` into errors.ts; `ERR_OUT_OF_RANGE` has no caller yet.
