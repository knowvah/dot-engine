# T2: resource collector (pure)

## Context
DESIGN D2 step 2: before awaiting, gather every font face and image source the
sync pipeline will ask for. The collector must ask for exactly what the measurer
measures (DESIGN D4): Graphviz `fontname`/`fontsize` with the same defaults and
inheritance the label code uses (`src/common/edge-label-init.ts`,
`src/common/nodeinit.ts:160-175`, `src/layout/dot/graph-label.ts:100-110`), and
HTML label fonts (`src/common/htmltable-parse.ts:514` `parseHtmlLabel`; FONT
FACE/POINT-SIZE, B/I flags as `TextVariantFlags`).

## Task
`collectResources(g: Graph, opts: { inlineImages: boolean }): Resources`:
- `fonts`: distinct `FontRequest { fontname: string | null; fontsize: number;
  flags?: TextVariantFlags }` for root/cluster/node/edge labels, edge
  head/tail labels (`labelfontname`/`labelfontsize` fallbacks), xlabels, and HTML
  label fonts (nested FONT, B, I). Dedupe by the `canvasFont` string.
- `sizeSrcs`: distinct HTML `<IMG SRC>` values.
- `bytesSrcs`: when `inlineImages`, distinct `image=` values and HTML `<IMG SRC>`; else [].
Pure: reads the parsed graph only; no layout, no DOM. A malformed HTML label is
skipped (the sync path falls back to text).

## Write-set
`src/async/collect.ts`, `src/async/collect.test.ts` (new).

## Interface contract (consumed by T5)
`export interface FontRequest`, `export interface Resources { fonts; sizeSrcs; bytesSrcs }`,
`export function collectResources(g, opts): Resources`.

## Acceptance criteria
- Given node `fontname=Helvetica fontsize=12` and an edge with default font, then
  fonts = Helvetica 12 and Times-Roman 14 (Graphviz defaults), deduped.
- Given an HTML label `<FONT FACE="Arial" POINT-SIZE="9"><B>x</B></FONT>`, then a
  request Arial 9 with bold flags is present.
- Given `<IMG SRC="a.png"/>` and `image="b.png"`, then sizeSrcs = [a.png]; bytesSrcs =
  [] without inlineImages and contains both with it.
- Given a malformed HTML label, then no throw.

## Shared rules

Read the repo `CLAUDE.md`, `../decisions.md`, `../conventions.md` and
`../DESIGN.md` first. Scratch files go in the executor scratchpad under
`<task-id>/`. Write-set only; stop and report on anything else (README stop
conditions). Observability: N/A. Rollback: Reversible.
