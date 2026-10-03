// SPDX-License-Identifier: EPL-2.0

/**
 * Resource collector: the fonts and image sources the synchronous pipeline
 * will ask for, gathered from the parsed graph before any layout runs.
 *
 * Each font request mirrors a measurer call site exactly (same attribute
 * lookup, same defaults and fallbacks), so a prefetch loads the faces the
 * measurer will actually measure.
 *
 * @see src/common/nodeinit.ts:initNodeXLabel / src/common/poly-init.ts:buildNodeLabel
 * @see src/common/edge-label-init.ts (edge, xlabel, head/tail labels)
 * @see src/layout/dot/graph-label.ts:doGraphLabel (root and cluster labels)
 * @see src/common/htmltable.ts / htmltable-pos-runs.ts (HTML item fonts)
 */

import type { Graph } from '../model/graph.js';
import type { Edge } from '../model/edge.js';
import type { Node } from '../model/node.js';
import type { TextVariantFlags } from '../common/textmeasure.js';
import { canvasFont } from '../common/css-font.js';
import { isHtmlValue, htmlValueContent } from '../common/html-string.js';
import { nodeAttr, readFontAttrs } from '../common/poly-init.js';
import { initFontEdgeAttr, initFontLabelEdgeAttr } from '../common/edge-label-init.js';
import { parseHtmlLabel } from '../common/htmltable-parse.js';
import { isACluster } from '../layout/dot/rank.js';
import { readFontParams } from '../layout/dot/graph-label.js';
import type {
  HtmlCellContent, HtmlLabel, HtmlTable, HtmlTextItem,
} from '../common/htmltable-types.js';

/** One font face the measurer will be asked for. */
export interface FontRequest {
  /** Graphviz `fontname` as the measurer receives it. */
  readonly fontname: string | null;
  /** Font size in points. */
  readonly fontsize: number;
  /** Bold/italic variant flags; absent for the regular face. */
  readonly flags?: TextVariantFlags;
}

/** Everything the sync pipeline needs prefetched. */
export interface Resources {
  /** Distinct font requests, deduped by their `canvasFont` string. */
  readonly fonts: FontRequest[];
  /** Distinct HTML `<IMG SRC>` values (dimension lookups). */
  readonly sizeSrcs: string[];
  /** Distinct image sources to fetch as bytes; empty unless `inlineImages`. */
  readonly bytesSrcs: string[];
}

/** Options for {@link collectResources}. */
export interface CollectOptions {
  /** Also collect `image=` and HTML `<IMG SRC>` values as bytes sources. */
  readonly inlineImages: boolean;
}

interface Acc {
  readonly fonts: Map<string, FontRequest>;
  readonly sizeSrcs: Set<string>;
  readonly bytesSrcs: Set<string>;
  readonly inlineImages: boolean;
}

interface LabelFont { readonly fontname: string; readonly fontsize: number }

function addFont(acc: Acc, fontname: string | null, fontsize: number, flags?: TextVariantFlags): void {
  const key = canvasFont(fontname, fontsize, flags);
  if (acc.fonts.has(key)) return;
  const req: FontRequest = flags === undefined
    ? { fontname, fontsize }
    : { fontname, fontsize, flags };
  acc.fonts.set(key, req);
}

function addImage(acc: Acc, src: string | undefined, sized: boolean): void {
  if (src === undefined || src === '') return;
  if (sized) acc.sizeSrcs.add(src);
  if (acc.inlineImages) acc.bytesSrcs.add(src);
}

/** Variant flags as the measurer receives them (undefined when regular). */
function variantFlags(item: HtmlTextItem): TextVariantFlags | undefined {
  if (item.bold !== true && item.italic !== true) return undefined;
  return { bold: item.bold === true, italic: item.italic === true };
}

function addItemFont(acc: Acc, item: HtmlTextItem, font: LabelFont): void {
  if (item.text === undefined && item.br !== true) return;
  addFont(acc, item.fontFace ?? font.fontname, item.fontSize ?? font.fontsize, variantFlags(item));
}

