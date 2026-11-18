# Decisions: issue #183

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/).

## AD-1: seed `cluster` with the label keys in the builder

**Context.** The builder snapshots the enclosing graph attributes when a
subgraph opens (`graphDefaultsSnapshot`, `src/parser/builder.ts:311`). It
seeds `GRAPH_LABEL_INHERIT_KEYS` from the snapshot into the subgraph's own
`attrs`, and records them in `seededAttrs` (`builder.ts:81`, `:322-327`). The
`-Tdot` writer hides seeded keys (`src/render/dot/attrs.ts:291`). The json
writer merges the snapshot under `attrs` anyway (`src/render/json.ts:346`).
Three functions decide clusterhood, and all read `attrs`:

- `isACluster` (`src/layout/dot/rank.ts:89`), used by dot, fdp, neato, pack,
  collect and the json cluster walk;
- `isCluster` in `src/layout/osage/index.ts:86`;
- `isCluster` in `src/layout/patchwork/index.ts:307`.

**Decision.** Add `'cluster'` to the seed list and rename the constant
`GRAPH_INHERIT_SEED_KEYS`, because it no longer holds label keys only. Its
comment names `is_a_cluster` (`lib/common/utils.c`) as the reader of the new
key. Update the one test comment that names the old constant
(`src/render/dot-write-dicts.test.ts:196`). Prototype:
[harness/prototype.diff](harness/prototype.diff).

**Rejected.**

- (A) Read `graphAttrInherited(g, 'cluster')` (`src/common/attr-get.ts:43`)
  in the three functions ([harness/prototype-a.diff](harness/prototype-a.diff)).
  dot's pack projection (`pack-components.ts:111`, `proj.attrs = new
  Map(sub.attrs)`) drops the snapshot, while C's `agcopyattr` copies
  effective values. So `pack.gv` under dot stays 10 lines off native, missing
  every subgraph `bb`. Option B gives 0.
- (A') Option A, plus copying the snapshot in `projectOne`. That edits four
  places to do what one seeded key does, and leaves any other `attrs`-only
  copy exposed.
- (C) #242's general fix (seed or snapshot-read every key). That is a
  different issue, with a wider layout blast radius (`ordering`, `nslimit`,
  ...). This change is a strict subset of it, and #242's executor folds the
  seed list into whatever it builds.

**Consequences.**

- A subgraph's `attrs` now holds `cluster` when it inherits one. That is
  what C's `agget` returns, so `GraphHandle` reads through the public API
  match native too.
- `-Tdot` stays invisible through `seededAttrs`. json is unchanged, since the
  snapshot was already merged there.
- No reader of `attrs` iterates keys in a way `cluster` affects
  (`grep -rn "'cluster'" src` at planning: only the three functions and
  pack's `packmode` token).

## AD-2: the snapshot's order-sensitivity is cgraph's

**Context.** cgraph declares a new name with `""` (`bindattrs`), at the scope
that first uses it. `setattr` (`lib/cgraph/attr.c:265`) then acts as follows:

- a new global symbol with `defval` `""` is applied to every graph;
- an update to an existing local symbol first pins the existing direct
  children (`unviewsubgraphsattr`);
- a subgraph's own value is a new local symbol whose `defval` later children
  copy (`agmakeattrs`).

So a subgraph gets the value in effect in its parent when it opens, and never
a later one. `effectiveGraphDefaults` (`builder.ts:89`) walks `attrs` from
scope to root when the subgraph opens, which gives the same result.

**Evidence.** `late.gv` (the root sets `cluster` after `p`: native clusters
`r` only), `nestlate.gv` (set mid-body: `q` no, `s` yes), `off.gv` (a local
`false` shadows the root's `true` for the children). All are byte-equal to
native under the prototype.

**Decision.** No change to the snapshot.

## AD-3: tests

- `src/parser/builder.test.ts`, new `describe` "graph attribute `cluster` is
  inherited":
  - the root's `cluster=true` is seeded into a nested subgraph's `attrs`, and
    `seededAttrs` has `cluster`;
  - a subgraph's own `cluster=false` wins and is not marked seeded;
  - a root value set after the subgraph opened is not seeded.
- `src/render/dot-write-dicts.test.ts`: a seeded `cluster` does not print in
  a subgraph's `graph [...]`. The comment at `:196` names the new constant.
- `src/layout/cluster-inherit.test.ts` (new). Render cases over the 13 probes
  × 8 engines × `dot`, `xdot`. They read `harness/probes/` and
  `harness/native/`, as `src/render/json-dup-cluster.test.ts` reads issue
  135's harness.
  - stdout must byte-equal native in 204 rows. The other 4 are listed with
    comments naming #209 and AD-4:
    - `num`/fdp: stdout differs from native in exactly one line, the inner
      cluster's `graph [bb=...]`;
    - `mixed`/sfdp: the stdout check is skipped (sfdp draws no clusters, and
      the divergence has nothing to do with them).
  - stderr equals the captured `.err` file, or empty, in all 208 rows.
  - A provenance comment names native 16.1.1, `-K<engine> -T<fmt>`, the
    plugin dirs, and the capture date (2026-11-17).

## AD-4: residual differences that predate this change

- `num.gv`/fdp, `dot` and `xdot`: the inner cluster's `bb` is `7.9936e-15`
  natively and `0` in the port. The base gives the same line for the same
  graph with `subgraph cluster_p` (`$TMPDIR` check at planning). #209
  describes this family: fdp cluster drift from Apple libm `atan2`/`sin`/`cos`
  last bits. T1 links the row to #209 in the journal.
- `mixed.gv`/sfdp: 7 lines off on base and head alike. The same graph with
  `cluster_x` renamed `x` and no `cluster` attribute is still 7 lines off.
  sfdp ignores clusters, so this is an sfdp layout divergence. T1 searches
  open issues (sfdp tracked divergences) and links one, or files a
  `follow-up`.

## AD-5: change type

`fix`, a patch release. Squashed subject:
`fix(parser): inherit the cluster graph attribute as agmakeattrs does`.

## Baseline

Measured on `89708589` with the tree clean except this brief. Results are in
[decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. There are no data or format
contract changes. Subgraphs that inherit `cluster` become clusters, as they
are natively.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| Where the inherited value is read | AD-1 seed `cluster` in the builder | A: snapshot read in 3 functions; A': plus snapshot copy in pack; C: #242's general fix | `pack.gv`/dot: A 10 lines off, B 0; B is 1 line; #242 owns the general case |
| Snapshot semantics | AD-2 unchanged | re-model setattr | `late`, `nestlate`, `off` byte-equal native |
| Residuals | AD-4 link #209, link or file for sfdp | fold into this mission | both reproduce on the base without `cluster=` |
| Selecting #183 over #242 | lowest-numbered `queue:ready`, no blockers | plan #242 first | the skill's `next` rule; #183 is a subset of #242 and lands cleanly before it |
