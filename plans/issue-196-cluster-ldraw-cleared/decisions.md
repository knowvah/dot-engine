# Decisions: issue #196

This was an unattended planning run, so every decision was auto-confirmed.
The evidence for each is in [harness/](harness/). Base `77f433ff`. The
maintainer ruled on the issue (comment, 2026-11-23) that this is a defect of
its own, separate from #140.

## Mechanism (planning's diagnosis)

- **Mechanism.** `xdot_end_cluster` sets a cluster's `_ldraw_` whenever
  `GD_label(cluster)` is set (`plugin/core/gvrender_core_dot.c:285-286`), and
  `xdot_end_graph` does the same for the render root (`:436-437`), even when
  this render's label buffer is empty. The port records a cluster's or the
  root's `ldraw` only from a non-empty buffer, as C does for nodes and edges
  (`:240-241`, `:251-264`).
- **Origin.** `src/render/dot.ts:123` (`endGraph`: `if (gl) set.ldraw`) and
  `src/render/dot.ts:308` (`endCluster`: `if (ldraw) set.ldraw`). Downstream,
  the same truthiness test drops the empty value at
  `src/render/dot/write-back.ts:140` (`renderedDraws`: `d?.ldraw || st.ldraw`),
  `:163` (`attachClusterDraws`), `:179` (`attachDraws` on the root), and
  `src/render/dot/agwrite.ts:381` and `:401` (the serializer prints `_ldraw_`
  only when truthy).
