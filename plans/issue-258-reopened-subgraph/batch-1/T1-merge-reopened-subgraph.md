# T1: build a re-opened subgraph's body into it, tests, gates, squash

## Context

`agsubg` returns the existing subgraph, so a second `subgraph p {…}` in the
same parent adds to the first and keeps its first-open attribute values; edge
statements expand subgraph endpoints after the whole statement (AD-1, AD-3).
The builder replaces the subgraph and expands endpoints from body text.
[../harness/prototype.diff](../harness/prototype.diff) is the working
prototype: it meets every check below except the comments and the tests.

## Steps

1. **Red.** Write `src/parser/builder-reopen.test.ts` (AD-5). Read probes from
   `plans/issue-258-reopened-subgraph/harness/probes/` and native output from
   `harness/native/<probe>.dot.dot`, as `src/render/json0-attach.test.ts`
   reads issue 184's harness. Render with
   `renderFormat(parse(src), 'dot', 'dot')` (`test/helpers/render-format.ts`);
   silence stderr with `agseterrf` (reset in `afterEach`). Run on the base:
   expect the 11 byte-equal render cases to fail except `reopen11` and
   `reopen13` (equal on the base) and every model case to fail. Journal the
   counts.
2. **Green.** In `src/parser/builder.ts`:
   - `processSubgraph`: on `prior !== undefined`, `buildGraph(stmt.stmts,
     prior, root, directed, this)` and return `prior` (AD-1). Replace the
     "Content still overwrites" comment with the C reference
     (`lib/cgraph/subg.c:agsubg`, `grammar.y:opensubg`).
   - `declareGraphAttr`: `graph.seededAttrs?.delete(key)` (AD-2), with a
     one-line `@see lib/cgraph/attr.c:setattr` comment.
   - `processEdgeStmt` / `resolveEndpoint`: resolve all endpoints first; a
     subgraph item yields its `Graph`; expand each to its `nodes` sorted by id
     after resolution (AD-3). Keep the `graphs-world` and `1902` notes in the
     comment, and cite `grammar.y:endedge`/`edgerhs`.
   - Delete `NameCollector` (AD-3) after `grep -rn NameCollector src test`
     shows no other user.
   - `wc -l src/parser/builder.ts` ≤ 506; each function within the
     complexity hook.
3. **Existing tests.** `npm test`. Planning found none that pin
   replace-on-reopen (the prototype passed unchanged). A failure that does is
   push-forward (update to native, journal); any other is a gate failure.
