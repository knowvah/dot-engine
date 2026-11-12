# Mission: issue #135: json warns on duplicate cluster names

## Objective

C's json writer numbers subgraphs in `label_subgs` and records each cluster's name in a
map with `insert` (`plugin/core/gvrender_core_json.c:611-623`), which warns
`Duplicate cluster name "<name>"` when a second cluster carries a name already mapped.
The port's json (`assignIds`, `src/render/json.ts:372`) has no map and prints nothing.

Planning evidence (16.1.0, refs in [harness/out/](harness/out/)):

- Native warns under `-Tjson` and `-Tjson0`, every engine, once per repeat in DFS
  order, after any `layers not supported` warnings; never under svg. The port prints
  nothing on any of the 26 harness cases.
- Corpus: `1436`, `1902`, `graphs-b7` (smoke list) carry repeated cluster names; native
  json warns on all three. Their other stderr already equals native on 8 engines.
- fdp also prints `fillMap`'s `Two clusters named ...` warning, which the port lacks: a
  separate gap, drafted as a follow-up, not fixed here.

Done means: `label_subgs`, `insert` and `lookup` are ported into
`src/render/json-cluster-edge.ts` and drive `assignIds`; a new test pins the port's
stderr to the native refs (fdp minus the fillMap line); follow-ups README item 146 is
marked DONE; the two drafted follow-ups are filed; gates green. Type `fix`.

**Out of scope:** the fillMap warning ([followup-fillmap-warning.md](followup-fillmap-warning.md));
an inherited `cluster` attribute ([followup-inherited-cluster-attr.md](followup-inherited-cluster-attr.md),
AD-5); json stdout.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 71e9e0ea..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `71e9e0ea0a02ebf0fe5e0895cb0c88748717673f` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-135 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-135/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(json): warn on duplicate cluster names as write_graph does

  The json writer's label_subgs records each cluster's gid by name, and
  insert warns "Duplicate cluster name" when a later cluster reuses a
  name. The port numbered subgraphs without that map and found cluster
  nodes' gids by search, so json and json0 printed nothing. label_subgs,
  insert and lookup are now ported and drive assignIds; gids are
  unchanged (lookup keeps the first cluster of a name, as the search
  did).

  Refs: #135
  ```

  Add a gates line to the body as #134's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-dup-cluster-warn.md#bytediff) | only `graphs-b7` json jobs change; stderr equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-dup-cluster-warn.md#targeted-survey) | head stdout = base; head stderr = native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` for dot. The other seven engines need `neato_layout`:
build a dir under `$TMPDIR` per `.agent-notes/issue-129.md` (symlink
`build/plugin/{core,dot_layout,neato_layout}/libgvplugin_*`, then
`GVBINDIR=<dir> <dot> -c`). Run `oraclePreflight` (`test/corpus/oracle-env.ts`) for
each dir/engine before trusting native output. Check `uptime` before gates 5-6; above
12, wait.

Baseline at planning: typecheck and `npm test` green on `71e9e0ea`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`: the premise is in doubt; stop with the diff.
4. The smoke bytediff or targeted survey shows a changed output that does not equal
   native as T1 defines it, or any json stdout change: halt per the queue rules.
5. Any cluster-node or subgraph `_gvid` changes: AD-1's equivalence claim is wrong;
   stop.
6. `json.ts` would grow past 730 lines, or an architecture decision in
   [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names, helper shape and case table layout in `json-dup-cluster.test.ts`.
- Exact parameter names of the three ported functions, within AD-1's contract.
- Adding a corpus id the re-run scan finds to gate 6.
- Filing a `follow-up` issue for any unrelated native difference seen on base and head
  alike.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, follow-ups, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-dup-cluster-warn.md](batch-1/T1-dup-cluster-warn.md) | the task |
| [harness/](harness/) | fixtures, `regen.sh`, native stderr refs in `out/` |
| [followup-fillmap-warning.md](followup-fillmap-warning.md) | draft issue: fillMap warning |
| [followup-inherited-cluster-attr.md](followup-inherited-cluster-attr.md) | draft issue: inherited `cluster` |
| [diagrams/data-flow.md](diagrams/data-flow.md) | ids and the warning in one render |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-135.md`: `json.ts` held literal NUL bytes that made `grep` skip
  it; `isACluster` ignores inherited `cluster`; anything else novel. Otherwise state
  nothing novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 complete (T1).
- **Decisions:** 4 journaled. One for review: AD-1's "gids do not change" holds for
  root renders only. On a render of a subgraph alone, C's `label_subgs` numbers the
  rendered subgraph too; the port now does the same and equals native there (the base
  did not). See the journal row "AD-1 is incomplete for a subgraph render".
- **Outside the planned write-set:** `src/render/json.branch.test.ts` (a hand-built
  subgraph fixture now sets `root`), `harness/sub.gv`, `harness/out/sub.s.*` and
  `harness/regen.sh` (the subgraph render refs).
- **Gates:** typecheck 0; `npm test` 561 files / 13266 tests; goldens 5/5; corpus +
  docs 23 files / 2837 tests; smoke bytediff 1960 jobs, 1952 identical, the 8
  `graphs-b7` json jobs changed, all 8 equal to native; targeted survey 96 rows, stdout
  head = base on 96, stderr head = native on the 90 rows native finished.
- **Follow-ups filed:** #182 (fillMap warning), #183 (inherited `cluster`), #184 (json0
  prints no `bb` or edge `pos`; found here, not caused here).
- **Known issues:** none in scope. fdp still lacks native's `Two clusters named` line
  (#182).
