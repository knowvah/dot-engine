# T1: build make_flat_adj_edges's rank=source subgraph

## Context

C, `~/git/graphviz/lib/dotgen/dotsplines.c:1176-1186`:

```c
auxg = cloneGraph(g, &attrs);
subg = agsubg(auxg, "xxx", 1);
agbindrec(subg, "Agraphinfo_t", sizeof(Agraphinfo_t), true);
agset(subg, "rank", "source");
rightx = ND_coord(hn).x;
leftx = ND_coord(tn).x;
if (GD_flip(g)) { SWAP(&tn, &hn); }
auxt = cloneNode(subg, tn);
auxh = cloneNode(auxg, hn);
```

The port, `src/layout/dot/splines-flat.ts:178-198` (`buildFlatAux`), already has
the flip-swapped `refTn`. It calls `cloneNode(auxg, refTn)` with no subgraph.
`cloneNode` (`splines-clone.ts:36`) calls `agnode(g, ...)`, which only ever
installs into `g.root` (`cgraph-ops.ts:72-92`).

In C, `rank=source` makes `auxt` the minset leader and sets its ranktype to
SOURCERANK (`rank.c:186-225`). `minmax_edges` reverses in-edges into `auxt`.
`minmax_edges2` adds a minlen-1 edge from `auxt` to any leader with no in-edges
(`rank.c:396-450`). `expand_ranksets` then fixes `GD_minrank`. Part 11 T1 saw no
output change on w4 and six variants.

## Task (TDD)

