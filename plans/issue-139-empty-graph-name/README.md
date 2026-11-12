# Mission: issue #139: dot output keeps an empty graph name (`digraph "" {`)

## Objective

cgraph tells a nameless graph from one named `""`. `agopen(NULL)` and `subgraph {` map
no name, so `agnameof` returns `%<id>`. `agopen("")` and `subgraph ""` map the name
`""` (`lib/cgraph/id.c:agmapnametoid`, `idmap`). `write_hdr` (`lib/cgraph/write.c:338-355`)
treats a graph as named when `name && name[0] != '%'`, so `""` prints as `digraph "" {`
and `subgraph "" {`. The port's parser already records the difference in
`Graph.anonymous` (`src/parser/builder.ts:478`), but three places treat `''` as
nameless:

1. **Root header.** `writeHdr` (`src/render/dot/agwrite.ts:158`) prints a name only when
   `g.name.length > 0`, so `digraph "" {` comes out as `digraph {` (corpus `1896`,
   `1864`, `2734`; dot and xdot, every engine).
2. **Subgraph header and inlining.** `isAnonymous` (`agwrite.ts:97-98`) returns true for
   `''`, so `subgraph "" {` prints as a bare `{` and an empty `subgraph "" {}` is
   inlined away by `irrelevantSubgraph` (C's `irrelevant_subgraph` returns false for any
   name not starting with `%`). Corpus `2621` has `subgraph ""`.
3. **Anonymous id counter.** `if (!ast.id) processor.advanceAnonId()`
   (`src/parser/builder.ts:483`) consumes cgraph's anonymous id 1 for `digraph "" {`
   too, so its first anonymous subgraph is `%3` where native has `%1`. That name shows
   in json and json0 subgraph objects.

Planning evidence (16.1.0, harness in [harness/](harness/), refs in `harness/out/`): a
trial edit of exactly those three lines (reverted) made all six fixtures byte-equal to
native in dot, xdot and cmapx, and made every json root and subgraph `name` equal native,
except the anonymous root's json `name` (`""` against native `%1`). That is issue #185,
out of scope here. On the base, corpus `1896` and `2734` (`-Kdot`) differ from native in
dot and xdot by line 1 alone (`digraph {` against `digraph "" {`), and cmapx is equal.
`1864` and `2621` took longer than the 60 s native cap at planning.

A fourth change keeps the programmatic API stable: `createGraph()` (`src/api/builder.ts:343`)
builds `new Graph(opts?.name ?? '', kind)` with `anonymous = false`. After fix 1 an
unnamed builder graph would print `digraph "" {`. An omitted `name` becomes anonymous, as
`agopen(NULL)` is (AD-4).

Done means: the four changes, a new test pinning the harness cases against native refs,
builder tests for the API default, follow-ups README item 153 marked DONE, gates green.
Type `fix`.

**Out of scope:**
- The json/json0 root `name` of an anonymous graph (#185).
- Name wrapping at `Max_outputline` through `xdotId` (#167). It edits the same
  `writeHdr` lines later; leave `xdotId` as it is.
- SVG: `emitGraphTitle` and `emitTitlePagesComment` test `name[0]`, as C does; native SVG
  is identical for `""` and nameless roots.
- `docs-site/guide/api.md:282`. It says the default is `name: ''`, which is still what
  `graph.name` reads. Editing the English page would make about 30 translations stale.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline c0a8aeb6..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `c0a8aeb6e2cfd8ffa9becadbcec899ec0645d02a` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-139 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-139/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): keep an explicit empty graph name as write_hdr does

  cgraph maps "" as a name: only a nameless graph is anonymous (%N).
  write_hdr prints any name not starting with '%', so digraph "" {
  and subgraph "" { survive a round trip. The port treated '' as
  nameless in three places: writeHdr dropped the root's "", isAnonymous
  dropped (or inlined) a subgraph "", and the parser consumed anon id 1
  for digraph "", numbering its anonymous subgraphs from %3, not %1.
  createGraph() with no name is now anonymous, as agopen(NULL) is, so
  an unnamed builder graph still prints digraph {.

  Refs: #139
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-empty-graph-name.md#bytediff) | every changed output equals native |
| 6 | Targeted survey | see [T1](batch-1/T1-empty-graph-name.md#targeted-survey) | no head-only regression vs native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` for dot. Other engines need a `$TMPDIR` plugin dir per
`.agent-notes/issue-129.md`. Run `oraclePreflight` (`test/corpus/oracle-env.ts`) for each
dir and engine before trusting native output. Check `uptime` before gates 5-6; above 12,
wait.

Baseline at planning: typecheck and `npm test` green on `c0a8aeb6`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change. One exception: a test whose expectation
   relies on `''` meaning nameless (a `new Graph('', kind)` without `anonymous` passed to
   the dot writer). Give it `anonymous = true` and journal it. Do not change what it
   expects.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. `regen.sh`, run with the preflighted oracle, produces refs that differ from the
   committed `harness/out/*`. The premise is in doubt: stop with the diff.
4. The smoke bytediff or targeted survey shows a changed output that does not equal
   native: halt per the queue rules.
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and helper shape in `empty-graph-name.test.ts` (mirror
  `echo-attr-wrap.test.ts`).
- Comment wording on the touched doc comments (`graph.ts`, `cgraph-ops.ts`).
- Which extra corpus ids join gate 6, within the rule in T1.
- Filing a `follow-up` issue for any unrelated native difference the survey shows on
  base and head alike (check #185 and #167 first).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-5, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-empty-graph-name.md](batch-1/T1-empty-graph-name.md) | the task |
| [harness/](harness/) | six fixtures, `regen.sh`, native refs in `out/` |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the name and the anonymous flag flow |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-139.md`: corpus `1864` and `2621` run longer than 60 s natively per
  format (`2621` is `oracleError` in `dot-parity-dot.json`); `compareJson` skips the top-level
  `name`, and the dot-parity comparator passed `1896` despite the header. Surveys cannot
  see this defect class. Otherwise state nothing novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 done.
- **Decisions:** one flagged for review. AD-1 as written read `g.anonymous` alone for the root
  header; native also treats a name starting with `%` as no name (`digraph "%foo" {` is written
  `digraph {`), which the base handled. `isAnonymous` is now `agNameOf(g)` starting with `%`, for
  root and subgraph alike, as `write_hdr` tests it. A seventh fixture, `harness/root-percent.gv`,
  pins it. The other decisions are in [decision-journal.md](decision-journal.md): files beyond the
  write-set (`LOCALNAMEPREFIX` exported; six `agwrite.branch.test.ts` fixtures made anonymous;
  `regen.sh` lists the new fixture) and the json-name helper shape.
- **Gates:** typecheck 0; `npm test` 564 files / 13312 tests; goldens 5/5; corpus + docs 24 files /
  2839 tests; smoke bytediff 2352 jobs, 16 changed (`1896`, dot and xdot, 8 engines), 14 byte-equal
  to native and 2 accepted-row changes (sfdp, `drift-exonerated`); targeted survey 64 rows, 44
  finished, 22 changed, 20 byte-equal to native and 2 equal modulo #195, 20 capped.
- **Follow-ups:** #194 (`%`-prefixed names in the parser), #195 (record nodes with an html label).
  #185 is unchanged.
