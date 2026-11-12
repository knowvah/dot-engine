# T1: honour a node-default `ordering`; port the two "not recognized" errors

## Context

C `do_ordering_for_nodes` (`~/git/graphviz/lib/dotgen/mincross.c:489-505`) reads
`late_string(n, N_ordering, NULL)`, which returns the node's own value or else the
default declared when the node was created. The port's `doOrderingForNodes`
(`src/layout/dot/mincross-build.ts:341-347`) reads `n.attrs.get('ordering')`,
which holds only the node's own value, so `node [ordering=out]` is ignored. The
accessor with C's semantics already exists: `nodeAttr`
(`src/common/attr-get.ts:25`). C also prints an error for an unrecognised value,
per node (`mincross.c:498-500`) and for the graph (`mincross.c:524-525`, in
`ordered_edges`, port `orderedEdges` at `mincross-build.ts:353-371`). The port
prints neither.

## Task (TDD)

1. **Red.** In `src/layout/dot/ordering.test.ts` add a `describe` for issue #169,
   with `afterEach(() => agseterrf(null))` as in
   `src/layout/dot/flat-minlen-w5.test.ts:53-63`. Inline each probe's DOT source
   (from `plans/issue-169-node-default-ordering/harness/probes/`) and native's
   output (from `harness/native/`) as constants, with a comment naming the native
   build (16.1.0, `-Tplain`). Tests:
   - `root-default.gv`, `subgraph-default.gv`, `late-default.gv`:
     `render(parse(src), 'plain')` equals the `.plain` file exactly, and no
     message reaches the `agseterrf` callback.
   - `bad-node-default.gv`, `bad-node-own.gv`, `bad-graph.gv`: the captured
     messages equal the `.err` file split into lines, each keeping its `\n` (for
     example `"Error: ordering 'bogus' not recognized for node 'q'.\n"`), and the
     plain output equals the `.plain` file.

   In `src/layout/dot/mincross-build.branch.test.ts`, next to the
   `doOrderingForNodes` test (line 397), add one test: like the existing one, but
   `src` has no own `ordering` and `src.nodeDefaultsSnapshot = new
   Map([['ordering', 'out']])`; expect `findFlatEdge(h1, h2)` to be defined.

   Run both files on the base source. The root, subgraph, bad-value and snapshot
   tests must fail; `late-default` must pass (it equals native on the base).
2. **Green.** In `mincross-build.ts`:
   - import `nodeAttr` from `../../common/attr-get.js` and `agerrorf` from
     `../../common/agerr.js`;
   - in `doOrderingForNodes`, read `const ordering = nodeAttr(n, g, 'ordering');`,
     keep the `out` and `in` branches, and add
     `else if (ordering !== undefined && ordering !== '')` →
     ``agerrorf(`ordering '${ordering}' not recognized for node '${n.name}'.`)``;
   - in `orderedEdges`, after the `in` branch, add `else if (ordering !== '')` →
     ``agerrorf(`ordering '${ordering}' not recognized.`)``;
   - set the `@see` comments to `lib/dotgen/mincross.c:do_ordering_for_nodes`
     (489) and keep `orderedEdges`' comment, adding the error branch line.

   Messages carry no trailing `\n`: `agerr` adds it (`src/common/agerr.ts:8-10`).
   Do not change the loop order, the `doOrdering*` helpers or anything else.
3. Run both test files until green, then gates 1-6 (README).
4. Check the aux path (README push-forward): a temporary trace counting FLATORDER
   edges added while rendering `aux-flat-adj.gv`; journal base and head counts;
   remove the trace before committing.
5. Journal, project journal row, then the squash in the README.

## Write-set

- `src/layout/dot/mincross-build.ts` (imports, `doOrderingForNodes`,
  `orderedEdges` only)
- `src/layout/dot/ordering.test.ts`
- `src/layout/dot/mincross-build.branch.test.ts` (one test)
- `plans/decision-journal.md` (one row),
  `plans/issue-169-node-default-ordering/decision-journal.md`,
  `plans/issue-169-node-default-ordering/README.md` (batch status)
- `.agent-notes/issue-169.md` (only if novel)

## Read-set

