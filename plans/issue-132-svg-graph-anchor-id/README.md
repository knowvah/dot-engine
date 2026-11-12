# Mission: issue #132: a subgraph render's graph anchor and area ids say graph<AGSEQ>

## Objective

`svgGraphId` (`src/render/svg-id.ts:54-56`) hardcodes `graph0`. `src/gvc/device.ts:235`
(graph-label HTML anchor ids) and `:391` (`resolveObjAnchor`, so `obj.id`: the svg
`<g id="a_...">` anchor and the cmapx/cmap graph `<area id=...>`) use it. C's
`getObjId` (`lib/common/emit.c:209-247`) gives `"graph" + AGSEQ(obj)` for the graph
being emitted. Root renders have AGSEQ 0, so only a **subgraph render** (a subgraph
laid out and rendered as its own graph) differs. Part 11 T9 fixed the top `<g>` id and
the gradient ids with a local `graphObjId` in `src/render/svg-graph.ts:243-245`.

Native evidence from planning (16.1.0, part 10 T15's `subg-after-free.c` harness, root
layout, render, free, then the subgraph): subgraph `s` with `URL`+`tooltip` gives
`<g id="a_graph1">` and `<area ... id="graph1" ...>`; `cluster_k` gives `a_graph2`,
`graph2`; an HTML label cell `href` inside `s`'s graph label gives `a_graph1_0` and area
`graph1_0`. The port prints `graph0` in all of them. Everything else in the svg from the
`<g id="graph` line on is already byte-equal to native.

Done means: `svgGraphId` returns `job.objId(g.attrs.get('id'), 'graph' + g.seq, true)`;
`graphObjId` is deleted and `svg-graph.ts` uses `svgGraphId`; tests pin the anchor, area
and HTML-anchor ids against new native refs; the stale comment in
`src/gvc/layout-reset.edges.test.ts:81-82` is replaced and that test compares from the
graph group on; follow-ups README item 142 is marked DONE; gates green. Type `fix`.

**Out of scope:** the cmapx `-0` coordinate defect found while planning (draft issue in
[followup-cmapx-neg-zero.md](followup-cmapx-neg-zero.md); T1 files it), the svg header
lines (generator comment, `<svg>` attribute wrapping), cluster/node/edge ids in a
subgraph render, and the native abort on `subg-html.gv` (upstream, see T1).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 88871494..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch, never merge `main` into it.
- **Base sha:** `8887149410789a1297af3874b74c20b94fed3aae` (tip at planning time). If
  the tip moved, use the tip at execution start as the base and journal it.
- Per-task commits while working: first `docs(mission): add issue-132 brief` (this
  directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run standalone.
- **Finish (T1's last step):** `git tag issue-132/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(svg): number a subgraph render's graph anchor and area ids by seq

  getObjId names the graph being emitted "graph" + AGSEQ, but svgGraphId
  hardcoded graph0, so a subgraph render's graph anchor, cmapx area id
  and graph-label HTML anchor ids said graph0 where native says graph1
  or graph2. Part 11 T9 fixed the top group and gradient ids with a
  local copy; svgGraphId now carries the sequence and the copy is gone.

  Refs: #132
  ```

  Add a gates line to the body as #131's commit does. Lines ≤ 80, subject ≤ 72, no
  attribution. Never push, rebase, sign, open a PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-svg-graph-id-seq.md#bytediff) | expected: no change (root seq is 0) |
| 6 | Targeted survey | see [T1](batch-1/T1-svg-graph-id-seq.md#targeted-survey) | ids equal native |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), plugin dir `/tmp/ghl` (core + dot_layout: enough for dot svg/cmapx). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) or `preflightOrExit` before trusting
native output; a missing `config8` is fixed with `GVBINDIR=<dir> <dot> -c`. Check
`uptime` before gate 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `88871494`
([decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose to a stated
   mechanism, journal it, stop.
3. Native, regenerated with the preflighted oracle, does not print `graph1`/`graph2`
   (and `graph1_0`) where the planning evidence above says: the premise is wrong; stop
   with the evidence.
4. The smoke bytediff or targeted survey shows a changed root-render output: halt per
   the queue rules (the change must be invisible on root renders).
5. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and helper structure inside `svg-subgraph-id.test.ts`, mirroring T9's.
- How the HTML-anchor native ref is stored, within AD-3.
- Which root-render corpus ids make up gate 6, within the rule in T1.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-svg-graph-id-seq.md](batch-1/T1-svg-graph-id-seq.md) | the task |
| [harness/](harness/) | fixtures + `regen.sh` for the native refs |
| [followup-cmapx-neg-zero.md](followup-cmapx-neg-zero.md) | draft follow-up issue |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the graph id flows |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- One row in `plans/decision-journal.md` (project journal): mechanism, files, gates.
- `.agent-notes/issue-132.md`: record the native abort in `gvFreeLayout` of a subgraph
  with an HTML graph label (novel); otherwise state nothing novel.
- Final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1). No subagent used.
- **Result:** `svgGraphId` returns `graph<AGSEQ>`; `graphObjId` is deleted. A subgraph render's
  svg graph anchor, cmapx graph area id and graph-label HTML anchor ids equal native
  (`a_graph1`, `a_graph2`, `graph1`, `graph2`, `a_graph1_0`, `graph1_0`); root renders are
  unchanged.
- **Decisions:** 2 journalled push-forwards (test shape: the html svg case compares the whole
  svg from the group on, and a root case is pinned in the same file; gate 6 id selection). For
  review: none changes an architecture decision. No stop condition triggered.
- **Gates (final head):** typecheck 0; `npm test` 559 files / 13222 tests; goldens 5/5; corpus +
  docs 2837; smoke bytediff 1960/1960 identical; targeted survey 26/26 rows head = base (5 corpus
  ids + 8 root probes, svg and cmapx), subgraph harness cases equal native.
- **Follow-ups filed:** #175 (the planned cmapx `-0`), and six the survey found on root renders,
  all on the base too: #176, #177, #178, #179 (cmapx ids, extra area, order), #180 (svg anchor
  ids lack the layer prefix), #181 (`clust_in_layer` not ported).
- **Known limits:** cmapx is pinned by id list only (AD-2), because of #175. Native aborts in
  `gvFreeLayout` on the html fixture after its renders; `regen.sh` tolerates it
  (`.agent-notes/issue-132.md`).
