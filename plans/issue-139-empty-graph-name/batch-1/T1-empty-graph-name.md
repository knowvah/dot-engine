# T1: an explicit empty graph name is a name

## Context

cgraph: `agopen(NULL)` and `subgraph {` are anonymous (`agnameof` → `%<id>`), while
`agopen("")` and `subgraph ""` map the name `""` (`lib/cgraph/id.c:agmapnametoid`,
`idmap`). `write_hdr` (`lib/cgraph/write.c:338-355`) prints `<kind>graph "<name>" {`
whenever `name && name[0] != '%'`. `irrelevant_subgraph` keeps any such named subgraph.

The port: `Graph.anonymous` (`src/model/graph.ts:47-56`) is set by the parser
(`src/parser/builder.ts:478`). It is read only by `agNameOf` (`src/model/cgraph-ops.ts:44`).
`writeHdr` (`src/render/dot/agwrite.ts:154-168`) and `isAnonymous` (`:96-99`) test
`g.name.length` instead. `builder.ts:483` advances the anon counter on `!ast.id`, which is
true for `''`. `createGraph` (`src/api/builder.ts:342-345`) never sets `anonymous`.

## Task (TDD)

1. **Native refs:** preflight (`oraclePreflight(dot, '/tmp/ghl', 'dot')`), run
   `GVBINDIR=/tmp/ghl bash plans/issue-139-empty-graph-name/harness/regen.sh`, then
   `git diff --exit-code plans/issue-139-empty-graph-name/harness/out` (stop condition 3
   otherwise). Journal it.