- **Causal chain.** An invisible cluster still runs `emit_begin_cluster` ..
  `emit_end_cluster` (`lib/common/emit.c:emit_clusters`). Its pen is
  `PEN_NONE`, so the label's text span writes nothing and the CLABEL buffer
  stays empty. A `"\n"` label (or `" "`) has a span that writes nothing as
  well. C then stores `""`, replacing any `_ldraw_` the input or an earlier
  render left. agwrite prints `_ldraw_=""`, and json, which skips an empty
  value, prints none. The port records nothing, so `renderedDraws` falls back
  to the stored string: the xdot text keeps it, the write-back keeps it, and
  json (which reads the xdot text and the object's attributes) repeats it.
  On a fresh input the port prints no `_ldraw_=""` line.
- **The serializer rule (third site).** With the empty value recorded, which
  clusters print `_ldraw_=""` follows agwrite's rule for an empty subgraph
  value. The carried oracle shows (probes, all under dot, fdp and osage):
  - a cluster prints only a value it holds itself: one this render set
    (labelled, drawn) or a local symbol (`cluster-empty-stored`). A value
    inherited from a parent prints nothing (`inherited-label`'s inner cluster
    is labelled by inheritance and holds its own `""`; `oos-seeded-ldraw` is
    #293);
  - its empty value is skipped when the value it would inherit is the root's
    own empty value (`ldraw-newline`'s `cluster_n`, `root-empty-cluster`,
    `deep-root-empty`, through an unlabelled cluster);
  - a non-root ancestor's empty value does not skip it (`nested-invis`,
    `plain-parent`'s `cluster_k` under `subgraph s { _ldraw_="" }`).

  This matches what `writeDictSkips` documents for user attributes under a
  root parent. Read literally, `write_dict`'s guard (`lib/cgraph/write.c:271-282`)
  never skips: `Agsym_t.print` is assigned nowhere but `agcopydict`. The port
  already treats the observed rule as authoritative there. The same check
  with a user attribute (`foo=""` in `s` and in `s`'s child `t`) shows the
  port's `writeDictSkips` skips under a non-root parent where native prints:
  that is #294, filed at planning.
- **Ruled out.**
  - json's own sourcing. The xdot text alone differs, and `ldraw-fresh` (no
    stored string, xdot only) differs too. With the fix, json equals native
    on every in-scope probe, and `json.ts` is unchanged: `applyDraws` and the
    write-back now carry `''`, which `emitAttrs` skips.
  - Layout. Only `_ldraw_` lines differ in each xdot diff; bb, `lp`,
    `lwidth` and `lheight` are equal on base and head.
  - Nodes and edges. `empty-buffer` (#140's fixture) equals native on base and
    head: non-empty-only is right for them, and `renderedDraws`' `??` cannot
    change them, since `endNode` and `attachEdgeDraws` never record `''`.
  - Unlabelled clusters. `cluster_y`, `cluster_z`, `cluster_u` keep their
    stored `_ldraw_` on both sides; `endCluster` records `''` only under
    `GD_label` (`sg.info.label`).
  - Engines. The defect is in the xdot writer. dot, fdp and osage move
    together on every probe; svg is unchanged on every probe.
  - The oracle. The carried refs equal #140's 16.1.0 refs byte for byte for
    all six of #140's fixtures (`recapture.sh`, then `diff`).

## Execution amendment (2026-11-23): the serializer rule is write_dict's guard, read literally

Planning's serializer rule (third bullet of the mechanism above, and AD-1's
`clusterLdraw` and `graphAttrs` edits) rested on "`Agsym_t.print` is assigned
nowhere but `agcopydict`". That is false: `lib/cgraph/grammar.y:388-389`
(`attrstmt`) sets `sym->print = true` for every attribute a statement in the
root's own body lists. With the flag, `lib/cgraph/write.c:275-283` reads
literally:

- the graph being written drops an empty value unless its symbol carries
  `print`;
- a subgraph drops its local empty value only when the symbol it would
  inherit (the nearest one up the dict view) is empty and carries `print`;
  only a root symbol can.

Every planning probe declared `_ldraw_` in the root body whenever the root's
value was empty, so the prototype's "the root's own empty value" and the C's
"an empty root symbol with `print`" agreed on all 14. They part on a root
whose label draws nothing and whose body never names `_ldraw_`
(`digraph G { label="\n"; p -> q }`): native prints no `_ldraw_`, the
prototype printed `_ldraw_=""` on the root (a row equal to native on the base
would have left native), and skipped a cluster's `_ldraw_=""` that native
prints. Executed instead:

- `src/model/graph.ts`: `printGraphAttrs?: Set<string>` (root only);
  `src/parser/builder.ts` `declareGraphAttr` adds the key when the scope is
  the root. Both files are outside planning's write-set (journal row 6).
- `src/render/dot/write-back.ts`: `rootLdraw(g, ld)` (empty or missing prints
  `""` only under `print`); `clusterLdraw`'s root test is "root value empty
  and `print`", not "root value is `''`".
- `src/render/dot/agwrite.ts`: `graphAttrs` prints `rootLdraw(...)`. 533
  lines.
- Probes added: `root-nl-only`, `root-nl-fresh`, `root-fresh-nested`,
  `root-graph-stmt`, `root-nl-cluster-decl` (in scope, 19 now),
  `hide-root-nl` (two renders), `oos-pinned-ldraw` (#305).

The rest of AD-1 (record `''` under `GD_label`, `??` and `!== undefined`
downstream, `attachRootDraws`) and AD-2 stand. #294 is this same guard for
user attributes (comment left on the issue).

## Execution amendment (2026-11-23): #292 is fixed here, not left out (AD-3)

AD-1's "one known step away" (`oos-html-empty-label` under dot, fdp, osage,
already different on the base) is, under neato, a row that equals native on
the base and differs on the head: neato draws the cluster with the same bb,
so the port's bogus `GD_label` for `label=<>` cleared a stored `_ldraw_`
that native keeps, and a fresh `label=<>` cluster gained an `_ldraw_=""`
line. A changed output that is not equal to native is a halt under the queue
rules, and the row cannot be left as it is without the cause going:
`do_graph_label` tests the label's text (`*str != '\0'`, `input.c:836`),
and the port tested the marked html value. Fixed at its origin,
`src/layout/dot/graph-label.ts` `doGraphLabel` (strip the html marker, then
return on empty text); unit test in `graph-label.test.ts`. The probe is in
scope as `html-empty-label`, with `html-empty-root` and `html-empty-fresh`.
No corpus input reaches it (`2727` has `label=<>` on a node). AD-3's other
two items (#293, #294) stay out, and #305 joins them.

## AD-1: record the empty value where C sets it

**Decision.** As [harness/prototype.diff](harness/prototype.diff):

- `src/render/dot.ts`, `endGraph`: record `set.ldraw = escBackslash(gl)` when
  `g.info.label != null` (`GD_label`), the buffer empty or not; open the draw
  set on `gd || GD_label`. `endCluster`: the same with `sg.info.label` and
  plain `ldraw` (no escaping, as before). The line count stays 505 (the
  500-line hook blocks growth past the base count).
- `src/render/dot/write-back.ts`:
  - `renderedDraws`: `ldraw: d?.ldraw ?? st.ldraw`, so a recorded `''` wins.
  - `attachClusterDraws`: `if (d?.ldraw !== undefined)`.
  - New `attachRootDraws(g, d)` for the render root (port of
    `xdot_end_graph`'s two stores): `_draw_` when non-empty, `_ldraw_` when
    defined. `attachXdotAttrs` calls it in place of `attachDraws(g.attrs, ..)`.
  - New `clusterLdraw(sg, ld, drawn, ldrawOf)`: the serializer rule above.
    It lives here because `agwrite.ts` is 533 lines and may not grow.
- `src/render/dot/agwrite.ts`: `graphAttrs` prints `_ldraw_` when defined
  (the root's own empty value prints: `root-empty-stored`); `clusterAttrs`
  prints `clusterLdraw(...)`'s value, with `ran = emitDraws ? clusters : []`
  so `-Tdot` counts only local symbols. 533 lines, as on the base.

**Rejected.** (a) Fix only the serializer: the write-back and json would keep
the stale string (`hide-cluster` render 2). (b) Record `''` for every object
kind: C stores non-empty buffers only for nodes and edges. (c) Print every
recorded `''`: `ldraw-newline`'s `cluster_n` and `deep-root-empty` would
print a line native does not.

**Consequences.** In-scope probe rows equal to native go from 96 to 162 of
168; the 6 left are #293's `-Tdot` rows, unmoved. Side effect toward native:
a root's or cluster's own stored `_ldraw_=""` from the input now prints, as
native prints it (`root-empty-stored`, `cluster-empty-stored`, under `-Tdot`
too). One known step away, on an out-of-scope probe only:
`oos-html-empty-label` (`label=<>`). The port wrongly gives that cluster a
`GD_label` (#292), so the head now clears its stored `_ldraw_` where native,
with no label, keeps it. The row differed from native on the base already
(bb), and no corpus row reaches it (journal row 3). Fixing #292 closes it.

## AD-2: tests

**Decision.**

1. New `src/render/dot/cluster-ldraw.test.ts`, on the harness fixtures
   (following #195's `record-html-label.test.ts`). For each in-scope probe
   (`probes/*.gv` without `oos-`, `hide-cluster` excluded: 14) under dot:
   `-Txdot` byte for byte, `-Tjson` parsed with keys sorted, and `-Tdot` byte
   for byte except `plain-parent` and `root-drawn-nested` (#293). The
   `hide-cluster.c` sequence (layout, xdot, `style=invis` on each top-level
   subgraph, second render, no free) against `native/hide-cluster.xdot-xdot`
   and `.xdot-json`. The test emulates `agsafeset` by deleting `style` from
   `seededAttrs` (a local symbol), or the port does not print the new
   `style=invis`. Unit checks of `clusterLdraw` (non-empty, missing, not held,
   root-empty skip, non-root-empty print, local symbol).
2. `src/render/json-stored-draws.test.ts`: the describe "open rows ... (#196)"
   becomes "... goes (#196)", and each list of open rows is `[]` (the issue's
   done condition). The `cluster_l` `_ldraw_` assertion becomes "undefined".

**Consequences.** On the base, with an export-only stub of `clusterLdraw`
(T1 step 3), 28 of the 55 tests in the two files fail: every in-scope xdot
row but the two #140 controls (`empty-buffer`, `stored-input`), the six json
rows and four `-Tdot` rows that differ, the two-render test, #140's three
open-row tests and two unit checks. The prototype passes all 55.

## AD-3: out of scope

- #292 (filed at planning): `label=<>` makes a `GD_label` (`do_graph_label`
  tests `*agget(sg,"label")`). Probe `oos-html-empty-label`.
- #293 (filed at planning): `clusterAttrs` prints an inherited (seeded) draw
  string as a cluster's own, and `-Tdot` drops a cluster's own `_draw_=""`.
  Probe `oos-seeded-ldraw`; the `-Tdot` rows of `plain-parent` and
  `root-drawn-nested`.
- #294 (filed at planning): `writeDictSkips` skips a user attribute's empty
  value under a non-root parent's empty value; native prints it.
- Empty stored draw strings on nodes and edges already equal native (checked
  at planning), so nothing is open there.

## Baseline (Phase 8)

On `77f433ff`: see [decision-journal.md](decision-journal.md) row 0.

## Rollback

Reversible: revert the one squashed commit. No data, API or schema change.
After an xdot or json render, a labelled cluster or root whose label drew no
text holds `_ldraw_ = ''` in its attributes, as C's `agxget` would return.
Irreversible changes: none.

## Auto-confirmed (unattended)

| Decision | Chosen | Rejected | Evidence |
|---|---|---|---|
| AD-1 fix site | record `''` under `GD_label` in `endCluster`/`endGraph`; `??` and `!== undefined` downstream | serializer only; `''` for every object kind | `gvrender_core_dot.c:240,285,436`; probe matrix 66 rows to equal, 0 away in scope |
| AD-1 serializer rule | `clusterLdraw`: held value only; skip on the root's own `''` | print every `''`; reuse `writeDictSkips` (snapshot) | probes `ldraw-newline`, `deep-root-empty`, `root-empty-cluster` (skip) vs `nested-invis`, `plain-parent` (print); #294 |
| AD-1 helper home | `write-back.ts` | `agwrite.ts`, `attrs.ts` | 500-line hook: `agwrite.ts` 533, `attrs.ts` 494 + 23 |
| AD-2 tests | new file on carried fixtures; #140's open lists become `[]` | edit only #140's test | the issue's done condition names #140's lists; xdot rows need byte checks |
| AD-3 scope | #292, #293, #294 out | fix here | separate code paths (layout; seeded attrs; user-attr rule) |