- `src/layout/dot/mincross-build.ts:320-371`
- `src/common/attr-get.ts:12-33`
- `src/common/agerr.ts:1-30,140-190`
- `src/layout/dot/ordering.test.ts` (whole, 122 lines)
- `src/layout/dot/mincross-build.branch.test.ts:1-40,390-420`
- `src/layout/dot/flat-minlen-w5.test.ts:20-63` (stderr capture pattern)
- `~/git/graphviz/lib/dotgen/mincross.c:480-537`
- `plans/issue-169-node-default-ordering/harness/`
- `.agent-notes/issue-130.md` (the aux-graph `ordering` path)

## Interface contracts

None. No exported signature changes.

## Acceptance criteria

- Given `digraph { node [ordering=out]; q -> p; q -> z; z -> v; p -> v; p -> u; }`,
  when rendered to plain, then the output equals native's
  (`p` at `0.375 1.25`, `z` at `1.375 1.25`).
- Given the same edges with `node [ordering=out]` inside `subgraph s { ... q }`,
  when rendered, then the output equals native's; and given the default declared
  after the edges, then it equals native's (no ordering applied).
- Given `node [ordering=bogus]` on three nodes, when rendered, then three errors
  `Error: ordering 'bogus' not recognized for node '<n>'.` reach the callback in
  `q`, `p`, `z` order; given graph `ordering=bogus`, then one
  `Error: ordering 'bogus' not recognized.`
- Given the smoke list, when base and head bundles are compared, then every job is
  identical.
- Given the survey inputs, when compared with native, then the table under
  [Targeted survey](#targeted-survey) holds.

## Bytediff

`src/` changes, so gate 5 applies. Build the head with `npm run build:js` and copy
`dist/index.js` to `$TMPDIR/issue169-head.mjs`. Build the base from `git archive
f5ae1c08` extracted under `$TMPDIR`, with `node_modules` symlinked and `npm run
parser:regen`, and copy its bundle to `$TMPDIR/issue169-base.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue169-base.mjs $TMPDIR/issue169-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue169-bytediff.json
```

Expected: identical on every job. No smoke id's input mentions `ordering`; the
candidate change left all 1960 smoke jobs identical at planning.

## Targeted survey

How the ids were chosen: the change is reachable only through dot's mincross, when
a node's `ordering` comes from a default or a value is unrecognised. A grep of every
applicable input in `test/corpus/corpus-manifest.json` for `ordering` finds 33; a
trace on a scratch copy found one, `1990`, whose nodes read `ordering` from a
default, and none that reaches either error branch (`1652`, graph `ordering=in`,
does not reach the node loop). The seven probes cover the issue's two examples,
the subgraph scope and late declaration the issue left unchecked, and the three
error cases.

Compare (run from the repo root):

```
P=plans/issue-169-node-default-ordering/harness/probes
GVBINDIR=/tmp/ghl node plans/issue-169-node-default-ordering/harness/compare.mjs \
  $TMPDIR/issue169-base.mjs $TMPDIR/issue169-head.mjs \
  $P/root-default.gv $P/subgraph-default.gv $P/late-default.gv $P/aux-flat-adj.gv \
  $P/bad-node-default.gv $P/bad-node-own.gv $P/bad-graph.gv \
  ~/git/graphviz/tests/1990.dot
```

Expected, as measured at planning (`base` and `head` count native lines missing
from the port's output; `head` is an upper bound):

| Input | dot (lines/base/head) | xdot | plain | baseErr | headErr |
|---|---|---|---|---|---|
| `root-default.gv` | 26/7/0 | 49/20/0 | 12/7/0 | same | same |
| `subgraph-default.gv` | 27/9/0 | 50/23/0 | 12/9/0 | same | same |
| `late-default.gv` | 31/0/0 | 54/0/0 | 12/0/0 | same | same |
| `aux-flat-adj.gv` | 22/8/8 | 36/20/20 | 6/5/5 | same | same |
| `bad-node-default.gv` | 17/0/0 | 30/0/0 | 7/0/0 | DIFF | same |
| `bad-node-own.gv` | 16/0/0 | 29/0/0 | 7/0/0 | DIFF | same |
| `bad-graph.gv` | 17/0/0 | 29/0/0 | 7/0/0 | DIFF | same |
| `1990.dot` | 69/0/0 | 129/0/0 | 31/0/0 | same | same |

`aux-flat-adj.gv`'s lines change but keep their count: the remaining difference is
#170's. List it in the report as a known-divergent row, not a toward-native one.

## Observability

N/A: no new observable operations beyond the two native error messages.

## Rollback

Reversible: revert the commit.
