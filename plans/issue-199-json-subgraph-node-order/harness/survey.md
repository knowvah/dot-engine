# Survey: what the change reaches, and how it was chosen

## Reach

The change reorders three walks in the json writer (json and json0, every
engine) from a graph's node-map order to sequence order. Output can change
only when a walk runs on a graph whose node map is not in sequence order:

1. A root render, when some subgraph (any depth) names nodes in another order
   than their creation: its `nodes` list.
2. A render of a subgraph alone (API only), when that subgraph is out of
   order: every node and edge gid as well.

Nothing else reads the changed walks; svg, xdot, plain and cmapx cannot move.

## Probes

`probes/*.gv`, 10 inputs, run by `probe.ts` under the 8 engines × json, json0
(stdout parsed with keys sorted and array order kept, plus stderr):

- Out of order, must move to native: `repro` (the issue's), `rankset` (corpus
  `2825`'s shape), `cluster-edges`, `nested` (two levels), `edge-order` (the
  issue's "not checked" edge list), `undirected-cluster`, `fdp-cluster-edge`
  (an fdp cluster edge, so a cluster stand-in node).
- In order, must not move: `subgraph-first`, `root-edge-later`, `all-same`.

`subrender/subrev.gv` covers reach 2: `subrender/build.sh` builds part 10
T15's C program against the carried oracle and renders subgraph `s` alone;
`subrender/port.ts` renders it with a checkout's `src/`.

Planning, base `1f1e7961` against the prototype: base 48/160 equal native,
prototype 156/160; the 4 others are sfdp on `edge-order` and
`fdp-cluster-edge`, whose coordinates drift identically on base and head (the
head only reorders the member list, to native's). Subgraph render: base `out`,
prototype `eq` in json and json0.

## Corpus (gate 6)

Chosen by code path: `reach.ts` parses every applicable manifest file with the
port and keeps the ids where some subgraph's node map is out of id order
(reach 1). 42 ids (`survey-ids.tsv`, ids alone in `survey-ids.txt`); none
fails to parse. This is an upper bound: under dot the port's layout leaves
some of these subgraph maps in an order whose print already equals native
(`705`, `1767` × dot × json are `eq` on the base and do not move).

The smoke list holds 6 of the 42 (`1581`, `1767`, `2639`, `705`,
`graphs-style`, `tree-doc-neato-inet`); planning's smoke
bytediff moved 45 json jobs, all on them (`results/smoke-toward.tsv`).
Planning did not run the 42-id survey: the load was 150-210 from another
project's run (decisions.md, Phase 8 row).

### Re-running

From the repo root, with the base and head bundles of T1 step 5, and the
1-minute load under 12:

```
BD_FORMATS=json,json0 npx tsx test/tools/bytediff.ts $TMPDIR/i199/base.mjs \
  $TMPDIR/i199/head.mjs plans/issue-199-json-subgraph-node-order/harness/survey-ids.txt \
  $TMPDIR/i199/survey.json
cd plans/issue-199-json-subgraph-node-order/harness
npx tsx toward-native.ts $TMPDIR/i199/survey.json > results/survey-toward.tsv
```

Pass: 0 capped; every row of `survey-toward.tsv` has verdict `native` or
`toward`, or `SHAPE` with `members-head` `eq`; `members-head` is `eq` on
every row; no `AWAY`, no `+STDERR`. A `SHAPE` row also needs its base-to-head
diff (`<out>.d/<n>.a.txt` against `.b.txt`) to touch member-list lines only.
`toward-native.ts` is the same check gate 5 uses on the smoke run.

### What the executor's run added (2026-11-23)

- `2621` under dot, circo and fdp does not finish inside bytediff's default
  120 s cap, on base or head (1237 s for the port under dot). Run it alone:

  ```
  echo 2621 > $TMPDIR/i199/ids-2621.txt
  BD_ENGINES=dot,circo,fdp BD_FORMATS=json,json0 BD_CAP_MS=3000000 BD_LANES=6 \
    npx tsx test/tools/bytediff.ts $TMPDIR/i199/base.mjs $TMPDIR/i199/head.mjs \
    $TMPDIR/i199/ids-2621.txt $TMPDIR/i199/s2621.json
  ```

  Native needs about 8 minutes under dot and 40 under circo for each format,
  so capture those four outputs once and check each row with
  `node one-row.mjs <native> <n>.a.txt <n>.b.txt` (the same verdict as
  `toward-native.ts`). `NATIVE_TIMEOUT_MS` raises `toward-native.ts`'s own
  native limit (default 300 s).
- `toward-native.ts` compares against native's output whenever there is any:
  native exits 1 with the document written on an `Error:` (`1332`, `1767`,
  `graphs-b53` under fdp; `2778`, `2780`, `2825` under dot). With no output
  the row is `NATIVE-NONE <signal or status>`: `2239` under fdp, where native
  segfaults on most runs. Re-run native until it exits 0 and use `one-row.mjs`.
- It quotes bare `inf` and `nan` before parsing (`1332` under osage, native
  and port alike), and a row that still does not parse prints `ERROR`.
- Native fdp and twopi are not deterministic run to run on some ids
  (`.agent-notes/issue-199.md`): a `toward` count there is one sample.
