# Decisions: issue #192

Unattended planning run; every decision below was auto-confirmed. Evidence:
[harness/survey.md](harness/survey.md). Base `9fdfe503`.

## AD-1: port `attach_phase_attrs` into `dotLayoutPipeline`, before the postprocess

**Context.** C calls `attach_phase_attrs(g, 1|2|2)` at the three phase stops,
then returns 0, and `dot_layout` runs `dotneato_postprocess`. The port's stops
call `gvPostprocess(g)` and return.

**Decision.** Add `attachPhaseAttrs(g, maxphase)` to
`src/layout/dot/index.ts`, called at each stop before `gvPostprocess`, with
argument 1, 2 and 2 as in C. It walks `g.nodes` (C's `agfstnode(g)`; only
the values are order-sensitive, not the walk) and sets
`ownAttrs(n).set('rank', String(n.info.rank ?? 0))`, plus `order` from
phase 2. `?? 0` follows the calloc hazard in CLAUDE.md: `rank` and `order`
are optional fields in `NodeInfo`.

**Why.** The attributes are layout output stored on the graph, read by every
writer that prints attributes (dot, xdot, json through its inner xdot), so one
attach at the layout fixes all three. Planning prototype: 56/56 probe jobs
equal native.

**Rejected.**

- (A) Emit `rank`/`order` in the serializer (`write-back.ts` / `attrs.ts`
  overlay). C writes them at layout; a serializer overlay would miss
  `GvcContext.layout` callers who read `n.attrs` without rendering, and
  splits one C function across two layers.
- (B) Attach after `gvPostprocess`. That is not C's order. The values do not
  depend on it, but CLAUDE.md says do not reorder.

## AD-2: the `agattr` default rule

**Context.** `agattr_text(g, AGNODE, name, "")` on the root resets an
existing root definition's default to `""` (`lib/cgraph/attr.c:266-274`).
The symbol keeps `print`, so `write_dict` (`lib/cgraph/write.c:275-283`)
prints `node [order=""]`; native confirms it (probe `p2-root-default`). With
no definition it creates a global one with an empty default, which prints
nothing. Subgraph definitions are local symbols and keep their values (probe
`p1-subg-default`: native keeps `node [rank=9]` in `subgraph s`).

**Decision.** `declareEmptyNodeAttr(g, name)`: if `g.nodeDefaults.has(name)`,
set it to `''`; otherwise store nothing. A missing key is the port's
empty default (the `write-back.ts` convention). Never touch subgraph
`nodeDefaults`.

**Rejected.** Always set `nodeDefaults[name] = ''`: the port's writer prints
every entry (`agwrite.ts:203-206`), so it would print `node [rank=""]` where
native prints nothing.

## AD-3: tests

**Decision.** New `src/layout/dot/phase-attach.test.ts`, written before the
`src/` change (red on base). Through `parse` + `render` (public), assert:

- `p1-basic`, `p2-basic`, `p3-basic` `-Tdot`: the whole output equals
  `harness/native/<probe>.dot` (inline the expected text; it is short).
- `p2-root-default`: root `node [label="\N",\n\t\torder=""\n\t];` and each
  node's `order`.
- `p1-subg-default`: `subgraph s` keeps `node [rank=9]`; `x` gets `rank=1`.
- `p1-node-own`: the user's `a [rank=5]` becomes `rank=0`.
- `-Tjson` on `p2-basic`: nodes carry `"order"` and `"rank"` strings with
  native's values (parse the json; do not compare formatting).
- `p4-full`: no `rank`/`order` attribute (the full pipeline attaches none).

The header cites `lib/dotgen/dotinit.c:attach_phase_attrs`, the carried
oracle, and `plans/issue-192-phase-attrs/harness/native/` (captured
2026-11-21). Keep it under 150 lines. The existing `phase-attr.test.ts`
(phase parsing) stays unchanged.

## AD-4: scope

**Decision.** Only the non-pack path. The pack arm ignores `phase` entirely
(`pack-components.ts:250-254`), which is a separate defect with its own
native behaviour: the component-local symbol keeps `node [order=7]`. It is
filed as #281. Fill nodes on a newrank relayout (#192's "Also unverified")
are filed as #282: there is no native reference, because native segfaults.

## Baseline

Planning base `9fdfe503`: `npm run typecheck` exit 0; `npm test` 610 files,
15203 passed. With the prototype: typecheck exit 0; 610 files, 15203 passed,
no test edited. No lint script (`package.json`).

## Rollback

Reversible: revert the one squashed commit. No API shape changes. Output
gains attributes only on graphs that set `phase` to 1-3 (outside pack).

## Auto-confirmed (unattended)

- Phase 3 took AD-1 (layout-side attach before the postprocess), rejecting
  (A) and (B), and AD-2 (conditional root reset), rejecting the
  always-declare variant. Evidence: probes 56/56 with the prototype.
- AD-4 split two parts into follow-ups #281 and #282, filed at planning
  under the queue rules ("new defects found on the way").
- Phases 2, 4, 5 and 6 as written in the README and T1.
