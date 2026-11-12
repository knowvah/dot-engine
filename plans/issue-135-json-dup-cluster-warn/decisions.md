# Decisions: issue #135

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. Nobody confirmed these; each names the rejected options and the evidence
so the maintainer can audit it.

### AD-1: port `label_subgs`, `insert` and `lookup` into `json-cluster-edge.ts`

- **Decision:** add to `src/render/json-cluster-edge.ts` (it already holds
  `clusterNodeGid`, the port's `lookup`):
  - `insertCluster(map: Map<string, number>, name: string, v: number): void`, C's
    `insert`: if `name` is mapped, warn `` `Duplicate cluster name "${name}"` `` through
    `agwarningf` when the stored value differs from `v`, and return; else map it.
    No trailing `\n` (the port's `agerr` finishes the line; see issue #129's lesson).
  - `labelSubgs(g: Graph, lbl: number, map: Map<string, number>, out: Graph[]): number`,
    C's `label_subgs`: for a non-root `g`, push `g` onto `out` (its gid is its index,
    `lbl++`) and, when `isACluster(g)`, `insertCluster(map, g.name, gid)`; then recurse
    over `g.subgraphs` in order; return `lbl`.
  - `lookupCluster(map, name): number`, C's `lookup`: `map.get(name) ?? -1`.
  - Delete `clusterNodeGid` (its only caller is `assignIds`; re-grep with `grep -rna`).
- **Rejected:** (a) a one-off `warnDuplicateClusterNames(dfsSubs)` pass in `assignIds`:
  smaller, but a second walk that C does not have; CLAUDE.md keeps C's function
  boundaries, and `insert` both warns and builds the map `lookup` reads. (b) Put the
  functions in `json.ts`: the file is 730 lines and the complexity hook blocks any edit
  that makes a file over 500 lines longer. (c) A new module: `json-cluster-edge.ts` is
  50 lines and already owns the cluster-node gid.
- **Evidence:** `plugin/core/gvrender_core_json.c:604-639` (`lookup`, `insert`,
  `label_subgs`), `:651-668` (`write_graph`'s top pass). `insert` keeps the first value,
  so `lookup` returns the first DFS cluster of a name, which is what `clusterNodeGid`'s
  `findIndex` returns today: cluster-node gids do not change.

### AD-2: `assignIds` calls `labelSubgs`; `json.ts` gets no longer

- **Decision:** in `assignIds` (`src/render/json.ts:372`), replace the `dfsSubgraphs`
  call and the `forEach` with `const sgcnt = labelSubgs(g, 0, clusters, dfsSubs)`,
  build `subgGid` from `dfsSubs` as now, and set a cluster node's gid with
  `lookupCluster(clusters, n.name)`. Delete `dfsSubgraphs` (`json.ts:362-368`, no other
  caller). The edit must leave `json.ts` at or under 730 lines.
- **Rejected:** keep `dfsSubgraphs` and walk twice: duplicate recursion.
- **Evidence:** the warning then fires inside `endGraph` (`buildJson` -> `assignIds`),
  i.e. after the render's `layers not supported` warnings, as native orders them
  (planning: `harness/lay.gv`, json and json0). One warning per json render, as native
  prints one per `-Tjson` in `-Tjson -Tjson0 -Tsvg`.

### AD-3: replace the two literal NUL bytes in `json.ts` with `'\0'`

- **Decision:** `json.ts:222` and `:225` contain a literal NUL byte inside string
  literals (`e.tail.name + '<NUL>' + e.head.name`). Write them as `'\0'`. Same string
  value; `grep` stops treating the file as binary (plain `grep -n` printed nothing for
  `json.ts` during planning).
- **Rejected:** leave it: a 2-line pre-existing violation in a file being edited
  (pr-workflow rule), and the Edit tool round-trips NUL bytes unreliably.
- **Evidence:** `grep -naP '[\x00-\x08]' src/render/json.ts` shows exactly lines 222
  and 225. After the edit it must print nothing, and the json tests stay green.

### AD-4: native stderr refs in `harness/out/`, one test file

- **Decision:** `harness/regen.sh` writes native stderr for `dup`, `dup3`, `attr`, `lay`
  under dot × {json, json0, svg}, and `dup` under the seven neato-plugin engines ×
  {json, json0} (26 refs, generated at planning). New test
  `src/render/json-dup-cluster.test.ts` renders each case with the port (console spies,
  as `src/gvc/first-layer.test.ts`) and compares the captured lines with the ref.
  fdp's refs start with `fillMap`'s `Two clusters named` warning, which the port does
  not print (follow-up, below): the fdp cases assert the port's lines equal the ref
  minus that first line, with a comment naming the follow-up.
- **Rejected:** hand-written expectations: refs come from native. Byte-comparing json
  stdout: the port's `render()` json text is not byte-equal to native on any input
  (structural `compareJson` is the json bar); the issue's done-condition is stderr.

### AD-5: inherited `cluster` attributes are out of scope

- **Decision:** `isACluster` (`src/layout/dot/rank.ts:89`) ignores a `cluster`
  attribute inherited from a parent, so `graph{cluster=true; ...}`-style inputs still
  miss the warning after T1. It is a layout defect (native draws 4 clusters, the port 0
  or 2), filed as a follow-up, not fixed here.
- **Rejected:** fix `isACluster` in this mission: it changes cluster detection for
  every engine, far beyond a json warning, and needs its own survey.

## Follow-ups found at planning

The planner's `gh issue create` was refused by the session's permission classifier.
T1 step 1 files both drafts (queue rules: label `follow-up`, not `queue:ready`):

- [followup-fillmap-warning.md](followup-fillmap-warning.md): `fillMap`'s
  `Two clusters named` warning is missing (fdp; dot with `compound=true`).
- [followup-inherited-cluster-attr.md](followup-inherited-cluster-attr.md): AD-5.

## Baseline

On `71e9e0ea`, 2026-11-10 during planning: `npm run typecheck` exit 0; `npm test`
exit 0, 560 files, 13228 tests. No lint script; typecheck is the static gate.

## Rollback

Reversible: revert the one commit. Output changes only on stderr, only for json and
json0 renders of a graph with two clusters of one name.
