# Decisions: issue #177

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-17, base `a7cd496e`. Nobody confirmed these; each is recorded with the
options it rejected and its evidence so the maintainer can audit it.

### AD-1: the suffix travels with the label's anchor fields

**Context.** C's `emit_edge_label` (`lib/common/emit.c:2851-2900`, 16.1.1)
takes `lkind` and the edge's `obj->id`, and builds `<id>-label`,
`<id>-headlabel` or `<id>-taillabel` (center label and xlabel both
`EMIT_ELABEL`, so both `-label`); when `id` is NULL it passes NULL.
`map_begin_anchor` (`plugin/core/gvrender_core_map.c:194-201`) prints that id.
The port's `MapRendererBase.emitEdgeLabel` (`src/render/map.ts:749-754`)
passes the bare `obj.id`.

**Decision.** Add a `suffix: 'label' | 'headlabel' | 'taillabel'` field to
`EdgeLabelAnchor` (`src/render/map.ts:623`), set at the four call sites in
`emitEdge`; `emitEdgeLabel` passes `obj.id === null ? null : `${obj.id}-${suffix}``
to `anchorOf`.

**Rejected.** (a) A fifth parameter on `emitEdgeLabel`: reaches the
complexity hook's `MAX_PARAMS = 5` boundary (`~/.claude/hooks/check-complexity.py:76`).
(b) Passing the port's `EmitState` and mapping it to a string, as C maps
`lkind`: needs a switch the map renderer would own alone, more lines in a file
that may not grow (AD-2). (c) Reusing `renderEdgeLabels` from
`src/gvc/edge-labels.ts`, which already builds the suffixed ids for svg: the
map renderer draws no labels and its hooks are no-ops; rerouting it is a
refactor this issue does not need.

**Evidence.** A scratch prototype of exactly this change (reverted; base and
prototype bundles in `$TMPDIR/i177/`) took 48 of 81 probe rows to byte-equal
native and left 33 unchanged (all svg rows and `nolabel`), none away
([harness/prototype-probes.tsv](harness/prototype-probes.tsv)). The #176
`elabel` probe (the 6 rows #251 asks about, part 2) goes to byte-equal native.

### AD-2: `src/render/map.ts` must not grow

`map.ts` is 805 lines at base. The complexity hook blocks a write that leaves
a file over 500 lines longer than at `HEAD` (`check-complexity.py:229-237`).
The prototype was +1 line (a `const id` line). Inline the id expression into
the `anchorOf` call, or shorten a comment in the touched functions without
dropping a `@see`. A split is out of scope (stop condition 2).

### AD-3: the #176 test's `elabel` probe becomes a byte-equal probe

`src/render/map-id-prefix.test.ts` lists `elabel` in `PARTIAL_PROBES` with its
label lines left out "(#177)". After the fix those lines equal native, so move
`elabel` into `EQUAL_PROBES` (it then also runs on `cmapx-np`) and remove the
`elabel` paragraph from the header comment. Rejected: leaving it partial (it
would keep passing, but would hide a regression of this fix and keep a stale
`#177` pointer).

### AD-4: a new test file, reading this brief's native captures

`src/render/map-edge-label-id.test.ts`, the pattern of
`map-id-prefix.test.ts`: probe × engine × format byte equality against
`plans/issue-177-cmapx-edge-label-ids/harness/native/`, plus inline unit cases
on the id text. Rejected: adding cases to `map.branch.test.ts` (1 file over
500 lines already; its edge-label block asserts only hrefs, and stays as is).

## Baseline

Planning base `a7cd496eade46759fffe68791a965e5f5c2f535d`. `npm run typecheck`
and `npm test` results: see [decision-journal.md](decision-journal.md), row 0
(run at planning, Phase 8).

## Rollback

Reversible: revert the one squashed commit. No API or data contract changes;
only the text of `id` attributes on edge-label `<area>` lines in `cmapx` and
`cmapx_np` (imap prints no ids).

## Irreversible changes

None.
