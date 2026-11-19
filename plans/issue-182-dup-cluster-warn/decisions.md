# Decisions: issue #182

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/).

## AD-1: one shared `mkClustMap` in `src/common/clust-map.ts`

**Context.** C has a single `fillMap`/`mkClustMap` (`lib/common/utils.c:1498-1525`).
`dot_compoundEdges` (`lib/dotgen/compound.c:438`) and `processClusterEdges`
(`utils.c:882`) both call it. The port has two copies:
`src/layout/fdp/cluster-edges.ts:35-55` (`fillMap`, `mkClustMap`, private) and
`src/layout/dot/compound.ts:31-46` (`fillClustMap`, `mkClustMap`, exported,
with no importers other than the file itself).

**Decision.** Create `src/common/clust-map.ts` with a private `fillMap` and an
exported `mkClustMap`. Both layout files import it, and both local copies are
deleted.

**Rejected.** Adding the warning to both copies. That keeps two copies of the
message and the logic, which must change together, and it keeps a function
boundary C does not have.

**Consequences.** One new module in `src/common`, which already holds ports of
`utils.c` (`safefile.ts`, `utils-inputscale.ts`). `compound.ts` loses two
exports. Nothing outside the file imports them
(`grep -rn "fillClustMap\|mkClustMap" src test` at planning).

## AD-2: model agnameof's static-buffer alias for anonymous clusters

**Context.** `agnameof` returns one `static char buf[32]` for every anonymous
graph (`lib/cgraph/id.c:161-164`). `fillMap` stores that pointer as the map key
(`ip->name = s`). After one anonymous cluster is in the map, every later
anonymous cluster's `dtmatch` compares `buf` with itself, matches, and warns.
Evidence:

- `2475_2` has 805 anonymous `cluster=true` subgraphs; native warns 804 times.
- `2475_1` has 5711; native warns 5710 times.
- `harness/probes/anon.gv` has 3; native warns twice (`%7`, `%13`).

The port already names anonymous subgraphs `%N` with cgraph's numbering
(`src/parser/builder.ts:287-296`). `anon.gv` gives `%3 %7 %13` on both sides
under `-Tjson`.

**Decision.** `fillMap` carries an `anonKeyed` flag across the recursion. A
cluster is anonymous when its name starts with `LOCALNAMEPREFIX`
(`src/model/cgraph-ops.ts:27`). The dot writer uses the same test
(`src/render/dot/agwrite.ts:106`). Warn when the name is already in the map,
or when the cluster is anonymous and `anonKeyed` is set. Otherwise, insert it,
and set `anonKeyed` if it is anonymous. The prototype is in
[harness/prototype.diff](harness/prototype.diff).

**Rejected.**

- (a) Named duplicates only. That meets the issue's own done criterion, but it
  leaves `2475_2` 804 lines short of native's stderr. Correcting it later would
  rewrite the same function.
- (b) Mark subgraphs `Graph.anonymous`. `agNameOf`
  (`src/model/cgraph-ops.ts:45-47`) then returns `%1` for every anonymous
  subgraph, which breaks the dot writer and the messages.

**Interaction with #194.** A source name starting with `%` (`subgraph "%bar"`)
is anonymous in cgraph, but `aginternalmapprint` returns its stored string, not
`buf`, so C does not alias it. Today the port keeps `%bar` as the name, so the
prefix test aliases it. In C, a `%bar` cluster is never aliased; whether the
port's ordering of these cases ever differs from C's is #194's concern. T1
comments on #194 so its executor knows `clust-map.ts` reads the prefix.

## AD-3: lookups of anonymous names are not modelled

C's later `dtmatch` against the aliased key compares with whatever `agnameof`
printed last. Only an `lhead`/`ltail` that names `%N` (dot), or a node named
`%N...` that starts with `cluster` (impossible), could reach it. The port's map
keeps the first anonymous cluster under its own name. Out of scope. No probe,
and nothing in the corpus reaches it.

## AD-4: native's intermittent fdp segfault

Native fdp crashes on some runs of duplicate-cluster inputs
([harness/survey.md](harness/survey.md)). fillMap's warnings precede the crash.

- [harness/compare.mjs](harness/compare.mjs) retries a SIGSEGV run up to five
  times and reports `SEGVxN` in its `native` column.
- The tests compare stderr with the captured `harness/native/*.err` files. They
  never call native at test time.
- `dup3c`/fdp is excluded from stdout comparison (native always crashes) but
  kept for stderr.
- `2475_1` is out of every comparison because native runs longer than 300 s.

The crash is a native defect, not the port's. It is recorded and not filed
here.

## AD-5: tests

- `src/common/clust-map.test.ts` (new). Unit cases on hand-built cluster trees:
  a named duplicate in preorder, a three-level tree, the anonymous alias, and
  the map keeping the first. Render cases over the ten probes × eight engines
  compare the port's stderr with native's. They read the probes from
  `harness/probes/` and native's stderr from `harness/native/`, as
  `src/render/json-dup-cluster.test.ts` reads issue 135's harness. A provenance
  comment names native 16.1.1, `-K<engine> -Tdot`, the plugin dirs, and the
  capture date (2026-11-17).
- `src/render/json-dup-cluster.test.ts`. The case
  `dup -Kfdp -T%s prints native's stderr minus the fillMap line` becomes
  "prints native's stderr". `FILLMAP_PREFIX` and the #182 comments go.

## AD-6: change type

`fix`, a patch release. Squashed subject:
`fix(layout): warn on two clusters with one name as fillMap does`.

## Baseline

Measured on `722e372a` with the tree clean except this brief. Results are in
[decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. No data, API or format contract
changes. stderr gains warning lines that native prints.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| Where the warning lives | AD-1 shared module | warn in both copies | C has one function; two copies would duplicate the message |
| Anonymous clusters | AD-2 model the alias | named only; `Graph.anonymous` | 804/805 and 5710/5711 counts, `anon.gv` 2/3, `agNameOf` would break |
| Native crash | AD-4 retry, captured stderr | treat crash rows as failures | 6/30 crashes on `dup.gv`, warnings precede the crash |
| Follow-ups | #255 filed (checkCompound warnings) | fold into this mission | outside the issue; `edgec.gv` reaches it |
