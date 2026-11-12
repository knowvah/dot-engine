# Mission: issue #130: build make_flat_adj_edges's rank=source subgraph

## Objective

C `make_flat_adj_edges` (`~/git/graphviz/lib/dotgen/dotsplines.c:1177-1185`) makes
a subgraph `xxx` of the aux graph, sets `rank=source` on it, and clones `auxt` into
that subgraph (`cloneNode(subg, tn)`). `auxh` goes into the aux root. The port's
`buildFlatAux` (`src/layout/dot/splines-flat.ts:178-198`) builds no subgraph and
clones both nodes into the aux root. Part 11 T1 found no output difference on w4
and six variants. The port keeps every branch of the C anyway (CLAUDE.md), so this
mission adds the subgraph.

Why no output change is expected: with `rank=source`, `collapse_sets` makes `auxt`
the minset leader. `minmax_edges` (`rank.c:396-425`) then reverses `auxt`'s
in-edges, which `acyclic` would reverse anyway. `minmax_edges2` (`rank.c:428-450`)
adds an edge only to a node with no in-edges, and `auxh` always has `hvye`
(`auxt -> auxh`, weight 10000). The native probe in T1 tests this reasoning. It
does not assume it.

Done means:
- `buildFlatAux` creates `agsubg(auxg, 'xxx', true)` with `rank=source`, in C's
  order, and `auxt` is a member of it.
- A test pins the subgraph and the aux ranks.
- An instrumented native build shows the same aux ranks (auxt, auxh, maxrank) as
  the port on w4 and the variants in T1.
- Follow-ups README item 140 is marked DONE.
- All gates are green.

Type `fix`, so this is a patch release.