function walkContent(acc: Acc, c: HtmlCellContent, font: LabelFont): void {
  switch (c.kind) {
    case 'text':
      for (const item of c.items) addItemFont(acc, item, font);
      break;
    case 'table':
      walkTable(acc, c, font);
      break;
    case 'image':
      addImage(acc, c.src, true);
      break;
    case 'hr':
      break;
  }
}

function walkTable(acc: Acc, t: HtmlTable, font: LabelFont): void {
  for (const row of t.rows) {
    for (const cell of row.cells) {
      for (const c of cell.content) walkContent(acc, c, font);
    }
  }
}

function walkHtmlLabel(acc: Acc, label: HtmlLabel, font: LabelFont): void {
  if (label.kind === 'table') {
    walkTable(acc, label.table, font);
    return;
  }
  for (const t of label.texts) walkContent(acc, t, font);
}

/** Collect the fonts/images one label string leads the sync pipeline to use. */
function addLabel(acc: Acc, str: string | undefined, font: LabelFont): void {
  if (!str) return;
  if (!isHtmlValue(str)) {
    addFont(acc, font.fontname, font.fontsize);
    return;
  }
  const content = htmlValueContent(str);
  if (content === '') return; // labels.c:119 — empty HTML is no label
  let label: HtmlLabel;
  try {
    label = parseHtmlLabel(content);
  } catch {
    // Parse failure: the sync path reverts to a plain-text label (htmltable.c:1892).
    addFont(acc, font.fontname, font.fontsize);
    return;
  }
  walkHtmlLabel(acc, label, font);
}

function collectNode(acc: Acc, n: Node, root: Graph): void {
  const { fontname, fontsize } = readFontAttrs(n, root);
  const label = nodeAttr(n, root, 'label');
  if (label === undefined) addFont(acc, fontname, fontsize); // label defaults to \N
  else addLabel(acc, label, { fontname, fontsize });
  addLabel(acc, nodeAttr(n, root, 'xlabel'), { fontname, fontsize });
  addImage(acc, nodeAttr(n, root, 'image'), false);
}

function collectEdge(acc: Acc, e: Edge): void {
  const fi = initFontEdgeAttr(e);
  const lfi = initFontLabelEdgeAttr(e, fi);
  addLabel(acc, e.attrs.get('label'), fi);
  addLabel(acc, e.attrs.get('xlabel'), fi);
  addLabel(acc, e.attrs.get('headlabel'), lfi);
  addLabel(acc, e.attrs.get('taillabel'), lfi);
}

function collectGraphLabels(acc: Acc, sg: Graph, root: Graph): void {
  if (isACluster(sg)) {
    addLabel(acc, sg.attrs.get('label') ?? sg.graphDefaultsSnapshot?.get('label'), readFontParams(sg));
  }
  for (const child of sg.subgraphs.values()) collectGraphLabels(acc, child, root);
}

/**
 * Gather every font face and image source the synchronous pipeline will ask
 * for. Pure: reads the parsed graph only; a malformed HTML label is skipped
 * (the sync path falls back to plain text).
 *
 * @param g - A parsed graph (before layout).
 * @param opts - Collection options.
 * @returns The deduped fonts, size sources and bytes sources.
 */
export function collectResources(g: Graph, opts: CollectOptions): Resources {
  const acc: Acc = {
    fonts: new Map(), sizeSrcs: new Set(), bytesSrcs: new Set(), inlineImages: opts.inlineImages,
  };
  const root = g.root;
  collectGraphLabels(acc, root, root);
  for (const n of root.nodes.values()) collectNode(acc, n, root);
  for (const e of root.edges) collectEdge(acc, e);
  return {
    fonts: [...acc.fonts.values()],
    sizeSrcs: [...acc.sizeSrcs],
    bytesSrcs: [...acc.bytesSrcs],
  };
}
