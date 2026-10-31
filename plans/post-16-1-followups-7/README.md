# Mission: post-16.1 follow-ups, part 7 (items 95–102)

## Objective

Close the eight follow-ups part 6 opened in
[`plans/post-16.1-followups/README.md`](../post-16.1-followups/README.md):

- ipsep's cola prologue and fused right-multiply (95);
- a full port of constrained ipsep, `stress_majorization_cola` on `quad_prog_vpsc` with
  its subset and circuit models (96), which makes `diredgeconstraints`,
  `overlap=ipsep|vpsc` and cluster constraints lay out;
- `poly_init`'s usershape keying (97);
- `":red"` fill names on point nodes and edge arrowheads (98, 99);
- svg image rotation (100);
- image-type sniffing and the `No loadimage plugin` warning (101);
- `imagepath` / `safefile` (102).

Each item is fixed faithfully to the C (graphviz 16.1.0) or parked with a full diagnosis
(part-5 AD-3). Item 96 is a `feat`, so the merged PR cuts a minor release (AD-1). Nothing
is pushed or signed (part-5 AD-1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read this README, [decisions.md](decisions.md), [decision-journal.md](decision-journal.md),
   then the current batch's `overview.md`. Check finished tasks with `git log --oneline main..`.
3. Read `.agent-notes/post-16-1-followups-6.md`, which covers:
   - the context API, used instead of `render`, for comparing stderr across formats;
   - `GVRENDER_DOES_TRANSFORM` is never set;
   - `ObjState.graphObj` is null at emit time;
   - the bytediff output format;
   - cola's right-multiply and its missing prologue.

   Also read `.agent-notes/post-16-1-followups-5.md` (cola shares the kD CG; xdot timeouts
   under load) and `.agent-notes/post-16-1-followups-3.md` (LTO: disassemble only linked
   dylibs; lldb on native statics).

## Branch and commits

- Branch `chore/post-16-1-followups-7` off `main` (`4e46e1a4`; PR #115 and #116 merged).
- **First run only:**
  1. Create the branch.
  2. Add "Being closed by `plans/post-16-1-followups-7/`" after the part-6 line in the
     follow-ups README header.
  3. Commit the brief, that README and `.claude/settings.autonomous.json` (planning moved
     `gh pr create` from allow to deny) as
     `docs(mission): add post-16.1 follow-ups part 7 brief`.
- One commit per task. Subject `<type>(TN): <desc>`, ≤72 chars, lowercase, no period;
  lines ≤80; a body when more than 3 files change; no attribution of any kind.
- Commit types:
  - `test(T0)`;
  - `feat` for T5, T7, T8 and T10 (AD-1);
  - otherwise `fix`, `refactor` or `docs`, depending on whether output changed.
- **Commit unsigned, locally only (part-5 AD-1):** `git -c commit.gpgsign=false commit -F <msgfile>`,
  run standalone (never chained with `&&`, because the auto-mode classifier denies chained
  commits). Never push, open a PR, sign, rebase, or touch `main`.
- The journal cites task IDs, not SHAs. Only the orchestrator writes:
  - `decision-journal.md`;
  - `plans/decision-journal.md`;
  - `plans/post-16.1-followups/README.md`;
  - `.agent-notes/`.

  Subagents report findings in their hand-back.

## Quality gates (every task, before its commit)

| Gate | Command | Pass | On fail |
|---|---|---|---|
| Types | `npm run typecheck` | exit 0 | fix, re-run |
| Unit | `npm test` | exit 0 | fix, re-run |
| Goldens | `bash test/golden/gates.sh` | 5/5 PASS | fix, re-run |
| Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 | fix, re-run |
| i18n (T11, T12) | `npm run docs:i18n-status` | 0 stale | `npm run docs:i18n-hashes` |
| Byte-identity (`src/` tasks) | `npx tsx test/tools/bytediff.ts`, run as in part-6 T0: the previous head's bundle vs this task's, one process per job, engines × {svg, xdot, json, plain, cmapx} + console | identical, or every change explained; capped jobs listed separately | diagnose (stop 8) |
| Probe parity (each item's probes) | the task's fixture test, which compares port output to native in `src/layout/neato/__fixtures__/ipsep/` or `src/gvc/__fixtures__/p7/` | per the task's acceptance criteria | diagnose |
| ipsep probes (T1, T8, T10) | `npx vitest run src/layout/neato/ipsep-probes.test.ts` (T0 creates it) | unconstrained byte-identical (stop 7); constrained ≤ 0.01 or parked | diagnose |
| Survey (T12 always) | `rm -f test/corpus/parity-mission-probe.json && GVBINDIR=/tmp/ghl PARITY_OUT=parity-mission-probe.json npx tsx test/corpus/survey.ts && npx tsx test/corpus/rules-gate.ts test/corpus/parity-mission-probe.json test/corpus/parity.json` | `GATE PASS`, 0 regressions, `counts.oracle-error` == 14 | revert, STOP |
| Engine walk (T12, AD-8) | `GVBINDIR=<full plugin dir> npx tsx test/corpus/engine-walk.ts <engine> <scratch>.jsonl`, compared by id with the committed `parity-<engine>.jsonl` | no pass→worse (`oracle-nondeterministic` counts as neutral) | revert, STOP |

- The survey takes about 3 hours. Never edit `src/` while a survey or walk reads it. Run
  it in a worktree of the commit under test (`ln -s <repo>/node_modules node_modules`,
  `npm run parser:regen`).
- Oracle: `~/git/graphviz/build/cmd/dot/dot` (16.1.0).
  - dot uses `GVBINDIR=/tmp/ghl`.
  - Other engines use the full plugin dir
    `/private/tmp/claude-501/-Users-scottseely-git-knowvah-dot-engine/dfc80e32-d4b2-43d1-a20b-4d2c1be89946/scratchpad/ghl16-all`
    (walk caches are keyed on that path).
  - A `/tmp` clean deletes `config8`; fix it with `GVBINDIR=<dir> dot -c`. Rebuild a
    missing dir per `.agent-notes/post-16-1-followups-5.md`.
- No speed gate. T10 journals one timing note for the largest ipsep probe (AD-8).

## Stop conditions

1. A task needs to write a file outside its write-set.
   - T3's arrow-fill site counts as in-set only once T0 has named it in the journal.
   - T12's write-set is open.
2. The same gate check fails twice in a row after fix attempts. Stop editing; keep
   investigating until the cause can be named, then log the diagnosis artifact.
3. The same code location or approach fails the same check three times in a row.
4. A change would contradict AD-1 to AD-8 or a carried decision, or evidence shows one is
   wrong.
5. A survey or walk regression that is not a move toward the oracle.
6. The oracle fails preflight, `dot -V` is not 16.1.0, or `counts.oracle-error` ≠ 14.
7. The 7 unconstrained ipsep probes stop being byte-identical after T1 (AD-2).
8. A corpus output changes in either of these cases:
   - T4, T5, T7, T8 or T10 change any corpus output. No corpus id reaches ipsep, and none sets
     `rotate` with `image`.
   - T2, T3, T6 or T9 change a corpus output that a fresh oracle run does not reproduce.
9. A native probe contradicts a decision in a way the AD does not cover. Examples:
   - 101 warns for a format whose image ops the port does not emit;
   - native 102's warning text depends on the `dir/name` that `findPath` resolves, in a
     way AD-6's raw-name keying cannot reproduce.
10. T8 or T10 needs `stress-kernel.ts`, `conjgrad-mkernel.ts` or the fused CG changed beyond
    removing `cola` (AD-3, part-5 AD-4).
11. A fix would do any of the following:
    - optimize, reorder or simplify C behaviour;
    - need `any` or a Node-only API in `src/`;
    - need a new public API field (AD-5, AD-6, part-5 AD-10).
12. Anything would push, open a PR, publish, sign, rebase, or touch `main`.
13. **Planned stop:** T12 is done. Hand the user the re-sign command and the release note.

## Push forward (decide alone; record each decision in the journal)

- **Park a constrained ipsep probe** that misses 0.01 after its ~2 h budget. Journal the
  full artifact and open a new follow-up (104 onward; AD-3 reserves 103 for model
  wiring). T10 still lands if the unconstrained
  probes stay byte-identical (AD-4).
- **Park any of 97–102** the same way when native behaviour can't be reached within the
  write-set. The other items continue.
- **Warnings:** add native-matching warnings to golden "logs nothing" allow-lists. Warnings
  go to `console.warn` (part-5 AD-13).
- **Temporary instrumentation**, including an instrumented native build for T5/T7/T8 value
  dumps: gate it on an environment variable and remove it before the commit.
- **Pre-existing fixes of 1–3 lines** in files already being edited, such as the
  `bindShape` comment "safefile is a pass-through" (`src/common/shapes.ts:169`). Anything
  larger becomes a new follow-up.
- **Missing scratchpad:** T0 rebuilds `$BASE` references and plugin dirs if an earlier
  session's scratchpad is gone.
- **Wording:** test names, journal rows, README status lines and `.agent-notes/` entries.

## Batches

| Batch | Tasks | Mode | Done |
|---|---|---|---|
| [1](batch-1/overview.md) | T0 baselines, native probe fixtures | orchestrator | [x] |
| [2a](batch-2a/overview.md) | T1 cola prologue + fused (95) · T5 `quad_prog_vpsc` (96a) · T7 subset/circuit models (96a) | parallel worktrees | [x] |
| [2b](batch-2b/overview.md) | T2 poly_init keying (97) · T3 `:red` fills (98, 99) · T4 svg rotation (100) · T6 image type (101) | parallel worktrees (with 2a) | [x] |
| [3](batch-3/overview.md) | T8 cola driver + ipsep options (96b) · T9 imagepath / safefile (102) | parallel worktrees | [x] |
| [4](batch-4/overview.md) | T10 ipsep wiring (96c) · T11 docs | parallel | [x] |
| [5](batch-5/overview.md) | T12 final verification, close-out, re-sign stop | orchestrator | [ ] |

## Documents

- [decisions.md](decisions.md): AD-1 to AD-8 (locked) plus the carried decisions.
- [decision-journal.md](decision-journal.md): append-only execution log.
- Diagrams: [diagrams/component-map.md](diagrams/component-map.md), [diagrams/data-flow.md](diagrams/data-flow.md).
- Global journal: each task's row also goes to `plans/decision-journal.md`, and T12 adds a
  mission-summary row there.

## Conventions

- Use diagnosis mode (`~/.claude/rules/diagnosis.md`) for every discrepancy. Each fix's
  journal row records the mechanism, origin, causal chain and what was ruled out.
- Every ported symbol keeps `/** @see lib/...:fn */`. Tests come first (TDD). C has no
  ipsep tests (`tests/` has none), so the T0 native fixtures are the specification.
- Parallel tasks are developed in separate git worktrees. The orchestrator lands them one
  at a time: cherry-pick, gates, journal row, commit. Batches 2a and 2b run as one wave.
  Journal and README updates land as one `docs(mission)` commit per batch.
- Model routing:
  - implementation: `typescript-pro` (sonnet);
  - T5, T7 and T8: `typescript-pro` (opus), because they are large numeric ports;
  - T11: `documentation-engineer` (locale edits need Bash and Edit).