1. **Red:** add `src/layout/dot/flat-adj-source-subgraph.test.ts` per
   [AD-4](../decisions.md#ad-4-the-test-watches-the-real-aux-graph-through-a-vimock-passthrough).
   For each variant below, assert that `auxg.subgraphs` has exactly one key, `xxx`,
   that its `rank` attr is `source`, and that its members are `[auxt's name]`. It
   must fail now because there is no subgraph. Add a `cloneNode` case to
   `splines-clone.test.ts`: after `cloneNode(subg, orign)` with
   `subg = agsubg(auxg, 'xxx', true)`, the clone is in both `subg.nodes` and
   `auxg.nodes`. It must fail now.
2. **Native probe (before green, so the expected ranks come from native):** follow
   [Native probe](#native-probe). Write native's `{auxt, auxh, maxrank}` per
   variant into the test as constants, with a comment citing the probe. Then
   assert the port's snapshot ranks equal them. Expected: they already pass on the
   base. If any fails, stop condition 3 applies.
3. **Green:** AD-2 in `cloneNode` (with the `@see lib/cgraph/node.c:agnode`
   comment), then AD-1 in `buildFlatAux` (with `@see
   lib/dotgen/dotsplines.c:make_flat_adj_edges 1177-1185`), offsetting lines per
   AD-3. Update `buildFlatAux`'s doc comment to name the subgraph.
4. **Audit the aux graph's new subgraph.** Every port pass that runs on `auxg` and
   iterates `subgraphs` must treat `xxx` the way C does. At planning these were
   `rank.ts:355,369`, `rank-dot2.ts:183,345` (dot2 never runs on auxg, because
   `dotRank` reads `auxg.attrs.newrank`, which is unset), `mincross-build.ts:368`
   (subgraph `ordering`, which `xxx` does not have), `cluster.ts:259,266` and
   `pack-components.ts:91,132` (aux never packs). Re-grep `src/` for `subgraphs`
   outside `src/layout/dot` as well (postprocess, init). Record the outcome per
   site in the journal. Separately, the port's `cloneGraph`
   (`splines-flat.ts:72`) copies `g.info.flags`, NEW_RANK included, but C's
   `GD_flags(auxg)` starts at zero. So V7 runs `fillRanks` on auxg
   (`mincross.ts:160`). Do not fix it here, because it is out of scope. If V7 or
   a read of `fillRanks` shows any effect, file a `follow-up` issue.
5. Mark item 140 in `plans/post-16.1-followups/README.md` (line ~688)
   `**[DONE — issue #130: built the subgraph; native aux ranks equal]**`, in the
   style of item 139.
6. Run gates 1-6 (README), then write the journal, then do the squash described in
   the README.

## Variants

Write each one to `$TMPDIR/i130/<name>.gv`. V1 is the part-11 harness file.

| Name | Source | Path exercised |
|---|---|---|
| V1 w4 | `plans/post-16-1-followups-11/harness/T0/w4.gv` | three-edge group, two ports, constraint=false |
| V2 w4-lr | V1 plus `rankdir=LR` | `GD_flip` swap: auxt cloned from hn |
| V3 pt30 | `digraph { {rank=same; a; b;} a -> b; a:e -> b:w; }` | mixed group; port-less edge is hvye |
| V4 allports | `digraph { {rank=same; a; b} a:n -> b:n; a:s -> b:s; }` | no port-less edge: synthetic hvye |
| V5 label | `digraph { {rank=same; a; b} a:e -> b:w [label=x]; }` | edgelabel_ranks doubles minlen |
| V6 back | `digraph { {rank=same; a; b} a:n -> b:n; b:s -> a:s; }` | auxh→auxt clone: in-edge into the minset leader |
| V7 newrank | V4 plus `newrank=true` | parent NEW_RANK flag; aux still dot1 |

## Native probe

Follow the recipe in `.agent-notes/pt-tracker-2-observations.md` ("swapping a
rebuilt library into the unmodified oracle") and in the `native-oracle-libm`
memory:

1. `rsync -a --exclude build ~/git/graphviz/ $TMPDIR/gv-i130/`. Run
   `git -C $TMPDIR/gv-i130 checkout -- .` to restore the tracked `macosx/build`.
2. In the copy's `make_flat_adj_edges`, just before `cleanupCloneGraph(auxg,
   &attrs)`, add an env-gated `fprintf(stderr, "I130 auxt=%s %d auxh=%s %d max=%d\n",
   ...)` with `agnameof`, `ND_rank` and `GD_maxrank(auxg)`. That point matches
   the port snapshot in AD-4.
3. Configure with the oracle's cmake options plus
   `-DBISON_EXECUTABLE=/opt/homebrew/opt/bison/bin/bison
   -DFLEX_EXECUTABLE=/opt/homebrew/opt/flex/bin/flex`. Run
   `cmake --build <dir> --target gvplugin_dot_layout`.
4. Make a plugin dir in `$TMPDIR`: symlink `/tmp/ghl`'s core plugin, add the
   instrumented `libgvplugin_dot_layout`, then run `GVBINDIR=<dir> <oracle dot> -c`.
   First, check that the uninstrumented rebuild is byte-identical to the oracle on
   V1.
5. Run each variant with `-Tdot`, with the env var set. Record the `I130` lines
   (one per `make_flat_adj_edges` call) in the journal.

Never write to `~/git/graphviz` or `/tmp/ghl`.

## Write-set

- `src/layout/dot/splines-flat.ts` (`buildFlatAux`, its doc, and the AD-3 orphan
  block only)
- `src/layout/dot/splines-clone.ts` (`cloneNode` and its import only)
- `src/layout/dot/splines-clone.test.ts`
- `src/layout/dot/flat-adj-source-subgraph.test.ts` (create)
- `plans/post-16.1-followups/README.md` (item 140 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`,
  README summary
- `.agent-notes/issue-130.md` (only if novel)

## Read-set

- `src/layout/dot/splines-flat.ts:60-200,355-385`
- `src/layout/dot/splines-clone.ts:25-75,105-121`
- `src/model/cgraph-ops.ts:60-150`
- `src/layout/dot/rank.ts:175-215,350-365,520-550`
- `src/layout/dot/flat-adj-w4.test.ts` (render pattern, native-constant style)
- `src/layout/dot/splines-clone.test.ts`
- `~/git/graphviz/lib/dotgen/dotsplines.c:780-830,877-890,1122-1281`
- `~/git/graphviz/lib/dotgen/rank.c:186-230,390-455,505-525`
- `.agent-notes/pt30-flat-adj-aux.md`

## Interface contracts

`cloneNode(g: Graph, orign: Node): Node` keeps its signature. New behaviour: when
`g` is a subgraph (`g !== g.root`), the returned node is also a member of `g` and
of every graph above it. The two existing callers and the tests pass the root, so
they are unaffected. No exported symbol is added.

## Acceptance criteria

- Given any variant V1-V7, when the port lays it out, then the aux graph has
  exactly one subgraph, `xxx`, with `rank=source` and only `auxt` (the
  flip-swapped tail) as a member.
- Given V2 (`rankdir=LR`), when the aux is built, then the member of `xxx` is the
  node C clones into `subg` after `SWAP(&tn, &hn)`, which is the original head.
- Given the instrumented native build, when each variant runs, then every `I130`
  line's auxt/auxh ranks and maxrank equal the port snapshot's, call for call.
- Given `cloneNode(subg, n)`, when it returns, then the clone is in `subg.nodes`
  and in `subg.root.nodes`.
- Given the smoke list and the targeted survey, when they are compared with the
  base and native, then no output differs from the base.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from
`git archive 04d10447` into `$TMPDIR/i130-base/`: symlink `node_modules`, run
`npm run parser:regen`, then `npm run build:js`. Copy `dist/index.js` to
`$TMPDIR/issue130-base.mjs` (the issue-129 precedent; this does not use
`git worktree add`). Build the head the same way from the working tree into
`$TMPDIR/issue130-head.mjs`. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue130-base.mjs $TMPDIR/issue130-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue130-bytediff.json
```

Expected: identical on every job. Any difference is a halt unless it equals
native.

## Targeted survey

How to choose ids: the change only runs inside `makeFlatAdjEdges`, which is
reached by an adjacent flat edge group with a port (dot engine only).

1. Use the manifest from `buildManifest(corpusRoot())` (`test/corpus/enumerate.ts`).
   Grep the inputs for a `rank` of `same`/`min`/`max`/`source`/`sink`, or for
   `rankdir`, together with edge port syntax (`:` after a node id in an edge
   statement, or `headport`/`tailport`).
2. Keep only the candidates that actually reach the aux path. Build a throwaway
   bundle from a `$TMPDIR` copy of the head with one `console.error('I130HIT')`
   in `makeFlatAdjEdges`, and render each candidate `-Kdot -Tdot`. Do not put the
   marker in the repo.
3. Always add `1949`, `2437` and any `graphs-flatedge` hit, plus `1323` as a
   control (record shape, so C bails before the aux).
4. Cap the list at 30 ids. If more hit, take every id in the smoke list plus the
   lowest-numbered ones.

For each id, render `-Kdot` as dot, xdot and svg with the base bundle, the head
bundle and the oracle. Compare head with base byte for byte, and head with native
using the corpus comparators (xdot 0.01). Expected: head = base everywhere. Record
the grep, the hit list and the results in the journal.

## Observability

N/A: there are no new operations. The change is to the internal aux graph only.

## Rollback

Reversible: revert the commit.
