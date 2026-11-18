# Mission: issue #184: json0 prints graph and cluster `bb` and edge `pos`

## Objective

Native `-Tjson0` prints the layout attributes `attach_attrs` writes back: the
root's and each cluster's `bb`, and each edge's `pos`. The port's json0 prints
node `pos`/`width`/`height` and nothing else from the write-back.

**Mechanism (checked at planning against base `89613a69` and graphviz
16.1.1).** C's `json_begin_graph` runs `attach_attrs(job->gvc->g)` for
`FORMAT_JSON0` (`plugin/core/gvrender_core_json.c:56-67`), and `json_end_graph`
writes later. `write_attrs` prints what `agxget` returns, so the stored `bb`
and `pos` print.

The port's `Json0Renderer.endGraph` (`src/render/json.ts:686-689`) hands
`attachAttrs` to `attachBeforeWriteWithClusterEdges`
(`src/render/json-cluster-edge.ts:34-39`). On a graph with no cluster edges,
that helper returns it uncalled, and the renderer runs it after
`buildJson(g, false)` has written. json0 has no draw lookup to overlay `bb` or
edge `pos` (`-Tjson` does), and only nodes have a fallback
(`nodeLayoutAttrs`). So the write sees attributes with no `bb` and no edge
`pos`. fdp graphs with cluster edges already attach first (#135), which is why
`json-cluster-edge.test.ts` matches native.

**Fix (AD-1).** Attach, then write: C's order, for every json0 render
([harness/prototype.diff](harness/prototype.diff), 2 lines). Correct the two
comments that claim an overlay json0 lacks.

**Evidence ([harness/](harness/)).**

- **Probes** (10 inputs × 8 engines, `compareJson` against native 16.1.1
  json0): head equals native in 79 of 80 rows (base: 0). The other row,
  `concentrate`/sfdp, carries sfdp's 4-cycle orientation (#257); each of its
  new diffs is in base `-Tjson` too (AD-2).
- **Subgraph render** (#135's `sub.gv`, subgraph `s`): `[]` (base: 3 missing
  keys).
- **Smoke survey** (49 smoke inputs × 8 engines, 392 rows):
  - head equals native in 373 rows;
  - 17 rows gain diffs, all sfdp, every one also in base `-Tjson`
    (`unowned` 0);
  - `polypoly`/osage keeps a node `pos` diff the base has;
  - `2717`/fdp: native crashes (`SEGVx5`);
  - no stderr row changes.

Done means the issue's criterion: `compareJson` of the port's json0 against
native reports no missing `bb` or `pos` on the repro, on the subgraph render,
and on the targeted survey. Type `fix`, a patch release.

**Out of scope:**

- json0 key order (native's is alphabetical; AD-1 consequences);
- the root name `%1` (#185);
- sfdp layout divergence (#257, `parity-sfdp.json`);
- `ortho`'s warning newline (#246, which predates this change on probe
  `ortho.gv` under dot and neato);
- `-Tjson`'s attach order (AD-1 B).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 89613a69..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `89613a69c99a86ae06354f02bd26d13916c417b4` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-184 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-184/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(json): attach layout attributes before json0 writes as c does

  <two to four lines: json_begin_graph runs attach_attrs for json0 before
  json_end_graph writes, so native prints the graph and cluster bb and edge
  pos; the port attached after the write and json0 has no overlay for them>

  Refs: #184
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-attach-before-write.md#bytediff) | 0 changed outputs in the default formats |
| 6 | Targeted survey | see [T1](batch-1/T1-attach-before-write.md#targeted-survey) | `unowned` 0, no stderr `same`→`DIFF` |

Oracle (ADR-0002, the newest accepted ADR):
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` (dot)
or `/tmp/ghl1611-all` (other engines), as `test/corpus/oracle-paths.mjs` says.
`harness/json0-compare.ts` imports it. Run `oraclePreflight`
(`test/corpus/oracle-env.ts`) for `dot` and for `sfdp` before trusting native
output. A missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`. The issue
has no `upstream-16.1.1` label. Check `uptime` before gate 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `89613a69`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A non-test file outside [T1's write-set](batch-1/T1-attach-before-write.md#write-set)
   must change. Journal why and stop.
2. A probe row whose head json0 has a `compareJson` diff, other than
   `concentrate`/sfdp's (each of which must be in base `-Tjson`). Write the
   diagnosis artifact and stop.
3. Any gate 6 row with `unowned` > 0, or stderr going `same`→`DIFF`, or any
   changed output in gate 5. Diagnose and stop.
4. `-Tjson`, `-Tdot`, `-Txdot` or `-Tsvg` output changes anywhere (gate 5
   covers them).
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and layout within the write-set. Whether AD-1's call reads as
  the prototype's one line or as an explicit attach-and-undo.
- More probes in `harness/extra/` for a path the 10 do not reach.
- An existing test that pinned json0's old key order or absent keys: update it
  to native's values and journal it, with native's output as evidence.
- A survey row still differing from native for a reason this change does not
  touch (head diffs all in base, or in base `-Tjson`): link the issue that owns
  it, or open a `follow-up`, and go on.
- Native `SEGVxN` rows (fdp, #182 AD-4): compare head with base only, and
  journal it.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-attach-before-write.md](batch-1/T1-attach-before-write.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the 10 inputs |
| [harness/native/](harness/native/) | native 16.1.1 json0 stdout per probe and engine |
| [harness/json0-compare.ts](harness/json0-compare.ts) | base and head json0 against native, with `lost`/`unowned` columns |
| [harness/prototype.diff](harness/prototype.diff) | the chosen prototype, reverted |
| [harness/survey.md](harness/survey.md) | probe design, survey selection, planning results |
| [harness/results/](harness/results/) | planning TSVs |
| [diagrams/data-flow.md](diagrams/data-flow.md) | C's order and the port's, before and after |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-184.md` (novel). json0 and json take their layout
  attributes by different routes: json0 from `attrs` after an early attach,
  json from the held xdot render's overlay. Also note that
  `attachBeforeWriteWithClusterEdges` returns its callback uncalled on a graph
  with no cluster edges, and that json0's key order is not native's. Update
  `.agent-notes/issue-135.md:46-48`, which says json0 cannot be checked with
  `compareJson` until #184 lands.
- The final message ends with the driver's status line.

## Summary (execution, 2026-11-17)

- **Tasks:** 1 of 1 (T1). Base `89613a69`; per-task history under tag
  `issue-184/pre-squash`.
- **Change:** `Json0Renderer.endGraph` attaches, then writes
  (`src/render/json.ts`); four comments corrected (`json.ts`,
  `json-cluster-edge.ts`). Tests: new `src/render/json0-attach.test.ts` (82
  cases), `json-dup-cluster.test.ts` subgraph render now covers json0.
- **Decisions:** 16 journal rows, none flagged for review. The brief expected
  79 equality rows red on the base; 78 were (`clusteredge`/fdp already
  attached first), as the planning TSV shows.
- **Gates:** typecheck exit 0; `npm test` 601 files, 14954 passed; goldens
  5/5; corpus + docs 25 files, 2863 passed; smoke bytediff 1960 identical, 0
  diffs; probes 79 of 80 equal native, `concentrate`/sfdp `unowned` 0; survey
  392 rows, 373 equal native, `unowned` 0 everywhere, no stderr regressions.
- **Known and out of scope:** json0 key order and the root name `%1` (#185);
  sfdp layout divergence (17 survey rows and one probe row, #257);
  `polypoly`/osage node `pos` (`json-parity-osage.json`, on the base too);
  `2717`/fdp native crash (head bytes equal base); `ortho`'s warning newline
  (#246). No follow-up or ruling issue was needed.
