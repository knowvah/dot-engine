# Decisions: issue #242

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/). Base `27110d7d`.

## AD-1: seed every inherited graph attribute into the subgraph's own `attrs`

**Context.** cgraph gives a new subgraph a copy of every graph attribute value
in effect in its parent: `agmakeattrs` (`~/git/graphviz-16.1.1/lib/cgraph/attr.c:165`)
copies each visible symbol's `defval` into the subgraph's record once, when it
opens. Every `agget(subg, name)` in layout and render then reads it. The port
takes the same open-time snapshot (`graphDefaultsSnapshot`,
`src/parser/builder.ts:310`) but copies only seven keys into `attrs`
(`GRAPH_INHERIT_SEED_KEYS`, `:88`, loop `:323-329`). `agGraphAttr`
(`src/model/cgraph-ops.ts:191`) and every direct `attrs.get` read only `attrs`,
so a cluster under `ordering=out` reads `""`: `ordered_edges(cluster)` adds no
flat edges, and `reorder` swaps nodes native keeps (the issue's repro, 26 plain
lines off native).

**Decision.** In `processSubgraph`, seed every key of
`sg.graphDefaultsSnapshot` the body did not set into `sg.attrs`, recorded in
`sg.seededAttrs`. Delete `GRAPH_INHERIT_SEED_KEYS` (no other user; fold its
comment into the loop's, as #183's maintainer note asks). Keep where the loop
runs (after the first body, once, as #258 left it).

**Rejected.**

- (B) Read the snapshot in `agGraphAttr` (and keep seeding seven keys). Reaches
  only `agGraphAttr`'s 4 callers, not the direct `attrs.get` reads, and
  loses the value through dot's pack projection, which copies `attrs` alone
  (`src/layout/dot/pack-components.ts:110`): #183's planning measured `pack.gv`
  10 `-Tdot` lines off native with a snapshot read, 0 with seeding.
- (C) Add `ordering` to the seven keys. Fixes the repro and `1472`, but leaves
  the general gap the issue scopes (`rank`, `style`, `bgcolor`, `pack`… on
  subgraphs); the probe `rankset` (root `rank=same`) stays off native.

**Consequences.** The parsed model changes for 227 of 982 applicable manifest
ids ([results/reach-planning.txt](harness/results/reach-planning.txt)), but
outputs change for only two of them: `2242` under fdp (to native) and `1472`
under dot (toward native; #207 holds the rest) — 8 of 9000 bytediff jobs. Every
probe row under dot and xdot equals native on the prototype
([results/probes-planning.tsv](harness/results/probes-planning.tsv)). The
model's `Graph.attrs` on a parsed subgraph now holds every inherited value, as
cgraph's `agxget` returns it; `seededAttrs` marks which ones have no local
symbol.

## AD-2: every writer that copies or prints a subgraph's `attrs` skips seeded keys

**Context.** A seeded value is cgraph's inherited value with no local dict
symbol: `write_dict` (`lib/cgraph/write.c:262`) does not print it. The port has
three places that take a subgraph's `attrs` as if every entry were local:

- `graphInputParts` (`src/render/dot/attrs.ts:287`) already skips
  `seededAttrs`.
- `echoGraphAttr` (`attrs.ts:406`) echoes the input `bb`/`lp`/`lwidth`/`lheight`
  of a subgraph the layout did not box (`agwrite.ts:150`, `attrs.ts:429-431`).
  With every key seeded, a root input `bb` would echo on each unboxed
  subgraph (probe `refed-bb`).
- json's cluster correlation (`src/render/json.ts:280`) copies each cluster's
  `attrs` from the re-parse of the port's own xdot output. That re-parse seeds
  the xdot root's `xdotversion`, `bb` and draw strings into every cluster:
  the prototype without this part failed 19 json tests in 6 files
  (`json-stored-draws`, `svg-clust-in-layer`, `node-in-box-pad`,
  `json-cluster-edge`, `json-dup-cluster`, `json-nonfinite`). The cluster's
  inherited values reach json through `graphEffectiveAttrs` (`json.ts:346`) on
  the original graph, as before.

**Decision.** Add `localGraphAttrs(g): Map<string, string>` to
`src/model/cgraph-ops.ts` (a copy of `g.attrs` without `g.seededAttrs`: the
attributes with a local dict symbol, `aglocaldictsym`). json's correlation
uses it; `echoGraphAttr` returns `[]` for a seeded key. `json.ts` is over the
500-line cap at the base (736) and must not grow: change its existing
`agNameOf` import line and the one `cluster.set` line, nothing else.

**Rejected.** Clearing `seededAttrs` keys from the re-parsed graph inside
`json.ts` (two more lines in a capped file); seeding nothing during the json
re-parse (a parser flag the C does not have; CLAUDE.md's YAGNI rule).

**Consequences.** `irrelevantSubgraph` (`agwrite.ts:122`) needs no change: it
compares a child's `attrs` with its parent's, and a seeded value equals the
parent's effective value unless the parent changed it after the child opened,
where native's pinned local value differs too. The executor greps `src/render`
and `src/gvc` for every other loop over a subgraph's `attrs` (T1 step 2) and
journals each as reads-effective-value (no change) or copies-local (skip
seeded).

## AD-3: leave the per-site snapshot fallbacks in place

**Context.** Four reads fall back to the snapshot when `attrs` lacks a key:
`graphAttrInherited` (`src/common/attr-get.ts:40`, 6 callers), `nslimit`
(`src/layout/dot/position.ts:118`), `nslimit1` (`rank.ts:474`), `label`
(`src/async/collect.ts:165`). With AD-1 the fallback never fires on a parsed
graph, and a hand-built graph has no snapshot.

**Decision.** Leave them; they are outside the write-set and change no output.
Note them in `.agent-notes/issue-242.md` for a cleanup.

**Rejected.** Removing them here: four more files and six callers in a change
whose survey is already 227 ids wide.

## AD-4: the programmatic `agsubg` stays out of scope

**Context.** `agsubg` in `src/model/cgraph-ops.ts:116` makes a subgraph with no
snapshot and no seeding, so a subgraph built through the API inherits nothing
(#183's maintainer note). C's `agsubg` runs `agmakeattrs` too.

**Decision.** Out of scope: the issue is the parser's inheritance, and the API
path changes what library callers get from a public function. The executor
files a `follow-up` issue for it at session end unless one exists
(`gh issue list --search agsubg`).

## AD-5: gate 6 is a parse-model reach, a port bytediff over it, and native for what moved

**Context.** The change reaches output only through a subgraph's `attrs`, which
the parser builds. #258's notes: a parse-model comparison over the corpus is a
strict reach predicate and takes seconds.

**Decision.** (1) `harness/manifest-reach.mjs` lists the applicable manifest ids
whose model (each graph's `attrs` and `seededAttrs`) differs between base and
head; it must equal `reach-planning.txt`. (2) `test/tools/bytediff.ts` base
against head over those ids, all 8 engines and 5 formats. (3) Each changed
output is compared with native; it must equal native or move toward it (the
queue rules' second exception). (4) The probe TSV equals planning's.

**Rejected.** A native survey of all 227 ids × 8 engines (most outputs do not
change; the bytediff finds the ones that do in under an hour with no native
runs).

## Baseline and rollback

- Baseline at planning on `27110d7d`: see [decision-journal.md](decision-journal.md)
  row 0.
- Rollback: Reversible (revert the one squashed commit). No data, API type or
  file format changes. The observable change for library callers is that a
  parsed subgraph's `attrs` holds every inherited value (it held seven keys).

## Auto-confirmed (unattended)

AD-1..AD-5 were taken as recommended. AD-1's evidence: the probe TSV and the
#183 pack measurement; AD-2's: the 19 json failures without it and green
`npm test` with it; AD-4 defers a public-API behaviour change to the
maintainer.
