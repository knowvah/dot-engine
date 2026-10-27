# T13: labels freed by engine cleanup (AD-12, item 72)

**Context:** C frees labels in each engine's cleanup (`dotinit.c:110-111` node label and
xlabel, `:176` `GD_label(g)`; `utils.c:1517-1531` `gv_cleanup_edge`/`gv_cleanup_node`;
`neatoinit.c:401-404`) and rebuilds them in `common_init_node`/`common_init_edge` on the
next layout. The port's `freeLayout` (`src/gvc/context.ts:343`) calls the engine's
`cleanup`, but none frees `info.label`/`xlabel`, so a second layout keeps the old sizes
(a changed measurer is ignored, HTML warnings print once) because
`poly-init.ts:90` `buildNodeLabel` returns early on an existing label.

**Task:** (1) For each engine `cleanup` (`src/layout/{dot,neato,fdp,sfdp,circo,osage,
patchwork}/index.ts`; twopi/circo share neato's per C — confirm), clear node, edge
(label, xlabel, head/tail labels) and graph/cluster labels exactly where its C does; stop
1 if the port's cleanup for an engine lives elsewhere. (2) `buildNodeLabel`'s early return
stays (stop 11). (3) Tests: layout → freeLayout → layout with a different measurer changes
node sizes; the missing-image warning prints on each render; a single layout is unchanged.

**Write-set:** the `cleanup` functions in `src/layout/*/index.ts` (+ tests).
**Read-set:** `lib/dotgen/dotinit.c:95-180`, `lib/common/utils.c:1505-1535`,
`lib/neatogen/neatoinit.c:385-410`; `src/gvc/context.ts:318-345`; T2's spline-site edits
in `neato/index.ts` (rebase on them).

**Acceptance criteria:**
- *Given* layout → freeLayout → layout with a measurer returning doubled widths, *then* node
  widths double on the second render.
- *Given* an HTML label with a missing image rendered twice through the same `Graph`,
  *then* the warning prints twice.
- *Given* the corpus (single render), *then* bytediff identical.

**Observability:** N/A. **Rollback:** reversible.
