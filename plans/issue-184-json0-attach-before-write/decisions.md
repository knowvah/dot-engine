# Decisions: issue #184

All decisions were auto-confirmed (an unattended planning run). The evidence for
each is in [harness/](harness/).

## AD-1: json0 runs `attach_attrs` before it writes, as C orders it

**Context.** C's `json_begin_graph` calls `attach_attrs(job->gvc->g)` for
`FORMAT_JSON0` (`~/git/graphviz-16.1.1/plugin/core/gvrender_core_json.c:56-67`).
The write happens later, in `json_end_graph`. `write_attrs` (`:342-362`) prints
whatever `agxget` returns, so json0 prints what the write-back stored: the
graph's and every cluster's `bb` (and `lp`/`lwidth`/`lheight`), and every
edge's `pos` (and `lp`, `xlp`, `head_lp`, `tail_lp`).

The port's `Json0Renderer.endGraph` (`src/render/json.ts:686-689`) passes
`attachAttrs` to `attachBeforeWriteWithClusterEdges`
(`src/render/json-cluster-edge.ts:34-39`). On a graph with no cluster edges
that helper returns `attach` uncalled, and the renderer runs it after
`buildJson`. `buildJson(g, false)` has no draw lookup (`json.ts:648-649`), so
nothing overlays `bb` or edge `pos`. Only nodes have a fallback
(`nodeLayoutAttrs`, `json.ts:519-525`). The helper's header claims "a graph
with no cluster edges keeps the usual order (attach after the write): nothing
there can differ". That holds for `-Tjson`, whose xdot draw lookup overlays the
same values, and not for json0.

**Decision.** `Json0Renderer.endGraph` attaches, then writes. The prototype
([harness/prototype.diff](harness/prototype.diff), 2 lines) calls the helper's
return value at once:

```ts
attachFirst(g, () => attachAttrs(g))();
job.write(buildJson(g, false));
```

With cluster edges, the helper attaches and undoes them, then returns a no-op.
Without them, it returns `attach`, which runs now. Either way C's order holds:
`attach_attrs`, with its `undoClusterEdges`, then the write. T1 may write this
as an explicit attach plus undo if that reads better (push-forward). It also
corrects both comments that describe an overlay json0 does not have: the
`endGraph` doc comment, and the paragraph in the `json-cluster-edge.ts` header.

**Rejected.**

- (A) A json0 overlay in `buildJson` that formats `bb`/`pos` from the model
  without mutating `attrs`. That is a second copy of `attach_attrs`'
  formatting (`write-back.ts` already has it), and C has no such path.
  `json.ts` is already over the 500-line hook limit.
- (B) Making `attachBeforeWriteWithClusterEdges` always attach first. That also
  moves `-Tjson`'s held xdot write-back (`json.ts:302`). `-Tjson` already equals
  native on the repro and the subgraph render, so this widens the change for
  no gain.
