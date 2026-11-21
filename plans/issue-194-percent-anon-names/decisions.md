# Decisions: issue #194

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `cbd6ba50`.

## Mechanism (planning's diagnosis)

- **Mechanism.** cgraph maps a graph name that starts with `%`
  (`LOCALNAMEPREFIX`) as no name. `agmapnametoid` (`lib/cgraph/id.c:104-131`)
  skips the string map, takes an anonymous id (`2*counter+1`, the counter
  every anonymous object shares) and records `name → id` in the internal map.
  A later use of the same name in the parse finds that id
  (`aginternalmaplookup`, `lib/cgraph/imap.c:84`). When the parse ends,
  `endgraph` (`lib/cgraph/grammar.y:580-584`) calls
  `aginternalmapclearlocalnames` (`imap.c:167`), which drops every
  `%`-prefixed entry. After that, `agnameof` (`id.c:145-169`) finds no stored
  string and prints `%<id>`. The port's parser keeps the source string as the
  name and takes no anonymous id for it.
- **Origin.** `src/parser/builder.ts:267` (`const sgName = stmt.id ?? ...`:
  a `%bar` subgraph keeps `%bar` and takes no id) and `src/parser/builder.ts:451-452`
  (a root `%foo` is stored as named, `anonymous` false).
- **Causal chain.** `agNameOf` (`src/model/cgraph-ops.ts:45`) returns
  `g.name` for a named root. So json/json0 `name`, the cmapx/imap
  `<map id name>` (`src/render/map.ts:585`) and the neato warnings print
  `%foo`, where native prints `%1`. A subgraph's stored name is what json
  prints, so `%bar` shows where native has `%3`. Because no id is taken, every
  later anonymous subgraph is numbered 2 lower per `%` name than native's
  (`edges-between`: port `%5`, native `%9`). The dot and xdot headers were
  already equal, because the writer tests the `%` prefix (`agwrite.ts:106`).
- **Same mechanism, found by probing** (all from `agmapnametoid` plus the
  lookup):
  - `reopen`: a second `subgraph "%x"` in the same parent is the same
    subgraph, and the edge between the two takes id 5.
  - `two-parents`: `%q` under two parents is two subgraphs that share one id,
    and both print `%3` (`agsubg`, `lib/cgraph/subg.c:52-70`: the lookup finds
    the id, `agfindsubg_by_id` fails in the new parent, `localsubg` reuses the
    id).
  - `sub-as-root`: `subgraph "%foo"` under `digraph "%foo"` takes the root's
    id 1 and prints `%1`.
  - `collide`: `subgraph "%3"` after an anonymous `%3` is a new subgraph
    `%5`. The base reopens the anonymous one, because both are keyed `%3`.
  - `html-root`, `html-vs-text`: an html-like name `<%x>` is local too (the
    test is on its text), but `"%a"` and `<%a>` get two ids.
