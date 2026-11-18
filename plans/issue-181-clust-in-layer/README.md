# Mission: issue #181: clusters drawn only in their layers (`clust_in_layer`)

## Objective

Take the graph from the issue
([harness/probes/issue.gv](harness/probes/issue.gv)):

```
digraph G { layers="l1:l2"; a [layer=l1]; b [layer=l2]; subgraph cluster_c { b } a -> b [layer=l2] }
```

In `-Tsvg`, native 16.1.1 draws `cluster_c` in layer `l2` only. The port also
draws it in `l1`: there is an extra `<g id="clust1" class="cluster">` there.
The same happens with `layer=l2` on the cluster and no `layer` on `b`. Make
the port draw each cluster only where native does.

**Mechanism (traced at planning, base `59862c28`, graphviz 16.1.1).** C's
`emit_clusters` (`lib/common/emit.c:3720-3736`) runs `if
(!clust_in_layer(job, sg)) continue;` before it draws a cluster or recurses
into it. `clust_in_layer` (`:1593-1606`) returns true when `numLayers <= 1` or
the cluster's own `layer` selects the layer. A non-empty `layer` that does not
select it returns false. With no `layer`, it returns true when some node of the
cluster passes `node_in_layer(job, sg, n)`, counting only the edges of `sg`.
The port's `renderClusters` (`src/gvc/device.ts:340-347`) has no such test, so
every cluster is drawn on every layer. The issue's suspected mechanism is
confirmed. The origin is `device.ts:340-347` (the missing test) together with
`src/common/layers.ts` (no `clust_in_layer`).

The issue misses a second effect, which a prototype of the fix exposed. Under
`layerselect`, a device without layers keeps `numLayers > 1` (`firstlayer`,
`emit.c:1109-1128`), so xdot and json skip the cluster too. The port's xdot
writer decides "is a cluster" from the clusters `endCluster` saw
(`src/render/dot.ts:310`, read at `src/render/dot/agwrite.ts:115, 124, 186`).
So a skipped cluster would lose its `bb`. Native keeps `bb` and prints no
`_draw_`. AD-2 reads cluster membership from `GD_clust` (`inClusterTree`)
instead, as C's `rec_attach_bb` does.

**Evidence ([harness/](harness/)).** There are 13 probes under 8 engines.
Native stdout is in `harness/native/` (svg) and `harness/native-all/` (other
formats, kept for `select` and `select-stored` only). A scratch prototype of AD-1 + AD-2
([harness/prototype.diff](harness/prototype.diff), reverted) gave:

| Table | Rows | Base vs native | Prototype |
|---|---|---|---|
| [proto2-body.tsv](harness/results/proto2-body.tsv) (svg body, exact) | 104 | 50 NE | 104 EQ |
| [proto2-formats.tsv](harness/results/proto2-formats.tsv) (cmapx, cmapx_np, imap, imap_np, xdot, plain; 11 probes) | 528 | n/a | 503 `unchanged`, 25 `native` |
| [proto2-formats-late.tsv](harness/results/proto2-formats-late.tsv) (the same minus xdot; the 2 later probes) | 80 | n/a | 80 `unchanged` |
| [proto2-dot.tsv](harness/results/proto2-dot.tsv) (dot, xdot; 13 probes) | 208 | n/a | 198 `unchanged`, 10 `native` |
| [proto2-json-rowcheck.tsv](harness/results/proto2-json-rowcheck.tsv) (json, canonical) | 104 | n/a | 94 `unchanged`, 10 `native` |
| [proto2-survey-layers.tsv](harness/results/proto2-survey-layers.tsv) (3 corpus inputs with `layers`) | 192 | n/a | 192 `unchanged` |
| [proto2-samecheck.tsv](harness/results/proto2-samecheck.tsv) (293 cluster inputs, base vs head) | 879 | n/a | 876 `same`; 2621's 3 rows over the 300 s cap (journal row 1) |

In the svg body table, NE means the body differs from native and EQ means
it is byte-equal. In the other tables, `unchanged` means the head equals the
base, and `native` means the head equals native.

`npx vitest run src/render src/gvc src/common` on the prototype: 202 files,
4510 tests, all pass. See [decision-journal.md](decision-journal.md), rows
0-1.

Done means:
- All 13 probes' svg bodies are byte-equal to native under all 8 engines.
  That includes `layersep`, whose HTML cell anchors (`a_two_clust1_0`,
  `a_three_clust1_1`) now match. #180 traced the shift to this issue.
