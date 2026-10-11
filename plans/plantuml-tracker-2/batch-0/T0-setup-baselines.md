# T0 — Setup, baselines, native refs

**Agent:** orchestrator. **Depends on:** —. **Rollback:** Reversible.
**Observability:** N/A — records the baselines (survey, perf) every later gate
compares against.

## Task

1. `git switch -c fix/plantuml-tracker-issues-2 main` (working tree: only
   `.claude/settings.autonomous.json` may be dirty — leave it uncommitted), then
   commit the untracked brief first:
   `git add plans/plantuml-tracker-2 .agent-notes/pt-tracker-2-planning.md && git commit -m "docs(plans): add plantuml-tracker-2 mission brief"`.
2. `sh test/corpus/gen-headless-gvbindir.sh` (`/tmp/ghl` lost its config once
   during planning: "Format svg not recognized").
3. Fresh survey baseline: delete the rules-survey resume JSONL (see
   `test/corpus/survey.ts` for its path), run
   `GVBINDIR=/tmp/ghl PARITY_OUT=parity-baseline.json npx tsx test/corpus/survey.ts`;
   record conformant / structural / regression counts in the journal.
4. Perf baseline: `npm run build:js && BENCH_POOL=1 BENCH_IDS=2646,graphs-b100 node test/corpus/bench.mjs`;
   record portMs per id (min-of-N). The gate is ≤ 1.10× these numbers.
5. Write each repro below to `test/golden/inputs/pt-issue-<id>.dot` and capture
   the native ref:
   `GVBINDIR=/tmp/ghl ~/git/graphviz/build/cmd/dot/dot -Tsvg in.dot > test/golden/refs/pt-issue-<id>.svg`.
   For 27 store stderr + exit code instead (native: exit 1,
   `syntax error in line 1 near '{'`) — no ref svg.
6. Diff every ref against `renderSvg(src,'dot')` with `test/golden/compare.ts`
   (`compareSvg`, deterministic tolerance) and record the expected-failure table
   in the journal.
7. Commit: `test(golden): capture native refs for plantuml-ts tracker repros`.

## Repros (ids → source)

- `23-w{5,9,12,20,30}` — replace `<N>`:
  ```dot
  digraph unix {
  nodesep=0.486111; ranksep=0.833333; remincross=true; searchsize=500;
  sh0006->sh0007[arrowtail=none,arrowhead=none,minlen=0,color="#000009",
    label=<<TABLE BGCOLOR="#00000A" FIXEDSIZE="TRUE" WIDTH="<N>" HEIGHT="15"><TR><TD></TD></TR></TABLE>>];
  sh0008->sh0007[arrowtail=none,arrowhead=none,minlen=0,color="#00000D"];
  sh0006 [shape=rect,label="",width=0.574479,height=0.666667,color="#000006"];
  sh0007 [shape=rect,label="",width=0.574479,height=0.666667,color="#000007"];
  sh0008 [shape=rect,label="",width=0.585417,height=0.666667,color="#000008"];
  }
  ```
- `27`: `digraph g { node { shape=box } a -> b }`
- `28-polyline` (and `28-line`: same with `splines=line`):
  ```dot
  digraph g {
  splines=polyline;
  node [shape=box,label=""];
  {rank=same; a; x; b;}
  a -> x -> b;
  a -> b;
  }
  ```
- `29`: `digraph g { splines=ortho; a -> a; }`; `29-pair`: `digraph g { splines=ortho; a -> b; a -> a; }`
- `30`:
  ```dot
  digraph g {
  {rank=same; a; b;}
  node [shape=box,label=""];
  a -> b;
  a:e -> b:w;
  }
  ```
- `32`:
  ```dot
  digraph g {
  nodesep=0.486111;
  node [shape=rect,label="",width=0.25,height=0.25];
  a -> b [minlen=0,arrowhead=none,arrowtail=none,label=<<TABLE FIXEDSIZE="TRUE" WIDTH="6" HEIGHT="15"><TR><TD></TD></TR></TABLE>>];
  a -> b [minlen=0,arrowhead=none,arrowtail=none,label=<<TABLE FIXEDSIZE="TRUE" WIDTH="15" HEIGHT="15"><TR><TD></TD></TR></TABLE>>];
  }
  ```
- `33`:
  ```dot
  digraph g {
  nodesep=0.6;
  ranksep=1;
  node [shape=rect,label="",height=0.611111];
  a -> b [label=<<TABLE FIXEDSIZE="TRUE" WIDTH="80" HEIGHT="14"><TR><TD></TD></TR></TABLE>>];
  a -> b [label=<<TABLE FIXEDSIZE="TRUE" WIDTH="66" HEIGHT="14"><TR><TD></TD></TR></TABLE>>];
  }
  ```
- `35`:
  ```dot
  digraph g {
  nodesep=0.486111;
  node [shape=rect,label="",width=0.25];
  a -> b [label=<<TABLE FIXEDSIZE="TRUE" WIDTH="6" HEIGHT="15"><TR><TD></TD></TR></TABLE>>];
  a -> b;
  }
  ```

## Expected (measured during planning, main v2.3.0 vs native 15.1.0~dev)

Port differs on 23-w9, 23-w20, 27 (accepts), 28-*, 29 (no edge; "lost a a edge"),
30 (port-less edge ~0.2px), 32 (mirror), 33 (join y −94 vs −80), 35 (x +0.23).
Port matches 23-w5/12/30. Issue 34 matches native 15.x — do not capture.

## Interface outputs

`{ baselineParity: 'parity-baseline.json', perfMs: { '2646': n, 'graphs-b100': n }, refs: test/golden/refs/pt-issue-<id>.svg }`
— consumed by every later task.

## Acceptance

- Given native dot with `GVBINDIR=/tmp/ghl`, when each repro is captured, then a
  ref exists per id and the diff table matches "Expected" above.
- Given a fresh survey, when it completes, then its counts are journaled as the
  gate baseline.
- Given the bench, then both perf numbers are journaled.

## Write-set

`test/golden/inputs/pt-issue-*.dot`, `test/golden/refs/pt-issue-*.svg`,
`plans/plantuml-tracker-2/decision-journal.md`. Not `test/golden/manifest.json`.
