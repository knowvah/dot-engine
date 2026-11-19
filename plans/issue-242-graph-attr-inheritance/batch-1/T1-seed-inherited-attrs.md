# T1: seed every inherited graph attribute, keep it invisible to writers, gates, squash

## Context

cgraph copies every parent graph attribute into a subgraph when it opens
(`agmakeattrs`); the builder copies seven keys, so a cluster under a root
`ordering=out` (or `rank=same`, `style`, …) reads `""` (AD-1). Seeding every
key makes the json re-parse and the `-Tdot` echo print inherited values that
have no local symbol in C (AD-2).
[../harness/prototype.diff](../harness/prototype.diff) is the working
prototype: it meets every check below except the `localGraphAttrs` helper (it
edits `json.ts` inline, which the line cap forbids), the comments and the
tests.

## Steps

1. **Red.** Write `src/parser/builder-inherit.test.ts` (new):
   - Model cases (parse only): for `harness/probes/repro.gv`, `cluster_a`'s
     `attrs.get('ordering')` is `out` and `seededAttrs` has `ordering`; for
     `late.gv` it is undefined and `agGraphAttr(cluster_a, 'ordering')` is
     `''`; for `local-off.gv` it is `''` and not seeded; for `nested.gv` both
     clusters hold `out`; for `reopen.gv` `cluster_p` has no `ordering` (the
     root set it between the openings, #258's first-open rule).
   - Render cases, byte-equal to native: `repro.gv` `-Kdot` as plain, xdot
     and dot against `harness/native/repro.dot.{plain,xdot,dot}`; add native
     files for `rankset.gv` and `refed-bb.gv` (`-Kdot -Tdot`, captured with
     the oracle after preflight) and compare those too. Read harness files as
     `src/parser/builder-reopen.test.ts` reads #258's. Render with
     `renderFormat(parse(src), fmt, 'dot')` (`test/helpers/render-format.ts`);
     silence stderr with `agseterrf` (reset in `afterEach`).
   - A unit case for `localGraphAttrs` in `src/model/cgraph-ops.test.ts`: a graph
     with `attrs` {a, b} and `seededAttrs` {b} gives {a}; with no
     `seededAttrs`, a copy equal to `attrs` and not the same Map.
   Run on the base and journal the counts: every model case with a seeded
   expectation fails, `late`/`local-off` controls pass, the three render
   cases on `repro` and the one on `rankset` fail, `refed-bb` passes (base
   already equal; it guards AD-2).
2. **Green.**
   - `src/parser/builder.ts`: the seeding loop iterates
     `sg.graphDefaultsSnapshot` (every key the body did not set), as the
     prototype. Delete `GRAPH_INHERIT_SEED_KEYS` (`grep -rn
     GRAPH_INHERIT_SEED_KEYS src test` first) and move its `@see` lines
     (`lib/cgraph/attr.c:agmakeattrs`, `lib/common/utils.c:is_a_cluster`,
     `lib/common/input.c:do_graph_label`) and the pack-projection reason into
     the loop's comment. File must not grow past 480 lines.
   - `src/model/cgraph-ops.ts`: export `localGraphAttrs(g: Graph): Map<string,
     string>` with `/** @see lib/cgraph/attr.c:aglocaldictsym */` and a
     one-line reason (AD-2).
   - `src/render/json.ts`: line 50 imports `localGraphAttrs` beside
     `agNameOf`; line 280 becomes `cluster.set(gChild, localGraphAttrs(xgChild));`.
     `wc -l` stays 736.
   - `src/render/dot/attrs.ts` `echoGraphAttr`: `if (g.seededAttrs?.has(key)
     === true) return [];` with a one-line `write_dict` reason. File stays
     ≤ 500 lines (493 at the base).
   - `src/model/graph.ts`: the `seededAttrs` doc names the old
     `GRAPH_LABEL_INHERIT_KEYS`; reword it to "every key of
     `graphDefaultsSnapshot` the scope did not set". Comment only.
   - Enumerate every other loop over a subgraph's `attrs` in `src/render`,
     `src/gvc` and `src/layout` (`grep -rn "\.attrs)" ` and `for (const \[.*\] of .*\.attrs`):
     journal each as reads an effective value (no change) or copies local
     attributes (a stop-1 case if it is outside the write-set and changes
     output).
3. **Existing tests.** `npm test`. Planning ran the prototype: 603 files,
   15079 tests, all green, none edited. A failure here is a gate failure
   unless it pins a non-native value: then update it to native's output,
   with native's bytes as evidence, and journal it.
4. **Probes.** From the repository root, after the oracle preflight and the
   bundles ([Bytediff](#bytediff)):

   ```
   H=plans/issue-242-graph-attr-inheritance/harness
   node $H/compare.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs $H/probes/*.gv \
     > $H/results/probes-head.tsv
   ```

   Pass: byte-identical to `results/probes-planning.tsv`.
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** the builder copied only seven of the open-time inherited
     graph attributes into a subgraph's `attrs`, which every port reader
     takes as the subgraph's value, where `agmakeattrs` copies all of them.
   - **Origin:** port `src/parser/builder.ts:88-90,323-329` (base
     `27110d7d`); C `lib/cgraph/attr.c:165` (`agmakeattrs`), reached from
     `lib/cgraph/grammar.y:381` `attrstmt` → `agattr_text` → `setattr`
     (`attr.c:273/283`).
   - **Causal chain:** `cluster_a` reads `ordering` as `""` →
     `ordered_edges(cluster)` (`orderedEdges`,
     `src/layout/dot/mincross-build.ts:364`) adds no flat edges → no flat
     matrix → `left2right` 0 where native's is 1 → `reorder`/`transpose`
     swap nodes native keeps → x of `c0..c2`, `o0`, `o1` differ.
   - **Ruled out:** carry forward the issue's evidence (instrumented
     16.1.1 traces on `1472`: equal crossing counts and mvals until
     `cluster_lasi`, divergence only at `left2right`), plus: order
     sensitivity (`late`, `reopen` equal native on base and head), a local
     override (`local-off`), the pack projection (`pack` equal on both).
7. **Finish** (README, "Branch and commits").

## Write-set

- `src/parser/builder.ts` (seeding loop, constant removed)
- `src/model/cgraph-ops.ts` (`localGraphAttrs`)
- `src/render/json.ts` (import line and the correlation line only)
- `src/render/dot/attrs.ts` (`echoGraphAttr`)
- `src/model/graph.ts` (the `seededAttrs` doc comment only)
- `src/parser/builder-inherit.test.ts` (new); `src/model/cgraph-ops.test.ts`
- existing `*.test.ts` files that pinned a non-native value (push-forward,
  journalled)
- `plans/issue-242-graph-attr-inheritance/harness/` (`native/`, `results/`,
  `extra/`)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md`
- `.agent-notes/issue-242.md` (new); `.agent-notes/issue-183.md` (the
  "any graph attribute … #242 is the general case" impact line)

## Read-set

- `src/parser/builder.ts:76-106,208-237,275-332`
- `src/render/dot/attrs.ts:265-300,395-435`; `src/render/dot/agwrite.ts:110-155`
- `src/render/json.ts:250-302,340-352`
- `src/model/cgraph-ops.ts:110-195`; `src/model/graph.ts:95-125`
- `src/common/attr-get.ts:30-46`; `src/layout/dot/pack-components.ts:100-120`
- `src/parser/builder-reopen.test.ts` (harness-reading pattern)
- `~/git/graphviz-16.1.1/lib/cgraph/attr.c:150-300`, `grammar.y:370-400`,
  `lib/cgraph/write.c:255-300`, `lib/dotgen/mincross.c` (`ordered_edges`,
  `do_ordering`)

## Interface contracts

New export `localGraphAttrs(g: Graph): Map<string, string>` from
`src/model/cgraph-ops.ts`: a fresh Map of `g.attrs` minus `g.seededAttrs`
(all of `attrs` when `seededAttrs` is undefined). Not added to the public
`src/index.ts` surface. `GRAPH_INHERIT_SEED_KEYS` (module-private) is removed.

## Bytediff

Queue gate 5. Base bundle from `git archive 27110d7d` in `$TMPDIR` (symlink
`node_modules`, `npm run parser:regen`, `npm run build:js`, copy `dist/index.js`
to `base.mjs`); head bundle from the working tree (`npm run build:js`, copy to
`head.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i242-smoke.json
```

**Expect** every job identical, 0 diffs
([../harness/survey.md](../harness/survey.md#smoke-expectation): no smoke id
is in the planning diff set). A capped job is load: re-run it alone. Any diff
is stop 3.

## Targeted survey

Gate 6, per AD-5 and [../harness/survey.md](../harness/survey.md).
`H=plans/issue-242-graph-attr-inheritance/harness`. Check `uptime` before
each part; above 12, wait.

1. **Reach:** `node $H/manifest-reach.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs >
   $H/results/reach-head.txt`; pass: identical to `reach-planning.txt` (227
   ids; stderr `# manifest 982, reached 227`).
2. **Port bytediff over the reach** (about 30 minutes at 5 lanes):
   `grep -v '^2475_[12]$' $H/results/reach-planning.txt > $TMPDIR/reach-main.txt`, then
   `npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs
   $TMPDIR/reach-main.txt $H/results/reach-bd-head.json`. Pass: 9000 jobs; the
   `diffs` list equals `reach-bd-planning.json`'s 8 keys; every capped key is
   one of planning's 40 and capped on both sides. A new capped key: re-run
   that id alone with `BD_CAP_MS=600000`; it must come back identical.
3. **The large inputs and the timeouts:** `printf '2475_1\n2475_2\n2621 circo,dot,fdp\n'
   > $TMPDIR/heavy.txt`;
   `BD_CAP_MS=900000 npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs
   $TMPDIR/head.mjs $TMPDIR/heavy.txt $H/results/heavy-head.json` (run it
   alone, load under 12). Pass: 0 diffs (a job still capped on both sides is
   journalled, not a failure; `2781_1`'s OOM is the job's heap cap and stays).
   A diff is stop 3 unless it equals native or moves toward it by the queue
   rules: then journal and list it.
4. **Native for what moved:**
   `ENGINES=dot FORMATS=plain,xdot,dot,svg node $H/compare.mjs $TMPDIR/base.mjs
   $TMPDIR/head.mjs ~/git/graphviz-16.1.1/tests/1472.dot $H/extra/1472-utf8.gv`
   and the same with `ENGINES=fdp` on `tests/2242.dot` (drop its header line),
   into `results/moved-head.tsv`. Pass: identical to `results/moved-planning.tsv`
   (`2242` and the `1472` UTF-8 control equal native in plain, xdot, dot, svg on
   the header floor; `1472` itself at 213, 754, 288, 438 native lines missing).
   Then `ENGINES=fdp npx tsx $H/json-compare.ts $TMPDIR/base.mjs
   $TMPDIR/head.mjs ~/git/graphviz-16.1.1/tests/2242.dot`: `headDiffs` 0.
5. **Probes:** step 4.

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given the issue's repro, when it renders under dot as plain, xdot and dot,
  then each equals native 16.1.1 byte for byte.
- Given `digraph G { rank=same; subgraph s { a; b } c -> a; a -> d; b -> e }`,
  when it renders under dot as `-Tdot`, then it equals native (`s` is a rank
  set through the inherited `rank`).
- Given a root `bb`/`lp` in the input and an unboxed `{rank=same}` subgraph
  (`refed-bb.gv`), when it renders as `-Tdot`, then the subgraph echoes no
  inherited `bb`/`lp` and the output equals native.
- Given the json tests that failed on the prototype without its json part (19 cases in 6
  files), when `npm test` runs on the head, then they pass with no test
  edited.
- Given gates 5 and 6, when run base against head, then every changed output
  equals native or moves toward it, the probe TSV equals planning's, and the
  log has one commit after the base, footer `Refs: #242`, with tag
  `issue-242/pre-squash` holding the per-task history.