- `select` and `select-stored` are byte-equal to native in xdot and in
  canonical json under dot, neato, fdp, osage and patchwork. `select` is
  byte-equal in cmapx, cmapx_np, imap and imap_np too. Every other probe row
  is `unchanged`.
- `svg-layer-id.test.ts` compares `repro` byte for byte.
- The surveys pass as [T1](batch-1/T1-clust-in-layer.md#steps) step 5 says.

Type `fix`, a patch release.

**Out of scope:**
- #242 and #183: subgraph inheritance of root attributes and of `cluster`.
  AD-1 reads `layer` through the port's existing `graphAttrInherited`, so it
  inherits whatever that function inherits.
- #196: a labelled cluster keeps a stored `_ldraw_` that `xdot_end_cluster`
  clears.
- The json pretty-printing difference: it is text-only, and rowcheck compares
  canonical json.

## Startup (every session and after every compaction)

1. Read `~/.claude/docs/reference/autonomous-execution.md` in full.
2. Follow the queue rules injected into the session. Where they disagree with
   this brief, they win.
3. Read this README, then [decisions.md](decisions.md), then
   [decision-journal.md](decision-journal.md), then
   [batch-1/overview.md](batch-1/overview.md). Check finished work with
   `git log --oneline 59862c28..`.
4. Read `.agent-notes/issue-180.md` and `.agent-notes/issue-178.md`. In
   `rowcheck.mjs` only the verdict `native` means byte equality. svg rows are
   judged with `harness/bodyeq.mjs`, because the svg header is an LCS artefact.

## Branch and commits

- Branch `chore/issue-queue`, already checked out in the queue worktree. Create
  no branch, and never merge `main` into it.
- **Base sha:** `59862c28d82b2745f69cefe6b45bcca4b23e5010` (the tip at
  planning). If the tip has moved, use the tip at execution start as the base
  and journal it.
- Per-task commits while working: first `docs(mission): add issue-181 brief`
  (this directory), then `fix(T1): ...`. Commit with
  `git -c commit.gpgsign=false commit -F <msgfile>`, run on its own.
- **Finish (T1's last step):** run `git tag issue-181/pre-squash`, then
  `git reset --soft <base>`, then make one commit:

  ```
  fix(render): draw a cluster only in its layers as clust_in_layer does

  <two to four lines: C's emit_clusters skips a cluster whose own layer, or
  else whose nodes, are not in the current layer; the xdot writer now takes
  cluster membership from GD_clust, so a cluster skipped under layerselect
  keeps its bb>

  Refs: #181
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
| 5 | Smoke bytediff | see [T1](batch-1/T1-clust-in-layer.md#bytediff) | every changed output equals native (queue rules) |
| 6 | Targeted survey | see [T1](batch-1/T1-clust-in-layer.md#steps) step 5 (6a layers, 6b clusters) | see T1 |

The oracle comes from ADR-0002, the newest accepted ADR:
`~/git/graphviz-16.1.1/build/cmd/dot/dot` with `GVBINDIR=/tmp/ghl1611` for
dot or `/tmp/ghl1611-all` for the other engines, as
`test/corpus/oracle-paths.mjs` says. `harness/rowcheck.mjs` imports it.
Before trusting native output, run
`oraclePreflight(ORACLE_DOT_BIN, <gvbindir>, <engine>)`
(`test/corpus/oracle-env.ts`) for `dot` and for `neato`. `$TMPDIR/i181/pf.ts`
does both, and both passed at planning. Fix a missing `config8` with
`GVBINDIR=<dir> <dot> -c`. The issue has no `upstream-16.1.1` label. Check
`uptime` before gates 5 and 6, and wait while it is above 12.

Baseline at planning: see [decision-journal.md](decision-journal.md), row 0.

## Stop conditions

1. A `src/` file outside [T1's write-set](batch-1/T1-clust-in-layer.md#write-set)
   must change, for example `src/render/dot.ts`, `write-back.ts` or
   `first-layer.ts`. Journal why and stop.
2. `src/gvc/device.ts` (510 lines at base) or `src/render/dot/agwrite.ts`
   (533) grows. The complexity hook blocks growth of a file over 500 lines.
3. A corpus row (gate 5 or 6) that was byte-equal to native on the base
   differs on the head, a changed line does not equal native's line, or a 6b
   row is `CHANGED`. Write the diagnosis artifact and stop.
4. After the fix, a probe row that Done names as byte-equal still differs, or
   a row Done calls `unchanged` changes. Diagnose it to a mechanism, then
   stop.
5. The same gate check fails twice in a row after fix attempts. Diagnose it to
   a stated mechanism, journal it, and stop.
6. An architecture decision in [decisions.md](decisions.md) turns out wrong.
   For example: an output without `layers` changes, a skipped cluster's
   sub-cluster is still drawn, or a skipped cluster loses a stored `_draw_`.

## Push-forward (decide alone, journal it)

- Test names, comment wording, and the order of the `clustInLayer` body,
  within the write-set and the C's semantics.
- More probes in `harness/probes/` for paths the 13 do not reach, for
  example: `outputorder`, `-Tcmapx` with `layerselect` and a cluster `URL` on
  a skipped sub-cluster, or `layerlistsep` ranges. Capture their natives with
  `NATIVE_DIR`.
- A row that differs for a reason older than this change (base and head
  differ from native in the same lines): note it, and link or open a
  `follow-up` issue (queue rules).

## Index

| Doc | What |
|---|---|
| [decisions.md](decisions.md) | AD-1..AD-3, baseline, rollback, auto-confirmed notes |
| [batch-1/overview.md](batch-1/overview.md) | the batch: T1 |
| [batch-1/T1-clust-in-layer.md](batch-1/T1-clust-in-layer.md) | red tests, fix, gates, close-out, squash |
| [harness/probes/](harness/probes/) | the 13 inputs |
| [harness/native/](harness/native/), [harness/native-all/](harness/native-all/) | native 16.1.1 stdout: svg for every probe; the other formats for `select` and `select-stored` only (the tests read them; rowcheck re-captures the rest with `NATIVE_DIR`) |
| [harness/rowcheck.mjs](harness/rowcheck.mjs) | native, base and head per input, engine and format, with the queue verdict (json canonical) |
| [harness/bodyeq.mjs](harness/bodyeq.mjs), [harness/render1.mjs](harness/render1.mjs) | exact svg body equality with native for base and head |
| [harness/samecheck.mjs](harness/samecheck.mjs), [harness/survey-clusters.txt](harness/survey-clusters.txt) | gate 6b: base-vs-head identity over 293 cluster inputs |
| [harness/survey-layers.txt](harness/survey-layers.txt) | gate 6a: the 3 corpus inputs with `layers` |
| [harness/prototype.diff](harness/prototype.diff) | the planning prototype (reference) |
| [harness/results/](harness/results/) | planning tables (`base.tsv`, `proto-*`, `proto2-*`) |
| [diagrams/data-flow.md](diagrams/data-flow.md) | the cluster walk per layer after T1 |
| [diagrams/component-map.md](diagrams/component-map.md) | the modules touched |
| [decision-journal.md](decision-journal.md) | the mission journal |

| Batch | Status |
|---|---|
| 1: T1 | [x] |

## Session end

- Add one row to `plans/decision-journal.md` (the project journal): the
  mechanism, the files, the gates.
- Write `.agent-notes/issue-181.md` only for something novel. The AD-2
  coupling (the xdot writer's cluster set came from `endCluster`) is a
  candidate. Otherwise say in the journal row that nothing was novel.
- End the final message with the driver's status line.

## Summary (2026-11-17, execution)

- **Tasks:** 1 of 1 (T1).
- **Decisions:** AD-1..AD-3 held as planned. Journal rows 2-10; none flagged
  for review. Additions: one more `clustInLayer` unit case, five extra probes
  (`harness/extra/`), and a 7-engine identity sample (6c) because 6b runs
  only `-Kdot`.
- **Gates:** typecheck 0; `npm test` 598 files / 14360 tests; goldens 5/5;
  corpus + docs 2863 tests; smoke bytediff 1960/1960 identical; 6a 192
  `unchanged`; 6b 876 of 879 `same` (2621 left out, over the port cap on the
  base); 6c 840 `same`.
- **Probes:** svg bodies 104/104 equal native (54 on the base); extra 40/40
  (15 on the base); `select`, `select-stored`, `subselect` and `multiselect`
  maps, xdot and json equal native under the 5 cluster engines; every other
  row `unchanged`.
- **Known issues / follow-ups:** `deepedge` json differs from native on base
  and head alike (#199, already open). Nothing new filed.
