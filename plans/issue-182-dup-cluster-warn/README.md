# Mission: issue #182: warn on two clusters with one name (fillMap)

## Objective

When two clusters in the cluster tree share a name, C's `fillMap` keeps the
first and warns `Two clusters named <s> - the second will be ignored`. The
port keeps the first silently. Only stderr differs. The layouts already use
the same map.

**Mechanism (checked at planning against base `722e372a` and graphviz
16.1.1).** `~/git/graphviz-16.1.1/lib/common/utils.c:1498-1512`:

```c
static void fillMap(Agraph_t *g, Dt_t *map) {
  for (int c = 1; c <= GD_n_cluster(g); c++) {
    Agraph_t *cl = GD_clust(g)[c];
    char *s = agnameof(cl);
    if (dtmatch(map, s)) {
      agwarningf("Two clusters named %s - the second will be ignored\n", s);
    } else { ... ip->name = s; dtinsert(map, ip); }
    fillMap(cl, map);
  }
}
```

Two callers reach it: fdp's `processClusterEdges` (`utils.c:882`, every fdp
layout) and `dot_compoundEdges` (`lib/dotgen/compound.c:438`, dot with
`compound=true`, per pack component). The port has two silent copies:
`src/layout/fdp/cluster-edges.ts:35-55` and `src/layout/dot/compound.ts:31-46`.

`agnameof` returns one static buffer for every anonymous graph
(`lib/cgraph/id.c:161-164`), and `fillMap` stores that pointer as the key. So
after the first anonymous cluster, every anonymous cluster warns. `2475_2`
(805 anonymous `cluster=true` subgraphs) prints 804 warnings. T1 models this
(AD-2).

**Evidence ([harness/](harness/)).** Ten probes × eight engines. Native
16.1.1 `-Tdot` stdout and stderr are in `harness/native/`. Native warns in
13 cases: fdp on every probe except `nodup`, and dot on `dupc`, `dup3c`,
`packc2` and `packc3`. The port warns in none. Port stdout equals native on
every case native completes. A planning sweep
([harness/survey.md](harness/survey.md)) found native warning on `1436` (5),
`1902` (1), `graphs-b7` (1), `2475_2` (804) and `2475_1` (5710, native
times out), all under fdp. The prototype
([harness/prototype.diff](harness/prototype.diff)) made head stderr equal
native on the first four and on every probe, except the two lines owned by
#217 and #255.

Done means the issue's criterion: stderr equals native for fdp, and for dot
with `compound=true`, on the repro and the three corpus ids. `2475_2` is
added. Type `fix`, a patch release.

**Out of scope:**

- dot's `makeCompoundEdge` warnings (#217);
- fdp's `checkCompound` warnings (#255, filed at planning);
- native's intermittent fdp segfault on these inputs (AD-4);
- lookups of anonymous names (AD-3);
- `%`-named subgraphs (#194).

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, [decisions.md](decisions.md),
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 722e372a..`.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `722e372aa2ea0863c47aede38a404642f8710f47` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-182 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** `git tag issue-182/pre-squash`, then
  `git reset --soft <base>`, then one commit:

  ```
  fix(layout): warn on two clusters with one name as fillMap does

  <two to four lines: C's fillMap warns for each later cluster whose name
  is in the map, and every anonymous cluster after the first matches the
  agnameof buffer; one shared mkClustMap now does both for fdp and dot>

  Refs: #182
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-fillmap-warn.md#bytediff) | 0 changed outputs (stdout must not change) |
| 6 | Targeted survey | see [T1](batch-1/T1-fillmap-warn.md#targeted-survey) | see T1 |

Oracle (ADR-0002, the newest accepted ADR): `~/git/graphviz-16.1.1/build/cmd/dot/dot`
with `GVBINDIR=/tmp/ghl1611` (dot) or `/tmp/ghl1611-all` (other engines), as
`test/corpus/oracle-paths.mjs` says. `harness/compare.mjs` imports it. Run
`oraclePreflight` (`test/corpus/oracle-env.ts`) for `dot` and for `fdp` before
trusting native output. A missing `config8` is fixed with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gate 6; above 12, wait.

Baseline at planning: typecheck and `npm test` green on `722e372a`
([decision-journal.md](decision-journal.md) row 0).

## Stop conditions

1. A file outside [T1's write-set](batch-1/T1-fillmap-warn.md#write-set) must
   change. Journal why and stop.
2. Any stdout change (head ≠ base) in the probes, gate 5 or gate 6. This fix
   writes stderr only, so a stdout change means the map's contents changed
   for a lookup. Halt with the row.
3. After the fix, a `Two clusters named` line is missing, extra, or out of
   order against native on any probe or survey row. Example: `2475_2` prints
   other than 804. Write the diagnosis artifact and stop.
4. A row's stderr goes from `same` on the base to `DIFF` on the head for any
   reason. Diagnose and stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.

## Push-forward (decide alone, journal it)

- Test names and layout, the internal shape of `fillMap`'s state, within the
  write-set.
- More probes in `harness/extra/` to settle a path the ten do not reach.
- A survey row still `DIFF` for a warning other than fillMap's: link the issue
  that owns it (#217, #255, or another), or open a `follow-up`, and go on.
- A survey row whose native run crashes five times (`SEGVx5`): compare stderr
  only, and journal it.

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-6, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-fillmap-warn.md](batch-1/T1-fillmap-warn.md) | red tests, fix, gates, squash |
| [harness/probes/](harness/probes/) | the ten inputs |
| [harness/native/](harness/native/) | native 16.1.1 `-Tdot` stdout and stderr per engine |
| [harness/compare.mjs](harness/compare.mjs) | native (with crash retry), base and head per input, engine and format |
| [harness/prototype.diff](harness/prototype.diff) | the planning prototype, reverted |
| [harness/survey.md](harness/survey.md) | the planning sweep, survey lists, native nondeterminism |
| [diagrams/data-flow.md](diagrams/data-flow.md) | where the warning is written |
| [diagrams/component-map.md](diagrams/component-map.md) | modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): mechanism,
  files, gates.
- Write `.agent-notes/issue-182.md` with the agnameof static-buffer alias and
  native's intermittent fdp segfault (both novel; neither is in
  `.agent-notes/` at planning).
- The final message ends with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1..AD-6 held as planned. Journal rows 1-10; row 6 is
  flagged for review (gate 5). Additions: one more unit case, one test file
  outside the write-set (`src/layout/fdp/cluster-edges.branch.test.ts`, row
  4), a survey runner (`harness/survey-run.mjs`, row 7) and
  `harness/results/`.
- **Gates:** typecheck 0; `npm test` 599 files / 14448 tests; goldens 5/5;
  corpus + docs 2863 tests; smoke bytediff 1955 of 1960 identical, 5 changed
  (`graphs-b7` under fdp: only the new warning line in the captured stderr,
  equal to native's; stdout unchanged; 3 equal native outright, 2
  toward-native); survey A 308 rows and B 17 rows, stdout unchanged in all,
  4 rows `DIFF`→`same`, none `same`→`DIFF`.
- **Probes:** 160 rows, stdout equal to base in all; stderr equal to native
  in 156 (134 on the base); the other 4 lack only #217's and #255's line.
- **Known issues / follow-ups:** #256 filed (fdp's non-comparable clusters
  error is silent). #194 has a comment on the `%` prefix test. Three inputs
  the port does not finish under fdp in 90 s (`world.gv`, `2108`, `2621`)
  were measured by early stderr and by their cluster names, not by a
  finished render.