**Out of scope:** `cloneGraph`, `agnode`, `setState`'s symbol list (issue #131),
and every other flat-edge path.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Read the queue rules (`.claude/queue-policy.md`, injected into the session). They
   override this brief where the two disagree.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 04d10447..`.
4. Read `.agent-notes/pt30-flat-adj-aux.md` and `.agent-notes/issue-129.md` (the
   plugin dir and `.mts` notes apply here).

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create no
  branch and never merge `main` into it.
- **Base sha:** `04d10447ae0b37ac949e5ae7b228e5c080c2d80d` (the tip at planning
  time). If the tip has moved, use the tip at execution start as the base and
  journal it.
- Per-task commits while you work: first `docs(mission): add issue-130 brief` (this
  directory), then `fix(T1): ...`, then `docs(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-130/pre-squash`, then
  `git reset --soft <base>` and one commit:

  ```
  fix(dot): build make_flat_adj_edges's rank=source subgraph

  C clones auxt into an aux subgraph "xxx" with rank=source before
  ranking the flat-adjacent aux graph; the port cloned it into the aux
  root. The subgraph makes auxt the minset leader. An instrumented
  native build shows the same aux ranks as the port on w4 and its
  variants, so no output changes; the port now keeps the C branch.

  Refs: #130
  ```

  If the probe or the gates give a different result, rewrite the body to say
  so. Lines ≤ 80, subject ≤ 72, no attribution. Never push, rebase, sign, open a
  PR, or use `git stash`.

## Quality gates (in order; record each in the journal)

| # | Gate | Command | Pass |
|---|---|---|---|
| 1 | Types | `npm run typecheck` | exit 0 |
| 2 | Unit | `npm test` | exit 0 |
| 3 | Goldens | `bash test/golden/gates.sh` | 5/5 PASS (Gate 4 is a line ratchet) |
| 4 | Corpus + docs | `npx vitest run test/corpus test/docs` | exit 0 |
| 5 | Smoke bytediff | see [T1](batch-1/T1-source-subgraph.md#bytediff) | every changed output equals native; expected: no change |
| 6 | Targeted survey | see [T1](batch-1/T1-source-subgraph.md#targeted-survey) | head = base; head vs native no worse than base |

Oracle (ADR-0001, the newest accepted ADR): `~/git/graphviz/build/cmd/dot/dot`
(16.1.0), `GVBINDIR=/tmp/ghl` (dot only, which is enough here). Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) or `preflightOrExit` before you
trust native output. If `config8` is missing, run `GVBINDIR=<dir> <dot> -c`.
Check `uptime` before the native probe and gate 6, and wait while it is above 12.

Baseline at planning: `npm run typecheck` and `npm test` are green on `04d10447`
(see [decisions.md](decisions.md#baseline)).

## Stop conditions

1. A file outside the write-set needs a change.
2. The same gate check fails twice in a row after fix attempts: diagnose it to a
   stated mechanism, journal it, and stop.
3. The native probe shows different aux ranks than the port on any variant, before
   or after the change. That is a separate divergence. Enter diagnosis mode, record
   the artifact, and file a `follow-up` issue. Halt if the subgraph change is what
   causes the difference.
4. The smoke bytediff or the targeted survey shows an output that differs from the
   base and does not equal native: halt, per the queue rules.
5. An architecture decision in [decisions.md](decisions.md) turns out to be wrong.
6. Edits would push `splines-flat.ts` past its HEAD line count (571). The
   complexity hook blocks that. Use AD-3. If AD-3 is not enough, stop. Do not
   split the file in this mission.

## Push-forward (decide alone, journal it)

- How the test reaches the aux graph. The default is a `vi.mock` passthrough of
  `./splines-clone.js` that snapshots `auxg` in `cleanupCloneGraph` (AD-4).
- Test wording and fixture names, and whether the variants are one `it.each`.
- Which corpus ids make up the targeted survey, within the rule in T1.
- The C trace format and the env var name in the instrumented build.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-4, baseline, rollback |
| [batch-1/overview.md](batch-1/overview.md) | the one batch |
| [batch-1/T1-source-subgraph.md](batch-1/T1-source-subgraph.md) | the task |
| [diagrams/data-flow.md](diagrams/data-flow.md) | aux build → rank, with the new subgraph |
| [diagrams/component-map.md](diagrams/component-map.md) | touched components |
| [decision-journal.md](decision-journal.md) | mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  probe result, files, gates.
- Write `.agent-notes/issue-130.md` only for something novel. Otherwise the journal
  row says there was nothing novel.
- The final message ends with the driver's status line.

## Summary (2026-11-10)

- **Tasks:** 1 of 1 (T1). No subagent.
- **Result:** `buildFlatAux` builds `xxx` with `rank=source` and clones auxt into it; `cloneNode`
  installs into a subgraph as C's `agnode(subg, name, 1)`. The instrumented native build prints the
  same auxt/auxh ranks, maxrank, minset and flat-edge flag as the port on V1-V9 and two `ordering`
  variants (11 in the test).
- **Not as planned:** the subgraph is not output-neutral on its own. C's `ordered_edges` recurses
  into `xxx`, and the port's `flatEdge` did not flag `dot_root(g)` as C's `flat_edge` does, so an
  input with a node `ordering` on auxt changed against the base and away from native. Fixed at the
  origin (`fastgr.ts`, outside the planned write-set) with a stated mechanism; see the journal. No
  corpus id reaches it.
- **Decisions:** 5 journalled (test shape and V8/V9; minset/flag assertions; the `flatEdge` fix and
  its write-set; marker-bundle id selection; three follow-ups). For review: the `flatEdge` fix.
- **Gates (final head):** typecheck 0; `npm test` 558 files / 12778 tests; goldens 5/5; corpus +
  docs 2837; smoke bytediff 1960/1960 identical; targeted survey 108/108 rows head = base, head vs
  native no worse than base.
- **Follow-ups filed:** #169 (node-default `ordering` ignored), #170 (aux mincross order with a
  node `ordering` on labelled flat-adjacent port edges), #171 (record-shape warning not printed).
  All three are on the base too.
- **Known limits:** 12 very slow ids were not scanned for reachability (listed in the journal).
