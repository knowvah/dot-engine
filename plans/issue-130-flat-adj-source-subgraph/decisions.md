# Decisions: issue #130

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. #130 was the lowest-numbered open `queue:ready` issue, it had no
"Blocked by" references, and no issue was labelled `queue:planned`. Nobody
confirmed the decisions below. Each one names the options it rejected and the
evidence, so the maintainer can audit it.

### AD-1: build the subgraph in `buildFlatAux`, in C's statement order

- **Decision:** in `buildFlatAux` (`src/layout/dot/splines-flat.ts:178`), right
  after `cloneGraph(g)` and before either `cloneNode`, call
  `const subg = agsubg(auxg, 'xxx', true)!` and `subg.attrs.set('rank', 'source')`.
  Then `auxt = cloneNode(subg, refTn)` and `auxh = cloneNode(auxg, ...)`.
- **Rejected:** creating the subgraph inside `cloneGraph`. C does it in
  `make_flat_adj_edges`, not in `cloneGraph` (`dotsplines.c:780-825`), and
  CLAUDE.md says to keep function boundaries.
- **Rejected:** setting `rank` through a declared-attribute helper. C needs
  `agattr_text(auxg, AGRAPH, "rank", "")` (`dotsplines.c:788`) only because cgraph
  rejects `agset` of an undeclared attribute. The port's `rankSetClass`
  (`rank.ts:181`) reads `g.attrs.get('rank')` directly, so `attrs.set` gives the
  same result.
- **Evidence:** `agsubg` (`src/model/cgraph-ops.ts:115`) already gives a subgraph
  its parent, root and AGSEQ. `cleanupCloneGraph` (`splines-clone.ts:120`)
  already clears `auxg.subgraphs`. `collapseSets` (`rank.ts:354`) routes a
  `rank=source` subgraph to `collapseRankset`. `rank.branch.test.ts` already
  covers `minmaxEdges` and `minmaxEdges2` for SOURCERANK.

### AD-2: `cloneNode` installs into a subgraph the way C's `agnode(subg, ...)` does

- **Decision:** in `cloneNode` (`src/layout/dot/splines-clone.ts:36`), after
  `agnode(g, orign.name, true)`, add `if (g !== g.root) agsubnode(g, n, true);`.
  That gives C's `agnode(subg, name, 1)` semantics: the node exists in the root
  and is a member of `subg` and of every graph above it. Cite
  `lib/cgraph/node.c:agnode`.
- **Rejected:** making `agnode` itself install into subgraphs. `agnode` has 12
  callers in `src/`, and its doc comment says "node creation always installs into
  the root graph" (`cgraph-ops.ts:67-68`). That is a wider blast radius than a
  follow-up item should carry. It would be a separate issue.
- **Rejected:** calling `agsubnode(subg, auxt, true)` in `buildFlatAux`. That
  works, but `cloneNode(subg, ...)` would then not mean what C's `cloneNode(subg,
  ...)` means.
- **Evidence:** today `cloneNode` takes `g` only for `agnode`, which reads only
  `g.root` (`cgraph-ops.ts:77`). Existing callers pass `auxg` (root), so they keep
  their behaviour.

### AD-3: keep `splines-flat.ts` at or below its HEAD line count

- **Decision:** `splines-flat.ts` has 571 lines at HEAD. The complexity hook blocks
  any edit that grows a file over 500 lines. Offset the 2-3 new lines by removing
  the orphaned doc block at `splines-flat.ts:113-122`: "Route flat edges between
  adjacent nodes … Acceptance criterion 1 …". It sits above `interface FlatAux`,
  documents nothing there, and repeats `makeFlatAdjEdges`'s own doc (`:358-364`).
  Fold any detail worth keeping into `makeFlatAdjEdges`'s doc.
- **Rejected:** moving the subgraph lines into a helper in `splines-clone.ts` to
  save lines. That splits C's inline `make_flat_adj_edges` statements across files
  for a tooling reason, not a TypeScript one (CLAUDE.md: keep function
  boundaries).
- **Rejected:** adding the file to `complexity-ignore`. The hook's rules reserve
  that for code we do not own.
- **Evidence:** `~/.claude/hooks/check-complexity.py:229-234` compares the new line
  count with HEAD's. pr-workflow allows a 1-3 line fix of a pre-existing defect in
  a file you are editing.

### AD-4: the test watches the real aux graph through a `vi.mock` passthrough

- **Decision:** add a new test file `src/layout/dot/flat-adj-source-subgraph.test.ts`.
  It does `vi.mock('./splines-clone.js', ...)` with the real module spread in and
  `cleanupCloneGraph` wrapped, so the wrapper records a snapshot before the real
  function clears the graph. The snapshot holds: the subgraph names, `xxx`'s
  `rank` attribute, `xxx`'s member names, and each aux node's `{name, rank}` plus
  `auxg.info.maxrank`. The test renders each variant through the public
  `render()`.
- **Rejected:** exporting `buildFlatAux` or adding a debug hook to `src/`. The C
  has no such API (CLAUDE.md, YAGNI), and a unit call to `buildFlatAux` would skip
  the rank pass the issue asks about.
- **Rejected:** extending `test/diagnostic/flat-aux-dump.ts`. It replays its own
  copy of the aux build, so it would not test the port's `buildFlatAux`.
- **Evidence:** the issue's done criterion is "a native probe shows the same aux
  ranks". This captures the port side of that comparison from the real code path.

## Baseline

On `04d10447`, 2026-11-10, during planning: `npm run typecheck` exit 0;
`npm test` exit 0, 557 files, 12730 tests passed. `package.json` has no lint
script; typecheck is the static gate. The working tree was clean.

## Rollback

Reversible: revert the one commit. Nothing changes in data, the API or the output
format, and no output change is expected.