- **Ruled out.**
  - The writers. `agwrite.ts`, `json.ts` and `map.ts` already print
    `agNameOf(g)`, which is right once the model holds what cgraph holds
    (#185's notes). With the parser fixed, every in-scope writer row equals
    native, none of the writers edited (results below).
  - `clust-map.ts`'s prefix test (the #182 note on the issue). After
    `endgraph`, a parsed `%x` cluster's `agnameof` is the static buffer, so C
    aliases it like any anonymous cluster. Native prints
    `Two clusters named %5`, and so does the prototype. Only the comment there
    is wrong (AD-3). The API path is different: #286.
  - Node names. The same rule applies (`oos-node`: native `%1`), but the
    issue's criterion covers graphs only: #284.
  - A missing stderr line on `clusters`
    (`Warning: cluster named %c2 not found`). The port never prints
    `getCluster`'s warning for any name (control: `lhead=cluster_zz`): #285.

## AD-1: give a `%` graph name cgraph's anonymous id in the parser

**Context.** Other places were possible: map the name at print time in
`agNameOf` (it cannot know the id, which depends on parse order), or store the
source name and a separate id (no reader needs the source name after the
parse, because cgraph drops it).

**Decision.** As [harness/prototype.diff](harness/prototype.diff) does:

- `StmtProcessor` gets `localGraphIds: Map<string, number>`, the AGRAPH
  internal map. The key is the raw name, html marker included.
- `localGraphId(name)` returns the recorded id, or takes `nextAnonId()` and
  records it.
- `processSubgraph`: `null` → `%${nextAnonId()}` as before, a local name →
  `%${localGraphId(id)}`, else the name. The existing
  `graph.subgraphs.get(sgName)` reopen path then covers `reopen` and
  `sub-as-root` without change.
- `buildFromAst`: a local root name is stored as a nameless root is
  (`name ''`, `anonymous` true), and its name is recorded with id 1.
- `isLocalName(name)` goes in `src/model/cgraph-ops.ts` beside
  `LOCALNAMEPREFIX`. It tests the html text, as `agmapnametoid` tests
  `str[0]`. Putting it there keeps `builder.ts` at 494 lines, under the
  500-line write hook.

**Consequences.** Probe rows equal to native (stdout and stderr) go from 104
to 175 of 182 in scope. The 7 left are `clusters -Kdot`, one stderr line short,
which is #285. `npm test` passes with no test edited (15213). No corpus input
has a `%`-prefixed graph or subgraph name (0 of 1007, grep), so the smoke
bytediff should show 0 diffs.

## AD-2: tests

**Decision.** New `src/parser/builder-local-names.test.ts`, reading the
carried oracle's outputs from
[harness/native/](harness/native/) (written by
[harness/recapture.sh](harness/recapture.sh)), as `builder-reopen.test.ts`
reads #258's harness:

1. For every in-scope probe, the json root and subgraph names, in order, equal
   native's (the `jsonNames` shape of `empty-graph-name.test.ts`).
2. `-Tcmapx` equals native byte for byte.
3. `neato-warn -Kneato`: the stderr equals `native/neato-warn.neato.err`.
4. `clusters -Kdot`: the stderr equals native's minus the `cluster named %c2
   not found` line (#285, named in the test's comment).
5. Model-level checks that need no fixture: `parse('digraph "%foo" {}')` is
   `anonymous` with name `''`, and `[...subgraphs.keys()]` for `two-parents`'
   `P` and `R` are both `['%3']`.

**Consequences.** On the base, item 1 fails for each of the 11 non-control
probes. Item 2 fails for the 6 whose root is `%`-named (`repro`,
`edges-between`, `html-root`, `neato-warn`, `strict-undirected`,
`sub-as-root`), and items 3 and 4 fail too. The `ctl-*` rows pass on both base
and head. Everything passes on the head. Keep `%` out of `it.each` titles
that also use a placeholder (`.agent-notes/issue-185.md`).

## AD-3: comments that the fix makes false

- `src/common/clust-map.ts:22`: "a source name `"%x"` is stored by cgraph and
  not aliased in C (#194)" is false for parsed input. Replace it with the
  `endgraph` reason (prototype wording). Not a code change.
- `src/render/dot/empty-graph-name.test.ts:66-67`: "Its cmapx and json names
  differ from native on the base too ... (issue #194)". Replace it with one
  line saying they equal native since #194, and point to the new test.

## AD-4: out of scope

- #284 (filed at planning): `%`-prefixed node names (and edge keys).
- #285 (filed at planning): `getCluster`'s missing warning.
- #286 (filed at planning): an API-built `%x` keeps its name in C (no
  `endgraph`), so `clust-map.ts` should not alias it. The API builder is not
  touched.
- `svg-graph.ts:157,373` test `g.name[0] !== '%'` inline
  (`.agent-notes/issue-139.md`). A local root now has name `''`, and the svg
  probe rows equal native, so they stay.

## Baseline (Phase 8)

On `cbd6ba50`: `npm run typecheck` exit 0; `npm test` exit 0, 611 files, 15213 tests. The project has no lint script.
Prototype: see journal row 0.

## Rollback

Reversible: revert the one squashed commit. No data, API or schema change. A
library user who read `graph.name === '%foo'` after `parse` now reads `''` with
`anonymous` true, which is what cgraph gives. Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 fix site | parser takes cgraph's anon id, per-parse AGRAPH map | map in `agNameOf` at print time; keep source name plus id | `id.c:104-131`, `grammar.y:580`; probes 175/182 (base 104) |
| AD-1 helper home | `isLocalName` in `cgraph-ops.ts` | in `builder.ts` | the 500-line hook (509 with it inline) |
| AD-2 tests | new test file on harness fixtures | rows in `empty-graph-name.test.ts` | 13 probes, several formats; #258's pattern |
| AD-3 comments | fix both stale comments | leave them | each would be false after the fix |
| AD-4 scope | nodes #284, warning #285, API #286 out | fix here | issue criterion names graphs/subgraphs only; separate code paths |
