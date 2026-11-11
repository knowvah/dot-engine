# Decisions: issue #169

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-11. Nobody confirmed these; each one names the rejected options and the
evidence so the maintainer can audit it.

### AD-1: read `ordering` through `nodeAttr`

- **Decision:** `doOrderingForNodes` reads `nodeAttr(n, g, 'ordering')`
  (`src/common/attr-get.ts:25`), the port's `agxget` for nodes. Nothing else about
  the loop changes: same `nodesInSeq(g)` order, same `doOrderingNode` calls.
- **Rejected:** copying node defaults into `n.attrs` at parse time. That changes the
  data model every writer reads: `-Tdot` would print `ordering` on each node, which
  native does not. Reading `n.nodeDefaultsSnapshot` inline: it duplicates
  `nodeAttr`, including its fallback for programmatically created nodes.
- **Evidence:** C reads `late_string(n, N_ordering, NULL)` (`mincross.c:495`). On a
  scratch copy of the source this change makes `root-default.gv` and
  `subgraph-default.gv` byte-equal to native in dot, xdot and plain, and keeps
  `late-default.gv` (a `node [...]` after the nodes, which C ignores) equal.
  `cloneNode` copies the snapshot, so the aux graph reads the same value (the
  issue's second example).

### AD-2: port both "not recognized" branches in this change

- **Decision:** `doOrderingForNodes` prints
  `ordering '<v>' not recognized for node '<name>'.` when the value is non-empty
  and neither `out` nor `in` (`mincross.c:498-500`). `orderedEdges` prints
  `ordering '<v>' not recognized.` in the same case for the graph value
  (`mincross.c:524-525`). Both through `agerrorf`, without C's trailing `\n` (the
  port's convention, `src/common/agerr.ts:8-10`).
- **Rejected:** only the node branch, which the issue names under "Not checked".
  The graph branch is the sibling branch of the function being edited, and
  CLAUDE.md asks to port every branch. A separate follow-up issue for it: the same
  two-line shape in the same file, so a second mission would repeat this one.
- **Evidence:** native prints one line per node for `bad-node-default.gv`, one for
  `bad-node-own.gv`, one for `bad-graph.gv`, and exits 0 with unchanged layout
  (`harness/native/bad-*.err`). The candidate change gives byte-equal stderr on
  all three. Of the 33 applicable corpus inputs that mention `ordering`, none
  reaches either branch (traced on the scratch copy; `1652` sets graph
  `ordering=in`, which is recognised).

### AD-3: pin native output end to end, plus one dispatch unit test

- **Decision:** `src/layout/dot/ordering.test.ts` gains tests that render the
  probes with `render(parse(src), 'plain')` and compare with native's `-Tplain`
  exactly, and capture `agseterrf` messages for the bad-value probes.
  `src/layout/dot/mincross-build.branch.test.ts` gains one test: a node with no
  own `ordering` and `nodeDefaultsSnapshot` holding `ordering=out` gets its
  FLATORDER edge from `doOrderingForNodes`.
- **Rejected:** only the unit test: it would not show that the layout equals
  native, which is the issue's "done when". Only end-to-end tests: they would not
  isolate the accessor if the layout later moves for another reason.
- **Evidence:** the probes' plain outputs are 12 lines and contain no
  platform-dependent arithmetic beyond what goldens already pin; the candidate
  change makes them byte-equal.

### AD-4: no golden or corpus record changes

- **Decision:** the mission changes no `test/golden` or `test/corpus` file and no
  ledger entry. `aux-flat-adj.gv` changes and still differs from native; that row
  belongs to #170.
- **Rejected:** a ledger entry for `aux-flat-adj.gv`: it is an open defect with its
  own issue, not an accepted divergence.
- **Evidence:** `1990` is the only corpus input whose nodes take `ordering` from a
  default (15 reads traced), and it equals native on base and head in dot, xdot
  and plain. `docs/known-divergences.md` has no `ordering` entry. A smoke bytediff
  of the base against a bundle of the candidate change gave 1960 of 1960 jobs
  identical.

## Baseline

Measured on `f5ae1c08` at planning (2026-11-11):

| Gate | Result |
|---|---|
| `npm run typecheck` | exit 0 |
| `npm test` | 571 files, 13488 tests passed |
| `bash test/golden/gates.sh` | 5 passed, 0 failed |
| `npx vitest run test/corpus test/docs` | 24 files, 2844 tests passed |
