# Decisions: issue #131

## Auto-confirmed (unattended)

Planned by `/plan-mission --unattended next --branch chore/issue-queue` on
2026-11-10. #131 was the lowest-numbered open `queue:ready` issue, it had no
"Blocked by" references, and no issue was labelled `queue:planned`. Nobody
confirmed the decisions below. Each one names the options it rejected and the
evidence, so the maintainer can audit it.

### AD-1: unbind the four object-creating symbols always; the six field-only ones only on evidence

- **Decision:** add `E_headlabel`, `E_taillabel`, `E_xlabel` and `N_xlabel` to
  the aux symbol state and leave them unbound in `AUX_INIT_SYMS`, even if every
  probe is byte-equal. For `E_fontcolor`, `E_labelfontcolor`, `N_fontcolor`,
  `N_showboxes`, `N_nojustify` and `N_style`, probe each one. Unbind it only if a
  probe differs from native and the diagnosis names that symbol as the cause.
  Otherwise record, in `AUX_INIT_SYMS`'s doc comment, why it needs no gate: the
  reader and that no aux pass reads the field.
- **Why the split:** in the port, a bound read of the first four creates a
  `TextlabelT` on an aux object and sets a `has_labels` bit on `auxg`
  (`edge-label-init.ts:171,190,209,236`, `nodeinit.ts:168-175`). C creates none
  of them in the aux. Those objects then reach passes that C also runs on
  `auxg` with different input: `gvPostprocess` → `addXLabels` (C
  `postproc.c:405-424` gates on `GD_has_labels`; the port's
  `xlabels-place.ts:438`), the aux bounding box that sets the postprocess
  translation, and `placePortLabels` (`splines-label.ts:374`). That is the same
  kind of latent divergence #130 found: equal output on the inputs at hand, a
  different program state. The other six only set a colour, a justification
  width or nothing at all on aux objects that no aux pass reads and that
  `cleanupCloneGraph` discards (`N_style` has no layout reader in C or in the
  port: `checkStyle` is called only from `stylenode` and `point_gencode`, both
  render code).
- **Rejected:** unbinding all ten. `N_fontcolor` is read in
  `src/common/poly-init.ts:50`, `E_fontcolor`/`E_labelfontcolor` in
  `initFontEdgeAttr`/`initFontLabelEdgeAttr` (`edge-label-init.ts:73,96`),
  `N_nojustify` in `nodeinit.ts:156` and `record.ts:392`. Threading a symbol state through those
  shared helpers, which every engine calls, changes signatures across
  `src/common` for values the aux never reads. The issue's own done criterion
  is "any that matter are unbound".
- **Rejected:** unbinding only what a probe shows. It would leave the aux
  making labels C never makes, so a later change to `addXLabels` or the aux bb
  could diverge with no test to catch it.
- **Evidence:** the reader table in the README; C `setState`
  (`dotsplines.c:739-769`); C `make_flat_adj_edges` calls
  `dotneato_postprocess(auxg)` (`dotsplines.c:1240`), mirrored by the port's
  `gvPostprocess(aux.auxg)` (`splines-flat.ts:378`).

### AD-2: extend `InitEdgeSyms`; take narrow parameters in `src/common`

- **Decision:** add four booleans to `InitEdgeSyms` (`src/layout/dot/init.ts:133`),
  defaulting to the C global names in camelCase: `headlabel`, `taillabel`,
  `xlabel` (E_xlabel) and `nodeXlabel` (N_xlabel). `DOT_INIT_SYMS` sets them
  `true`, `AUX_INIT_SYMS` `false`. The interface already holds a node symbol
  (`group` is `N_group`), so keep its name.
  In `src/common/edge-label-init.ts` declare a narrow
  `EdgeLabelSyms { headlabel; taillabel; xlabel }` with an exported all-bound
  default, and give `initEdgeLabels` an optional fourth parameter of that type.
  In `src/common/nodeinit.ts` give `commonInitNode` an optional third parameter
  `{ nodeXlabel: boolean }` (all-bound default) and pass it down to
  `initNodeFromLabel` → `initNodeXLabel`, for both the record and the polygon
  branch. `dotInitNodeEdge` passes its `syms` to both; `InitEdgeSyms` satisfies
  both narrow types structurally.
- **Unbound means:** the read returns what C's `agxget` on a NULL symbol
  guard gives: the `E_xlabel && …` tests in `common_init_edge` fail, so no label
  is made and no `has_labels` bit is set. The gate goes at the read, not by
  deleting the attribute from the clone (C's `agcopyattr` keeps the value; only
  the global is NULL).
- **Rejected:** importing `InitEdgeSyms` into `src/common`. `src/common` does not
  import from `src/layout` today (only test files do), and the narrow types keep
  that direction.
- **Rejected:** deleting the attributes from aux clones in `cloneNode`/`cloneEdge`.
  Any by-name read would then differ from C, and it moves the change into
  `splines-clone.ts`, away from where C's effect happens.
- **Evidence:** the other two `commonInitNode` callers
  (`patchwork/index.ts:389`, `osage/index.ts:124`) and the 13 non-test callers of
  `commonInitNode`/`initEdgeLabels` keep their behaviour through the defaults.

### AD-3: leave `placePortLabels`' gate as it is

- **Decision:** do not change `placePortLabels` (`splines-label.ts:374-379`).
  C's gate there is `(E_headlabel || E_taillabel) && (E_labelangle ||
  E_labeldistance)` (`dotsplines.c:447`). The port proxies the globals with
  `edgeAttrDeclared(g, …)`, which is true on `auxg` because `cloneGraph`
  declares every edge attribute. Once AD-2 stops the aux init from creating
  head and tail labels, `placeHeadLabels`/`placeTailLabels` find no label on any
  aux edge (their per-edge `ED_head_label == NULL` checks) and do nothing,
  which is C's result. Record this in `AUX_INIT_SYMS`'s doc comment.
- **Rejected:** passing the symbol state through `dotSplines_` to the gate. It
  widens a signature on the main path for a loop that already does no work.
- **Check:** T1's unit test asserts no aux edge has `head_label`/`tail_label`,
  which is what makes the loop a no-op.

### AD-4: test through the real aux graph, as #130 did

- **Decision:** add `src/layout/dot/flat-adj-aux-syms.test.ts`. It uses the
  `vi.mock('./splines-clone.js', …)` passthrough from
  `flat-adj-source-subgraph.test.ts` to snapshot, before `cleanupCloneGraph`,
  each aux edge's `label`/`xlabel`/`head_label`/`tail_label` presence, each aux
  node's `xlabel` presence and `auxg.info.has_labels`. It renders the probe
  inputs through the public `render()` and also pins their output against native
  (dot text constants or fixture files, the executor's choice). Unit cases for
  the new parameters go in the existing tests: `src/common/edge-label-init.test.ts`,
  `src/common/nodeinit.test.ts` and `src/layout/dot/init.branch.test.ts`.
- **Rejected:** exporting a debug hook from `src/`. The C has none (YAGNI).
- **Evidence:** the #130 test reached the aux graph this way and caught a real
  divergence.

## Baseline

On `8645f5ca`, 2026-11-10, during planning: `npm run typecheck` exit 0;
`npm test` exit 0, 558 files, 12778 tests passed. `package.json` has no lint
script; typecheck is the static gate. The working tree was clean.

## Rollback

Reversible: revert the one commit. No data, API or format change. Output changes
only if a probe shows the base differs from native, and then only towards native.