4. **Probes.** Preflight
   (`npx tsx plans/issue-258-reopened-subgraph/harness/preflight.ts`), build
   bundles (see [Bytediff](#bytediff)), then from the repository root:

   ```
   H=plans/issue-258-reopened-subgraph/harness
   node $H/compare.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs $H/probes/*.gv \
     > $H/results/probes-head.tsv
   node $H/residual.mjs $TMPDIR/head.mjs $H/results/probes-head.tsv $H/probes \
     > $H/results/residual-head.tsv
   ```

   Pass: both byte-identical to `probes-planning.tsv` and
   `residual-planning.tsv` (360 rows: 172 `headEqNative` `yes`; 118 svg rows
   with `head` 3; 64 #262 rows missing only the pinned pair; 6 sfdp rows on
   `reopen11`, `reopen15`; `baseErr`/`headErr` `same` throughout).
5. **Gates 1-6** (README). Record each in the journal.
6. **Diagnosis row.** Journal the artifact:
   - **Mechanism:** the builder made a new `Graph` for a re-opened named
     subgraph, dropping the first body's members and retaking the attribute
     snapshot, where `agsubg` returns the existing subgraph; subgraph edge
     endpoints were expanded from body text before the statement ended, where
     `endedge` walks the subgraph's nodes after it.
   - **Origin:** port `src/parser/builder.ts:311-320` and `:281-284,399-402`
     (base `286912a4`); C `lib/cgraph/subg.c:52-60`, `grammar.y:586-595`,
     `grammar.y:449-530`.
   - **Causal chain:** second `subgraph p` → new `Graph` replaces `p` in
     `graph.subgraphs` → `a` belongs to no subgraph but the root → fresh
     snapshot holds the root's later `cluster=true` → seeding makes `p` a
     cluster (#183) → root `bb` and positions move.
   - **Ruled out:** the seeding of #183 (`reopen2`, where native also makes
     `p` a cluster, equals native with the fix and the seeding unchanged); the
     `-Tdot` writer for the empty pin (`graph G { subgraph p { a } cluster=true }`
     already equals native on the base); the anonymous id counter (named
     re-opens consume none, `builder.test.ts` seq case); a same name under
     another parent (`reopen13` equal on base and head); the non-empty pin
     (reproduces without a re-open: #262).
7. **Finish** (README, "Branch and commits").

## Write-set

- `src/parser/builder.ts` (`processSubgraph`, `declareGraphAttr`,
  `processEdgeStmt`, `resolveEndpoint`, `NameCollector` removed)
- `src/parser/builder-reopen.test.ts` (new)
- existing `*.test.ts` files that encoded replace-on-reopen (push-forward,
  journalled)
- `plans/issue-258-reopened-subgraph/harness/results/` and `harness/extra/`
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status and summary)
- `.agent-notes/issue-258.md`, `.agent-notes/issue-183.md` (the re-open
  observation)

## Read-set

- `src/parser/builder.ts:76-106` (seed keys, `effectiveGraphDefaults`),
  `:237-262` (assign/attr), `:275-288`, `:290-342`, `:374-405`
- `src/render/dot/attrs.ts:260-340` (`graphInputParts`, `eagerEmptyParts`)
- `src/model/graph.ts:65-125`
- `src/parser/builder.test.ts:113-121` (seq case)
- `~/git/graphviz-16.1.1/lib/cgraph/subg.c:24-66`,
  `grammar.y:449-530,586-605`, `attr.c:165-190,232-300`

## Interface contracts

No public interface changes. `resolveEndpoint` (private) returns
`Node[] | Graph`; `processSubgraph` still returns the subgraph `Graph` (now
the existing one on a re-open).

## Bytediff

Queue gate 5. Build the base bundle from `git archive 286912a4` in `$TMPDIR`
(symlink `node_modules`, `npm run parser:regen`, `npm run build:js`, copy
`dist/index.js` to `base.mjs`); the head bundle from the working tree
(`npm run build:js`, copy to `head.mjs`). Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/base.mjs $TMPDIR/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i258-smoke.json
```

**Expect** every job identical, 0 diffs (no smoke id re-opens a subgraph, and
no corpus model changes). A capped job is load: re-run it alone. Any diff is
stop 3.

## Targeted survey

**Selection rule.** The change is in the builder only, so an input can render
differently only if its parsed model changes. Gate 6 has two parts:

1. **Reach** over every input the corpus can hold (oracle `tests/`, `graphs/`,
   `share/`, `doc/`; this repository's `test/`, `docs/`; 1320 files):

   ```
   G=~/git/graphviz-16.1.1; H=plans/issue-258-reopened-subgraph/harness
   node $H/model-reach.mjs $TMPDIR/base.mjs $TMPDIR/head.mjs \
     $G/tests $G/graphs $G/share $G/doc test docs > $H/results/reach-head.txt
   ```

   Pass: `# files 1320, model differs 0`. The ids it can reach are then none,
   and the comparison with native is the probe set.
2. **Probes** against native: step 4's TSVs equal planning.

Why these probes: [../harness/survey.md](../harness/survey.md).

## Observability / rollback

Observability: N/A (a library with no logs, metrics or traces). Rollback:
Reversible (revert the one squashed commit).

## Acceptance criteria

- Given `graph G { subgraph p { a } cluster=true; subgraph p { b } }`, when it
  renders under dot as `-Tdot`, then the output equals native 16.1.1: one
  `p` with `graph [cluster=""]`, `a` and `b`, root `bb="0,0,126,36"`.
- Given `graph G { subgraph p {a} subgraph p {b} -- subgraph p {c} }`, when it
  parses, then the root holds the 9 edges native draws (`a`, `b`, `c` × `a`,
  `b`, `c` in sequence order).
- Given `graph G { label=L; subgraph cluster_p { a } subgraph cluster_p { label=M; b } }`,
  when it renders as `-Tdot`, then `cluster_p` prints `label=M`, as native.
- Given the 15 probes × 8 engines × dot, xdot, svg, when compared, then the
  head and residual TSVs equal planning's (no row further from native than
  the base).
- Given the reach harness and the smoke bytediff, when run base against head,
  then no corpus model and no smoke output changes; the log has one commit
  after the base, footer `Refs: #258`, and tag `issue-258/pre-squash` holds
  the per-task history.
