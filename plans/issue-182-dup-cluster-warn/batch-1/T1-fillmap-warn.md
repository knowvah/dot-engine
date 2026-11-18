# T1: shared mkClustMap with fillMap's warning, tests, gates, squash

## Context

C's `fillMap` (`~/git/graphviz-16.1.1/lib/common/utils.c:1498-1512`) warns
`Two clusters named %s - the second will be ignored` for each later cluster
whose name is already in the map. It is reached from fdp's
`processClusterEdges` and dot's `dot_compoundEdges` (only when
`compound=true`). The port's two copies keep the first cluster silently.
T1 replaces both with one module (AD-1) that warns, including on C's
anonymous-name alias (AD-2). [harness/prototype.diff](../harness/prototype.diff)
is a working prototype: it meets every check below except the new tests and
the json test update.

## Steps

1. **Red.** Add `src/common/clust-map.test.ts` (AD-5).
   - **Render cases.** One per probe in `../harness/probes/` (10) × engine
     (dot, neato, fdp, circo, twopi, osage, sfdp, patchwork). Render `-Tdot`
     and capture stderr with `agseterrf`, resetting `agseterrf(null)` in
     `afterEach`. Compare with `../harness/native/<probe>.<engine>.err`. Two
     cases compare with native minus one line, each with a comment naming
     the issue:
     - `dup3c`/dot drops `Warning: a -> b: head not inside head cluster
       cluster_x` (#217).
     - `edgec`/fdp drops `Warning: tail node a inside head cluster cluster_x`
       (#255).
   - **Unit cases** on `mkClustMap` over hand-built `Graph`s with
     `info.n_cluster`/`info.clust` set:
     - a named duplicate warns once and the map holds the first;
     - preorder order of the warnings in a three-level tree;
     - three anonymous (`%N`) clusters warn twice, and the map holds only the
       first;
     - a named cluster after an anonymous one does not warn;
     - no clusters gives an empty map and no warning.

   Run on the base. The 13 render cases whose native stderr is non-empty
   fail. The 67 silent ones pass. The unit cases fail to import. Journal it.
2. **Green.** Create `src/common/clust-map.ts` per AD-1/AD-2. Start from the
   prototype; SPDX header, `@see lib/common/utils.c:fillMap, mkClustMap` and
   `@see lib/cgraph/id.c:agnameof`. In `src/layout/fdp/cluster-edges.ts`,
   delete `fillMap`/`mkClustMap` and import `mkClustMap`. In
   `src/layout/dot/compound.ts`, delete `fillClustMap`/`mkClustMap` and the
   emptied "Cluster map" section header, then import it. New tests pass.
3. **json test.** In `src/render/json-dup-cluster.test.ts`, the
   `dup -Kfdp -T%s` case now expects `nativeLines('dup', 'fdp', format)` in
   full. Rename it and drop `FILLMAP_PREFIX` and the two #182 comments.
4. **Probes.** Build the head bundle (`npm run build:js`, copy `dist/index.js`
   to `$TMPDIR/head.mjs`) and the base bundle (see [Bytediff](#bytediff)). From
   the brief directory run
   `node harness/compare.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs harness/probes/*.gv`
   (eight engines, `dot,xdot`). Pass:
   - `head` equals `base` in every row;
   - `headErr` is `same` in every row except `dup3c`/dot and `edgec`/fdp;
   - those two differ from native only by the #217/#255 line (`diff` them).
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** fillMap's warning is missing, and the anonymous alias is
     not modelled.
   - **Origin:** `utils.c:1501-1503` and `id.c:161-164`. On the base, the port
     side is `fdp/cluster-edges.ts:40-47` and `dot/compound.ts:32-39`.
   - **Causal chain.**
   - **Ruled out:**
     - stdout: unchanged in gates 5 and 6;
     - a second mkClustMap call per layout: one warning per duplicate on
       `dup`/fdp;
     - pack components: `packc`, `packc2` and `packc3` match native per
       component;
     - #217/#255's lines: separate code paths.
7. **Comment on #194** (AD-2): `src/common/clust-map.ts` treats a
   `%`-prefixed cluster name as cgraph's static-buffer anonymous name; a
   source-named `%x` is not aliased in C.
8. **Finish** (README, "Branch and commits").

## Write-set

- `src/common/clust-map.ts` (new)
- `src/common/clust-map.test.ts` (new)
- `src/layout/fdp/cluster-edges.ts` (local map removed, import)
- `src/layout/dot/compound.ts` (local map removed, import)
- `src/render/json-dup-cluster.test.ts` (the fdp case)
- `plans/issue-182-dup-cluster-warn/harness/extra/` (new probes, only if
  push-forward needs them)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-182.md`

## Interface contracts

`mkClustMap(g: Graph): Map<string, Graph>`, exported from
`src/common/clust-map.ts`. It returns the same map as either old copy
(first-wins by name). The only difference: anonymous clusters after the first
are left out, and that changes no lookup the port makes (AD-3). It warns
through `agwarningf` once per ignored cluster, in preorder. Callers:
`processClusterEdges` and `dotCompoundEdges`.

## Bytediff

The queue rules, gate 5. Build the base bundle from `git archive 722e372a` in
`$TMPDIR` (symlink `node_modules`, `npm run parser:regen`, `npm run build:js`,
copy `dist/index.js` to `base.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i182-smoke.json
```

bytediff compares stdout only. Expect 0 changed outputs. Any change is stop
condition 2.

## Targeted survey

**Selection rule.** `mkClustMap` runs on every fdp layout, and on every dot
layout with `compound=true`. It can only warn with two or more clusters.

- **Set A, fdp:** every corpus input whose text matches `cluster`
  (case-insensitive), minus `2475_1` (AD-4).
  [../harness/survey-fdp.txt](../harness/survey-fdp.txt) has 308 paths.
- **Set B, dot:** the 17 of those that also match `compound`.
  [../harness/survey-dot-compound.txt](../harness/survey-dot-compound.txt).

Run from the brief directory, with `uptime` under 12:

```
cd ~/git/graphviz-16.1.1/tests
FORMATS=dot ENGINES=fdp node <brief>/harness/compare.mjs $TMPDIR/base.mjs \
  $TMPDIR/head.mjs $(cat <brief>/harness/survey-fdp.txt) > $TMPDIR/i182-A.tsv
FORMATS=dot ENGINES=dot node <brief>/harness/compare.mjs $TMPDIR/base.mjs \
  $TMPDIR/head.mjs $(cat <brief>/harness/survey-dot-compound.txt) > $TMPDIR/i182-B.tsv
```

**Pass:**

- `head` equals `base` in every row. Port stdout is deterministic; a `native`
  column of `SEGVxN` makes `lines` meaningless but not `head`/`base`.
- No row goes from `baseErr` `same` to `headErr` `DIFF`.
- `1436`, `1902`, `b7` and `2475_2` under fdp go from `DIFF` to `same`.

For every other row still `DIFF`, diff head stderr with native. If a missing
or extra line is a `Two clusters named` line, that is stop condition 3.
Otherwise journal the row and the line, and link the issue that owns it, or
open a `follow-up`. Journal the counts and the moved rows.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces; stderr goes
through `agerr`). Rollback: Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then the 13 warning render
  cases fail and the 67 silent ones pass.
- Given the fix, when `probes/dup.gv` renders under fdp, then stderr is
  exactly `Warning: Two clusters named cluster_x - the second will be
  ignored\n` once. Under dot (no `compound`), stderr is empty.
- Given the fix, when `probes/anon.gv` renders under fdp, then stderr warns
  for `%7` and `%13`, in that order, and for `%3` not at all.
- Given the fix, when `1436`, `1902`, `graphs/b7.gv` and `2475_2.dot` render
  under fdp, then port stderr equals native 16.1.1's, and stdout equals the
  base's.
- Given gates 1-6, when they run on the head, then each passes as the README
  table says. The finished log has exactly one commit after the base, with
  footer `Refs: #182`, and tag `issue-182/pre-squash` holds the per-task
  history.