2. **Red:** create `src/render/dot/empty-graph-name.test.ts` (SPDX header, `@see
   lib/cgraph/write.c:write_hdr`, `@see lib/cgraph/id.c:idmap`, a module-level
   `HARNESS_139` URL constant, and `read`/`renderRef(name, fmt)` helpers as in
   `echo-attr-wrap.test.ts`, engine dot). Cases:
   - Fixtures `root-empty`, `strict-empty`, `anonsub-empty`, `sub-empty`,
     `sub-empty-bare`, `root-anon` × {dot, xdot, cmapx}: output equals `out/<f>.<fmt>`.
   - Json names: for each fixture except `root-anon`, the root `name` and the `name` of
     every subgraph object (objects with `_gvid` and `subgraphs`/`nodes`/`edges`, or a
     name matching `^%|^$|^cluster`) equal the native ref's. For `root-anon`, assert the
     subgraph names only (root `name` is #185).
   - Parser: `parse('digraph "" {}').anonymous` is false, and `parse('digraph {}')` is
     true. `parse('digraph "" { subgraph { a } }')` has a subgraph named `%1`, and
     `parse('digraph { subgraph { a } }')` has `%3`.
   Add to `src/api/builder.test.ts`: `createGraph().graph.anonymous` is true;
   `createGraph({ name: '' }).graph.anonymous` is false; `render(createGraph().graph,
   'dot', { engine: 'dot' })` starts with `digraph {`, and with `{ name: '' }` it starts
   with `digraph "" {`.
   Run both files. The `root-empty`, `strict-empty`, `anonsub-empty`, `sub-empty` and
   `sub-empty-bare` dot/xdot cases, the `anonsub-empty`/`sub-empty` json names, the
   `%1` parser case and the builder cases must fail. The `root-anon` and cmapx cases
   pass (regression pins).
3. **Green:** AD-1 (`agwrite.ts:158`), AD-2 (`isAnonymous` body and its doc comment),
   AD-3 (`builder.ts:483` and the comment above it), AD-4 (`createGraph`, its JSDoc,
   `CreateGraphOptions.name` doc). Update the `Graph.anonymous` doc (`graph.ts:47-55`):
   the dot writer reads it now too. Update `agNameOf`'s doc (`cgraph-ops.ts:36-43`) only
   if it has gone stale. Run both files green, then `src/render/dot/agwrite.branch.test.ts`,
   `src/render/map-renderers.test.ts`, `src/render/map.branch.test.ts`,
   `src/model/cgraph-ops.test.ts`, `src/gvc/rerender.test.ts`.
4. Mark item 153 in `plans/post-16.1-followups/README.md` (line ~714)
   `**[DONE — issue #139: writeHdr/isAnonymous read the anonymous flag; parser anon id
   and createGraph default fixed]**`, in item 145's style.
5. Gates 1-6 (README), journal, `.agent-notes/issue-139.md`, then the squash.

## Write-set

- `src/render/dot/agwrite.ts` (`isAnonymous`, `writeHdr` root line, their docs)
- `src/parser/builder.ts` (line 483 and its comment)
- `src/api/builder.ts` (`createGraph`, its JSDoc, `CreateGraphOptions.name` doc)
- `src/model/graph.ts` (the `anonymous` doc comment only)
- `src/model/cgraph-ops.ts` (`agNameOf` doc comment only, if stale)
- `src/render/dot/empty-graph-name.test.ts` (new)
- `src/api/builder.test.ts` (the new cases)
- A test that relies on `''` meaning nameless, per stop condition 1's exception only
- `plans/issue-139-empty-graph-name/harness/out/*` (regenerated; must not change)
- `plans/post-16.1-followups/README.md` (item 153 only)
- `plans/decision-journal.md` (one row), this mission's `decision-journal.md`, the
  README/overview checkboxes
- `.agent-notes/issue-139.md`

## Read-set

- `src/render/dot/agwrite.ts:60-170`; `src/render/dot/xdot-ops.ts:310-325` (`xdotId`)
- `src/parser/builder.ts:150-230,280-330,465-486`
- `src/model/graph.ts:40-60,180-190`; `src/model/cgraph-ops.ts:20-50,107-130`
- `src/api/builder.ts:20-35,225-275,325-346`
- `src/render/json.ts:574-600` (why json root `name` stays `g.name`: #185)
- `src/render/dot/echo-attr-wrap.test.ts` (test shape to mirror)
- `~/git/graphviz/lib/cgraph/write.c:318-360` (`write_hdr`) and `irrelevant_subgraph`;
  `~/git/graphviz/lib/cgraph/id.c` (`idmap`, `agmapnametoid`, `agnameof`);
  `~/git/graphviz/lib/cgraph/graph.c:agopen`

## Interface contracts

`Graph`'s constructor signature is unchanged. `CreateGraphOptions` is unchanged in
shape. Only the meaning of an omitted `name` changes: it is now anonymous. No other
`src/index.ts` export changes. `isAnonymous` is private to `DotWriterBase`.

## Acceptance criteria

- Given `digraph "" { a -> b }` (and the `strict graph ""` form), when written as dot or
  xdot, then the first line is `digraph "" {` (`strict graph "" {`) and the output equals
  native.
- Given `graph "" { subgraph "" { a } subgraph { b } subgraph cluster_x { c } }`, when
  written, then `subgraph "" {` holds `a`, the anonymous one prints `{`, and the output
  equals native. An empty `subgraph "" {}` is written, not inlined.
- Given `digraph "" { subgraph { a } subgraph cluster_q { b } }`, when written as json,
  then the anonymous subgraph is named `%1`, as native names it.
- Given `digraph { … }` (`root-anon`), when written as dot, xdot or cmapx, then the
  output still equals native.
- Given `createGraph()` with no name, when rendered as dot, then it starts `digraph {`.
  Given `createGraph({ name: '' })`, then it starts `digraph "" {`.

## Bytediff

`src/` changes, so gate 5 applies. Build the base bundle from `git archive c0a8aeb6` in
`$TMPDIR/issue139-base` (`node_modules` symlinked, `npm run parser:regen`,
`npm run build:js`) and the head bundle from the worktree. Copy each `dist/index.js` to
`$TMPDIR/issue139-{base,head}.mjs`, then run:

```
npx tsx test/tools/bytediff.ts $TMPDIR/issue139-base.mjs $TMPDIR/issue139-head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/issue139-bytediff.json
```

Expected: `1896` (smoke list line 4, root `digraph "" {`) changes its xdot output on
every engine (first line `digraph "" {`). Its other formats may change only if it has an
anonymous subgraph (json names). Every other smoke id is identical. Each changed job must
equal native: the report names it, so render it with the oracle (engine plugin dirs
preflighted) and compare. Otherwise halt.

## Targeted survey

How to choose: the change reaches only inputs whose root or a subgraph is named `""`
(AD-1..AD-3; AD-4 is API-only). At planning, a regex scan of the 971 manifest entries
(`/^\s*(strict\s+)?(di)?graph\s+""\s*\{/im` and `/subgraph\s+""/i` over each file) found
`1864`, `1896`, `2734` (root) and `2621` (subgraph). Re-run the scan and take whatever it
finds. Render each with engines dot, neato, circo, osage (a `$TMPDIR` plugin dir,
preflighted), formats dot, xdot, json, cmapx, with base, head and native, using a 60 s
cap per render.

- `1864` and `2621` exceed 60 s natively per format (planning; `2621` is `oracleError` in
  `dot-parity-dot.json`). Allow each one native `-Kdot -Tdot` render with a 600 s cap, at
  load < 12. If it is still capped, record it as capped and instead check that the head's
  first line (and, for `2621`, its `subgraph ""` lines) match the input's names.
- Pass: every row where head differs from base has head equal to native, or equal to
  native modulo a difference also on base (name it). No row where base equals native and
  head does not. Compare json by root and subgraph `name` plus the repo's comparator
  (`compareJson` skips the top-level `name`).
- Journal the ids, how they were chosen, and the counts.

## Observability

N/A: no new observable operations.

## Rollback

Reversible: revert the commit.
