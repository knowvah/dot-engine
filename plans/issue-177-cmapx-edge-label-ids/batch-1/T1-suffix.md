# T1: red tests, suffixed edge-label area ids, gates, squash

## Context

The map renderer prints an edge label's area with the bare edge id; C's
`emit_edge_label` appends `-label`, `-headlabel` or `-taillabel`
([README](../README.md#objective)). T1 carries the suffix on
`EdgeLabelAnchor` (AD-1) without growing `map.ts` (AD-2).

## Steps

1. **Red.** Add `src/render/map-edge-label-id.test.ts` (AD-4), header comment
   naming the C source (`@see lib/common/emit.c:emit_edge_label`,
   `@see plugin/core/gvrender_core_map.c:map_begin_anchor`) and where the
   native files come from (16.1.1, `harness/rowcheck.mjs` with `NATIVE_DIR`,
   2026-11-17):
   - Probes: one case per probe × engine (dot, neato, fdp) × format (`cmapx`,
     `cmapx-np`; native files spell `_np`) for `repro`, `graphs-url`,
     `xlabel`, `tooltip`, `ownid`, `rootid`, `edgeurl`, `decorate`,
     `nolabel`, expecting byte equality with
     `../../plans/issue-177-cmapx-edge-label-ids/harness/native/<probe>.gv.<engine>.<fmt>`.
   - Unit, inline DOT under dot `cmapx`: `a -> b [label="l", URL="u"]` has
     `id="edge1-label"`; `headlabel`+`headURL` has `id="edge1-headlabel"`;
     `taillabel`+`tailURL` has `id="edge1-taillabel"`; `xlabel`+`labelURL` has
     `id="edge1-label"`; with `id="E1"` on the edge, `id="E1-label"`; the
     whole-edge `poly` area keeps `id="edge1"`.
   Update `src/render/map-id-prefix.test.ts` (AD-3): `elabel` moves from
   `PARTIAL_PROBES` to `EQUAL_PROBES`; drop the `elabel` paragraph from its
   header comment and say "Two probes" there.
   Run on the base: every label-area case fails, `nolabel` and the
   whole-edge assertion pass. Journal it.
2. **Green (AD-1, AD-2).** In `src/render/map.ts`: add
   `suffix: 'label' | 'headlabel' | 'taillabel'` to `EdgeLabelAnchor`; set it
   in `emitEdge` (`centerA` is `'label'` for both label and xlabel, as C's
   `EMIT_ELABEL`); in `emitEdgeLabel` pass
   `obj.id === null ? null : `${obj.id}-${la.suffix}`` to `anchorOf`
   (C: `if (id)`, else NULL). Add `@see lib/common/emit.c:emit_edge_label
   (2851-2876)` to the existing comment if it fits. `wc -l src/render/map.ts`:
   at most 805 (stop condition 2). Run the new and the touched test files;
   all pass.
3. **Check every probe.** Build the head bundle (`npm run build:js`, copy
   `dist/index.js`). From the brief directory run
   `node harness/rowcheck.mjs <base.mjs> <head.mjs> harness/probes/*.gv`.
   Pass: the verdict column equals
   [prototype-probes.tsv](../harness/prototype-probes.tsv) row for row
   (`native` 48, `unchanged` 33). Then the #176 probes:
   `FORMATS=cmapx,cmapx_np node harness/rowcheck.mjs <base> <head> ../issue-176-cmapx-id-prefix/harness/probes/*.gv`:
   `elabel` 6 `native`, every other row `unchanged`. Journal both tallies.
4. **Gates 1-6** (README). Record each in the journal.
5. **Diagnosis row.** Journal the artifact. Mechanism: C's `emit_edge_label`
   builds the label anchor id as `<obj->id>-<label|headlabel|taillabel>` and
   `map_begin_anchor` prints it; the port's map renderer passed the bare
   `obj.id`. Origin: C `lib/common/emit.c:2851-2876, 2979-2992`,
   `plugin/core/gvrender_core_map.c:194-201`; port `src/render/map.ts:753` on
   the base. Chain: `emitEdge` calls `emitEdgeLabel` for the four slots;
   `anchorOf(..., obj.id)` becomes the `id=` of the label's `<area>`. Ruled
   out: the svg path (`src/gvc/edge-labels.ts:46-51` already suffixes; svg
   rows unchanged on the prototype); the id base (`edge3` and #176's
   `R_edge1` prefix already equal native on the base); coordinates and hrefs
   (every non-id field of the label lines already equal on `graphs-url`
   under three engines); imap (prints no id, `gvrender_core_map.c:40-60`).
6. **Close-out.** Comment on #251 (do not close it or change labels): with
   #177 on the branch, its part 2 (`elabel`, 6 rows) is byte-equal to native;
   part 1 (`clust`, #242) is unchanged. Then **finish** (README, "Branch and
   commits").

## Write-set

- `src/render/map.ts` (`EdgeLabelAnchor`, `emitEdge`, `emitEdgeLabel`; no net
  growth)
- `src/render/map-edge-label-id.test.ts` (new)
- `src/render/map-id-prefix.test.ts` (AD-3 only)
- `plans/issue-177-cmapx-edge-label-ids/harness/extra/` and `results/` (new
  probes, result tables)
- `plans/decision-journal.md`; this mission's `decision-journal.md`, README and
  `batch-1/overview.md` (status checkboxes and a summary)
- `.agent-notes/issue-177.md` (only if novel)

## Interface contracts

- `EdgeLabelAnchor.suffix: 'label' | 'headlabel' | 'taillabel'`: internal to
  `map.ts`; C's `type` string from `lkind`.
- `emitEdgeLabel(lab, la, obj, job)`: signature unchanged (4 parameters).

## Bytediff

The queue rules, gate 5. Base bundle: `git archive <base>` into `$TMPDIR`
(symlink `node_modules`, `npm run parser:regen`, `npm run build:js`, copy
`dist/index.js` to `base.mjs`), or `$TMPDIR/i177/base.mjs` if it still exists
and the base is still `a7cd496e`. Head bundle from the worktree. Then:

```
npx tsx test/tools/bytediff.ts $TMPDIR/i177/base.mjs $TMPDIR/i177/head.mjs \
  ~/git/knowvah/dot-engine/.claude/queue-smoke-ids.txt $TMPDIR/i177-smoke.json
```

Any changed output must equal native (stop condition 3). Only `cmapx` and
`cmapx_np` jobs of inputs with an edge label carrying `URL`/`href`/
`labelURL`/`headURL`/`tailURL` (or their `href`/`tooltip` forms) can change.

## Targeted survey

**Selection rule.** Only an edge-label `<area>` changes, and only when the
label is placed and has a url or an explicit tooltip. Every corpus input whose
text has `URL`, `href` or `tooltip` (any prefix, so `labelURL`, `headhref`,
`tailtooltip` are included) is in
[../harness/survey-anchor.txt](../harness/survey-anchor.txt) (41 files, the
list #175 and #176 used). Run it under dot in `cmapx` and `cmapx_np`; the
layout engine does not reach the id text (the probes show all three engines
move together).

```
C=~/git/graphviz-16.1.1/tests
ENGINES=dot FORMATS=cmapx,cmapx_np node harness/rowcheck.mjs <base.mjs> <head.mjs> \
  $(sed "s|^|$C/|" harness/survey-anchor.txt)
```

Wait while `uptime` is above 12. A native timeout (120 s) is listed, not
counted.

**Pass:** no `AWAY` row, no row byte-equal on the base that differs on the
head, and the verdicts equal
[prototype-survey.tsv](../harness/prototype-survey.tsv): `native` 2
(`url.gv` cmapx and cmapx_np), `unchanged` 78, `timeout` 2 (`2621.dot`, the
native cap; it has no anchor attribute on an edge label). The run takes over
10 minutes: give it a background limit of an hour. Journal the table.

## Observability / rollback

Observability: N/A (library: no logs, metrics or traces). Rollback: Reversible
(revert the one squashed commit).

## Acceptance criteria

- Given the base source, when the new tests run, then every label-area case
  fails and `nolabel` passes.
- Given the fix, when `graphs-url.gv` renders as `cmapx` under dot, neato and
  fdp, then the output equals native byte for byte (`edge3-headlabel`,
  `edge4-taillabel`, `edge5-label`).
- Given an edge with `id="E1"` and a labelled URL, when it renders as
  `cmapx`, then the label area id is `E1-label` and the edge polygon id `E1`.
- Given the fix, when `rowcheck.mjs` runs over the probes, then its verdicts
  equal the prototype's and no svg row changes.
- Given gates 1-6, when they run on the head, then each passes as the README
  says; the log has exactly one commit after the base, footer `Refs: #177`,
  and tag `issue-177/pre-squash` holds the per-task history.