- (C) Keep attach-after-write (part 9 AD-12, `write-back.ts` header) and accept
  the gap. #136's AD-1(b) deferred exactly this change to #184. The
  cluster-edge branch already attaches first (#135), and C attaches first.

**Consequences.**

- json0 gains the keys native prints: root and cluster `bb`, edge `pos`, and,
  where they apply, `lp`/`lwidth`/`lheight` on graphs. The builder's own label
  functions (`attachGraphLabelGeom`, `attachEdgeLabelPositions`,
  `attachNodeRects`, `attachNodeXlp`) still overwrite their keys after
  `emitAttrs`, so their values do not change.
- **json0 key order changes.** A node object now lists `pos, height, width,
  label` (`attachNode`'s set order, then the `\N` default). It used to list
  `label, pos, width, height`. Native lists keys alphabetically (cgraph's
  symbol dict), so neither order is native's. The json bar is structural
  (`compareJson`, #136 AD-2), and no test pins json0 key order (planning: 386
  json/gvc tests pass on the prototype).
- `buildNodeObject`'s `nodeLayoutAttrs` fallback stays: `-Tjson` uses it when
  the xdot re-render fails. For json0 it now sets the values `attrs` already
  holds. T1 corrects its comment ("json0 / hand-built graph").
- A later layout of the same graph reads the same write-back as before, only
  earlier. `rerender.test.ts` ("a json0 render feeds pos back too") passes on
  the prototype.

## AD-2: the bar is `compareJson`, and new keys may carry old layout divergence

**Context.** json0 bytes never equal native's (key order, root `name` `%1`,
#185). A key json0 newly prints carries whatever divergence the port's layout
already has for that object. `-Tjson` prints the same `bb` and `pos` (through
the xdot write-back), and its divergence is already tracked.

**Decision.** For each input and engine, the harness compares base and head
json0 with native through `compareJson`.

- `lost` counts diffs the head has and the base did not.
- `unowned` counts lost diffs that base `-Tjson` does not show at the same
  path, with the same value, against native `-Tjson`.

The pass rule is `unowned = 0` in every row, and no stderr row going from
`same` to `DIFF`. This is queue rules gate 5, exception (a): the field equals
the port's value in a format whose output did not change.

**Evidence (planning).**

- Probes (10 inputs × 8 engines): head equals native in 79 of 80 rows (base:
  0 of 80).
- The one other row is `concentrate.gv`/sfdp: 42 lost and 0 unowned. Base
  `-Tjson` differs at the same 42 paths by the same values: a 4-cycle that
  sfdp lays out in another orientation, #257's family.

## AD-3: tests

- **New `src/render/json0-attach.test.ts`.** It renders the 10 probes under 8
  engines as json0 and runs `compareJson` against
  `harness/native/<probe>.gv.<engine>.json0` (native 16.1.1, 2026-11-17).
  - 79 rows expect `diffs` to equal `[]`.
  - `concentrate.gv`/sfdp expects no diff whose path ends in `[missing]` (each
    key is present), with a comment naming #257.
  - A provenance comment names the oracle, the plugin dirs, the command and
    the date.
- **`src/render/json-dup-cluster.test.ts:195`.** The subgraph render's
  `compareJson` check covers both `json` and `json0` (`it.each(JSON_FORMATS)`),
  and the "(json0 lacks bb and pos there: issue #184)" note goes. The json0
  ref `harness/out/sub.s.json0` is #135's 16.1.0 capture from a C harness
  program; the prototype gives `[]` against it, and the base gives 3 missing
  keys (`[graph]/bb`, `cluster:cluster_x/bb`, `edge:c->d#0/pos`).
- A focused unit case in the new file, with no native file needed:
  `digraph { a -> b }` under dot, where json0's root `bb` is `0,0,54,108` and
  edge 0's `pos` is native's
  `e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536`.

## AD-4: change type

`fix`, a patch release. Squashed subject:
`fix(json): attach layout attributes before json0 writes as c does`.

## Baseline

Measured on `89613a69`, with the tree clean except this brief. Results are in
[decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. No data or API contract changes.
json0 gains keys native prints, and its object key order changes (JSON object
order carries no meaning).

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| Where json0 gets `bb`/`pos` | AD-1: attach before the write (C order) | A: overlay in `buildJson`; B: always attach first in the shared helper (moves `-Tjson` too); C: keep the gap | Prototype: probes 79/80 equal native (base 0/80); subgraph render `[]`; 386 json/gvc tests pass |
| Pass rule | AD-2: `compareJson`, `unowned = 0` | byte equality (impossible: key order, #185) | `concentrate`/sfdp's 42 lost diffs are all in base `-Tjson` (#257) |
| Key order change | accepted | preserve the old order by reordering after attach | native's order is alphabetical, neither old nor new; structural bar (#136 AD-2) |
| Selecting #184 | lowest-numbered `queue:ready`, no blockers, no `queue:planned` open | n/a | the skill's `next` rule |
