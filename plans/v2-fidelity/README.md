# Mission: v2-fidelity

## Objective

Close the four follow-ups from `plans/error-hierarchy` before 2.0.0 ships:
1. `freeLayout` cleans up the wrong engine.
2. `gvXmlEscape`'s UTF-8 path reads UTF-16 units as bytes.
3. Corpus `2723` (C segfaults too) is pinned and documented.
4. **Unported features.** No DOT attribute may be silently ignored any more:
   small features are ported faithfully, large ones fail loudly with
   `RenderError UNSUPPORTED_FEATURE`.

Simple items first, unported features last. Locked design:
[decisions.md](decisions.md).

## Branch

`feature/v2-fidelity`, created off `feature/error-hierarchy` (the unmerged 2.0
integration branch, head ca7bf4d3). **Do not merge to main, push or publish.**
The owner decides how the two branches combine into the single 2.0.0 release PR.
Merge strategy when it lands: merge commit (the journal cites commit IDs).

## Startup

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), then the current batch's
   `overview.md`; read task files on demand.
3. Read [decision-journal.md](decision-journal.md).
4. Check `.agent-notes/`, especially `survey-oracle-cap-overrun.md`.
5. Prepare the native oracle ([oracle.md](oracle.md)) and the corpus-gate
   baseline ([corpus-gate.md](corpus-gate.md)) before batch 1.

## Quality gates (after every batch)

| command | pass | on_fail |
|---|---|---|
| `npm run typecheck` | exit 0 | fix_and_rerun |
| `npm run typecheck:ts7` | exit 0 | fix_and_rerun |
| `npm test` | exit 0; count ≥ baseline + new tests | fix_and_rerun |
| `npm run coverage` | changed/new code ≥ 90% line/branch/function | fix_and_rerun |
| `npm run build:js` | exit 0 | fix_and_rerun |
| corpus gate after batches 1, 2 and 3 ([corpus-gate.md](corpus-gate.md)) | only that batch's allowed changes | stop |

Also check that `git diff --name-only` stays within each task's write-set.

## Stop conditions

1. A file outside the task's write-set needs changing.
2. The same gate fails twice in a row.
3. Evidence contradicts an ADR.
4. A port grows beyond about 3× its ADR-2 C size, or needs C beyond the named
   functions. Stop and propose making it loud instead; do not keep porting.
5. The native oracle disagrees with a port and the mechanism is not found
   (`~/.claude/rules/diagnosis.md` artifact required; no "close enough").
6. The corpus gate shows a change not on that batch's allowed list.
7. A loud check would fire where C ignores the attribute for that engine
   (precedence rule, ADR-3).
8. More than 3 files beyond the planned write-sets need changing.

## Push forward (decide alone, journal it)

- `UNSUPPORTED_FEATURE` message wording; it must name the attribute and value.
- Test fixture graphs.
- The oracle harness (scratchpad only).
- C `agwarningf` → `console.warn`, the port's existing convention (see
  `src/layout/neato/sgd.ts:393`).
- Task order within a parallel batch.

## Batches

| Batch | Tasks | Depends on | Status |
|---|---|---|---|
| [1](batch-1/overview.md) | T1 freeLayout · T2 xml UTF-8 · T3 2723 pin · T4 nslimit | — | [x] |
| [2](batch-2/overview.md) | T5 sfdp · T6 neato init · T7 overlap=voronoi · T8 fdp splines | 1 | [x] |
| [3](batch-3/overview.md) | T9 neato inputscale | 2 (T6 shares `neato/init.ts`) | [x] |
| [4](batch-4/overview.md) | T10 docs | 3 | [x] |

## Index

- [decisions.md](decisions.md): ADR-1…6 (locked), including the port/loud split
- [oracle.md](oracle.md): how to compare a port against native Graphviz
- [corpus-gate.md](corpus-gate.md): port-only main-vs-branch comparison and the
  allowed changes per batch
- [diagrams/component-map.md](diagrams/component-map.md) ·
  [diagrams/data-flow.md](diagrams/data-flow.md)
- [decision-journal.md](decision-journal.md): append during execution; add a
  summary row to `plans/decision-journal.md` at the end.

## Commits

Conventional Commits, subject ≤72, body wrapped at 80, no attribution or session
footer (`~/.claude/rules/commits.md` overrides any harness reminder). One commit
per task. Loud-check tasks use `feat(<engine>)!:` with a `BREAKING CHANGE:` footer
naming the attributes.

## Model

Execute with `fable`. Task agents: `typescript-pro` (sonnet); T10
`documentation-engineer` (sonnet). Agents edit files only; the executor runs
the full gates and commits.

## Stop summary (2026-10-02)

Stopped in batch 2 on stop conditions 8 (write-set) and 3 (evidence vs ADR-2).

- Done and committed: T1 e1e35d45, T2 9426010d, T3 f1e42f44, T4 0a22500a,
  T7 e1bfcb2f, T8 a03b4ce1 (6 of 10 tasks).
- T5: `label_scheme` loud check done and gated but **uncommitted** (task
  incomplete). `quadtree=none|fast` blocked: C's dispatch is
  `src/layout/sfdp/spring-driver.ts`, outside the write-set; the
  `tuneControl` alternative breaks two `init.branch.test.ts` tests.
- T6: nothing changed. `neato/init.ts` is 515 lines (hook forbids growth), so
  it needs a new module; `mode=ipsep` without constraints already matches
  native, so an unconditional loud check would contradict ADR-4.
- Write-set expansions used: 3 test files (context.test.ts,
  xml.branch.test.ts, errors.cport-b.test.ts), all tests that asserted the
  ADR-5 defects.
- Gates: typecheck, typecheck:ts7, vitest 6350/6350, build:js; corpus gates
  b1 and b2 PASS (only allowed changes).
- Owner decisions needed: see decision-journal rows T5, T6, T7 follow-ups.

### Resumed 2026-10-02

Owner added `src/layout/sfdp/spring-driver.ts` to T5's write-set. T5 done
(see journal); T6 still blocked (new module + ADR-2 `mode=ipsep` amendment
needed), so batches 3-4 wait.

## Completion summary (2026-10-02)

- Tasks: 10/10 done. Commits: T1 e1e35d45, T2 9426010d, T3 f1e42f44,
  T4 0a22500a, T7 e1bfcb2f, T8 a03b4ce1, T5 a0053927, T6 de76bd9b,
  T9 941bb455, T10 1a28e5eb.
- Owner-approved scope changes: T5 +spring-driver.ts; T6 +start.ts module,
  mode=ipsep loud only with constraints, +init.branch.test.ts; T9 +fdp
  init.ts/derive.ts (fdp calls get_inputscale), negative inputscale → 72.
- Gates: typecheck, typecheck:ts7, vitest 6418/6418, build:js, docs:build;
  every corpus gate showed only allowed changes.
- Flagged for review: T7 voronoi overlap test approximates polyOverlap by
  bounding boxes (may be loud on rounded shapes where C is not).
- Follow-ups (silent gaps, documented in docs/known-divergences.md): neato
  `mode` attribute never read; sfdp overlap=voronoi; overlap=oscale and
  ortho*; twopi/circo multi-component overlap; fdp subgraph-only `coords`.
