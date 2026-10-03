# Mission: v2-silent-gaps

## Objective

Close every **silent** unported-attribute gap that `plans/v2-fidelity` deferred,
so no DOT attribute is silently ignored in 2.0. Owner policy: **port the C**
(ADR-1); fail loudly only as a stop-rule fallback the owner approves. Gaps:
neato `mode` never read (KK/sgd), KK unported, overlap modes `oscale`/`ortho*`/
`portho*`/`vpsc` silent (and every non-prism mode in sfdp), circo
multi-component overlap removal stubbed, fdp subgraph-only `coords` ignored, and
the bounding-box approximation in the Voronoi overlap test (port `poly.c`).

## Branch

`feature/v2-silent-gaps`, created at startup off `feature/v2-fidelity` (head
4fe3d1ca). **Do not merge to main, push or publish.** Merge strategy when it
lands: merge commit (the journal cites commit IDs).

## Startup

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [conventions.md](conventions.md),
   then the current batch's `overview.md`; read task files on demand.
3. Read [decision-journal.md](decision-journal.md) and
   `plans/v2-fidelity/decision-journal.md` (rows T6, T7, T9, follow-ups).
4. Check `.agent-notes/`, especially `v2-fidelity-2026-10.md` and
   `survey-oracle-cap-overrun.md`.
5. `git checkout -b feature/v2-silent-gaps`; prepare the oracle and the
   corpus-gate baseline bundle of 4fe3d1ca ([corpus-gate.md](corpus-gate.md))
   before batch 1.

## Quality gates (after every batch)

| command | pass | on_fail |
|---|---|---|
| `npm run typecheck` | exit 0 | fix_and_rerun |
| `npm run typecheck:ts7` | exit 0 | fix_and_rerun |
| `npm test` | exit 0; count ≥ previous + new tests | fix_and_rerun |
| `npm run coverage` | changed/new code ≥ 90% line/branch/function | fix_and_rerun |
| `npm run build:js` | exit 0 | fix_and_rerun |
| corpus gate after batches 1–3 ([corpus-gate.md](corpus-gate.md)) | only that batch's allowed changes | stop |
| `npm run docs:build` (batch 4) | exit 0, no new dead links | fix_and_rerun |

Also check `git diff --name-only` stays within each task's write-set (plus
journaled push-forward test updates).

## Stop conditions

1. A non-test file outside the task's write-set needs changing.
2. The same gate fails twice in a row.
3. Evidence contradicts an ADR, or Step 0 shows native behaving differently
   from the task spec's premise.
4. A port grows beyond ~3× the C size named in its task, or needs C beyond the
   named functions. Stop and propose; the owner prefers porting, so this is a
   pause for a decision, not a switch to loud.
5. Native disagrees with a port and the mechanism is not found
   (`~/.claude/rules/diagnosis.md` artifact; no "close enough").
6. The corpus gate shows a change not on that batch's allowed list.
7. A file over the 500-line cap must grow and no faithful split into a new
   module inside the write-set is possible.
8. More than 3 test files outside the planned write-sets need updating.
9. An import cycle cannot be resolved without moving code outside the
   write-set.

## Push forward (decide alone, journal it)

- Update an existing test outside the write-set **only** when it asserts the
  old silent behaviour this task replaces (name it in the journal; counts
  toward stop 8).
- Split functions into a new module inside the write-set to respect the
  500-line cap, keeping C function boundaries and `@see`.
- Fixtures, oracle harness details (scratchpad only), `UNSUPPORTED_FEATURE`
  wording (must name attribute and value).
- C `agwarningf` → `console.warn` with C's text; C "once per process" flags →
  per-root-graph state (never a module-level `let`; a fitness test forbids it).
- Task order within a parallel batch; solo re-render of one-side timeouts.

## Batches

| Batch | Tasks | Depends on | Status |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 poly.c · T2 fdp coords · T3 neato mode · T4 KK · T5 cAdjust | — | [x] |
| [2](batch-2/overview.md) | T6 adjust Info_t + oscale · T8 circo components · T9 sfdp overlap | 1 | [x] |
| [3](batch-3/overview.md) | T7 single overlap dispatch | 2 | [x] |
| [4](batch-4/overview.md) | T10 docs | 3 | [x] |

## Index

- [decisions.md](decisions.md): ADR-1…8 (locked)
- [conventions.md](conventions.md): oracle, Step 0, quality bar shared by every task
- [corpus-gate.md](corpus-gate.md): port-only base-vs-branch comparison and allowed changes
- [diagrams/component-map.md](diagrams/component-map.md) ·
  [diagrams/data-flow.md](diagrams/data-flow.md)
- [decision-journal.md](decision-journal.md): append during execution; add a
  summary row to `plans/decision-journal.md` at the end.

## Commits

Conventional Commits, subject ≤72, body wrapped at 80, no attribution or session
footer (`~/.claude/rules/commits.md` overrides any harness reminder). One commit
per task. A task that makes anything newly loud uses `!` with `BREAKING CHANGE:`.

## Model

Execute with `fable`. Task agents: `typescript-pro` (sonnet); T10
`documentation-engineer` (sonnet). Agents edit files only; the executor runs
the full gates and commits.

## Summary (2026-10-03)

- **Tasks:** 10/10 planned. T8 closed as a verified no-op (native ignores
  `overlap` on circo's derived component graphs; the port already matched).
- **Commits:** T1 d972f2ce · T2 0bfa6857 · T5 8b22eeaf · T3 172ef07f ·
  T4 5a6b4f0e · T6 bf6a6837 · T8 8a0aeef1 · T9 363843c8 (`!`) · T7 (see journal)
  · T10 (see journal).
- **Decisions:** ~20 journal rows. For owner review: KK packing gate added
  by the executor (index.ts, C neatoinit.c:1371-1380); `mds_model` defines
  behaviour where native crashes; neato `overlap=vpsc` output changes on
  every graph (now matches native).
- **Gates:** typecheck, ts7, build:js, vitest 6651/6651 (from 6418),
  coverage ≥ 90% on changed code, docs:build clean, corpus gates b1–b3 PASS.
- **Follow-ups:** see the journal's `end` row (normalize/scale under the
  overlap dispatch is the main remaining silent gap). Not merged or pushed.
