// SPDX-License-Identifier: EPL-2.0

/**
 * Label construction for plain-text and HTML node labels.
 * Unified entry point mirrors C labels.c:make_label which branches
 * internally on is_html.
 *
 * @see lib/common/labels.c:make_label
 * @see lib/common/htmltable.c:make_html_label
 */

import type { TextlabelT } from './types.js';
import type { TextMeasurer, TextSize } from './textmeasure.js';
import type { TextSpan } from './emit-types.js';
import { makeHtmlLabelTo } from './htmltable-label.js';
import { labelStderr } from './htmltable-attr-warn.js';
import { substObj, type GraphObj } from './subst.js';
import { Edge } from '../model/edge.js';
import { Node } from '../model/node.js';
import { nodeAttr, graphAttrInherited } from './attr-get.js';
import { Graph } from '../model/graph.js';
import { htmlEntityUTF8 } from './html-entities.js';
import { usershapeDpi } from '../gvc/usershape.js';

export const DEFAULT_FONTSIZE = 14.0;
/** C's default fontname (non-Windows); renderers alias it, e.g. SVG
 * font-family="Times,serif". @see lib/common/const.h:67 */
export const DEFAULT_FONTNAME = 'Times-Roman';
export const DEFAULT_COLOR = 'black';

// htmlEntityUTF8 moved to html-entities.ts (a leaf module) so the HTML lexer
// can decode entities in text runs without an import cycle. Re-exported here
// for existing callers. @see lib/common/utils.c:htmlEntityUTF8 / htmlEntity
export { htmlEntityUTF8 };

/**
 * The object's pen color: `pencolor` attr, else `color` attr, else undefined
 * (no default). An HTML table/cell border with no explicit COLOR inherits it.
 * Read as C's agget does, so declared defaults count: a node's `node [...]`
 * snapshot and a subgraph's inherited graph attributes (894589). Edge
 * defaults are already materialized into `attrs` by the builder.
 * @see lib/common/htmltable.c:getPenColor
 */
function getPenColor(obj?: GraphObj): string | undefined {
  if (obj === undefined) return undefined;
  const pc = aggetObj(obj, 'pencolor');
  if (pc !== undefined && pc !== '') return pc;
  const c = aggetObj(obj, 'color');
  if (c !== undefined && c !== '') return c;
  return undefined;
}

/** `agget(obj, key)` for any object kind. @see lib/cgraph/attr.c:agxget */
function aggetObj(obj: GraphObj, key: string): string | undefined {
  if (obj instanceof Node) return nodeAttr(obj, obj.root, key);
  if (obj instanceof Graph) return graphAttrInherited(obj, key);
  return obj.attrs.get(key);
}

/** The root graph owning `obj` (edges resolve through their tail node). */
function rootOf(obj: GraphObj): Graph {
  return obj instanceof Edge ? obj.tail.root : obj.root;
}

/**
 * The `agerr(AGPREV, ...)` continuation make_label prints when
 * make_html_label reports a problem (no `Error:`/`Warning:` prefix).
 * @see lib/common/labels.c:make_label (148-163)
 */
function inLabelOf(obj: GraphObj): string {
  if (obj instanceof Edge) {
    const sep = obj.head.root.kind.endsWith('undirected') ? '--' : '->';
    return `in label of edge ${obj.tail.name} ${sep} ${obj.head.name}`;
  }
  if (obj instanceof Graph) return `in label of graph ${obj.name}`;
  return `in label of node ${obj.name}`;
}

/** Font attributes bundle — mirrors C fontinfo_t fields used in label init. */
export interface FontInfo {
  fontname: string;
  fontsize: number;
  fontcolor: string;
}

function buildSpan(
  text: string,
  font: FontInfo,
  measured: TextSize,
): TextSpan {
  return {
    str: text,
    fontName: font.fontname,
    fontSize: font.fontsize,
    fontColor: font.fontcolor,
    fontFlags: 0,
    yoffset_layout: 0,
    yoffset_centerline: measured.yoffsetCenterline ?? 0.05 * font.fontsize,
    size: { x: measured.w, y: measured.h },
    just: 'n',
  };
}

/** One line split out of a label, with its justification terminator. */
interface LabelLine { text: string; just: 'n' | 'l' | 'r'; }

const isJust = (c: string | undefined): c is 'n' | 'l' | 'r' =>
  c === 'n' || c === 'l' || c === 'r';

/**
 * Split label text into lines at \n / \l / \r escapes and literal
 * newlines; the terminator becomes the line's justification. Any other
 * escape drops its backslash and keeps the following character
 * (including \\ → \) — the lexer delivers escapes verbatim and this
 * is where C interprets them.
 * @see lib/common/labels.c:make_simple_label
 */
export function splitLabelLines(text: string): LabelLine[] {
  const lines: LabelLine[] = [];
  let cur = '';
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (c === '\\' && i + 1 < text.length) {
      const e = text[++i]!;
      if (isJust(e)) {
        lines.push({ text: cur, just: e });
        cur = '';
      } else {
        cur += e; // C default: agxbputc(&line, *p) — backslash dropped
      }
    } else if (c === '\n') {
      lines.push({ text: cur, just: 'n' });
      cur = '';
    } else {
      cur += c;
    }
  }
  if (cur.length > 0) lines.push({ text: cur, just: 'n' });
  return lines;
}

/** C LINESPACING — empty lines take (int)(fontsize * 1.2). @see const.h:LINESPACING */
const LINESPACING = 1.2;

/** Build one measured span for a label line. @see labels.c:storeline */
function buildLineSpan(line: LabelLine, font: FontInfo, measurer: TextMeasurer): TextSpan {
  const measured = line.text.length > 0
    ? measurer.measure(line.text, font.fontname, font.fontsize)
    : { w: 0, h: Math.trunc(font.fontsize * LINESPACING) };
  const span = buildSpan(line.text, font, measured);
  span.just = line.just;
  return span;
}

/** @see lib/common/labels.c:make_simple_label / storeline */
function makePlainLabel(
  text: string,
  font: FontInfo,
  measurer: TextMeasurer,
): TextlabelT {
  const spans = splitLabelLines(text).map((ln) => buildLineSpan(ln, font, measurer));
  // dimen.x = max line width; dimen.y accumulates heights; space = dimen.
  const w = spans.reduce((a, sp) => Math.max(a, sp.size.x), 0);
  const h = spans.reduce((a, sp) => a + sp.size.y, 0);
  return {
    text, ...font, charset: 0,
    dimen: { x: w, y: h },
    space: { x: w, y: h },
    pos: { x: 0, y: 0 },
    u: { kind: 'txt', span: spans, nspans: spans.length },
    valign: 'c'.charCodeAt(0),
    set: false, html: false,
  };
}

/**
 * Create a TextlabelT for a plain-text label string.
 * @see lib/common/labels.c:make_label
 */
export function makeLabel(
  text: string,
  fontname: string,
  fontsize: number,
  fontcolor: string,
  measurer: TextMeasurer,
): TextlabelT {
  return makePlainLabel(text, { fontname, fontsize, fontcolor }, measurer);
}

/**
 * Unified label entry mirroring C labels.c:make_label(obj, str, kind).
 *
 * C branches on `kind & LT_HTML` (labels.c:145,147). isHtml is the port
 * equivalent (aghtmlstr / HTML_STRING_MARK).
 *
 * Empty-string case (labels.c:119): "disregard HTML intent for empty
 * string labels" — C: is_html &= !streq(str, "");
 *
 * Parse-failure fallback (htmltable.c:1884-1907): "Parse of label failed;
 * revert to simple text label" — C sets lp->html=false and substitutes the
 * object name. The port has no object context so it keeps the markup text,
 * matching makeHtmlLabel's existing fallback contract.
 *
 * @see lib/common/labels.c:make_label
 * @see lib/common/htmltable.c:make_html_label
 */
export function makeAnyLabel(
  content: string,
  isHtml: boolean,
  font: FontInfo,
  measurer: TextMeasurer,
  obj?: GraphObj,
): TextlabelT {
  // labels.c:119 — is_html &= !streq(str, "");
  if (isHtml && content !== '') {
    // labels.c:145-161; htmltable.c:1856 — on parse failure falls back to
    // plain text (html=false) per htmltable.c:1892. Thread the owning object's
    // pen color so an HTML table/cell border with no explicit COLOR inherits
    // it (htmltable.c:1911 getPenColor). @see getPenColor
    // ADR-2: a per-context sizer (when set) wins over the global one.
    const root = obj !== undefined ? rootOf(obj) : undefined;
    const imageSizer = root?.info.gvc?.imageSizer;
    const imageResolver = root?.info.gvc?.imageResolver;
    const imageDpi = root !== undefined ? usershapeDpi(root.attrs) : undefined;
    // One stderr for the label: doInt's unterminated warning runs into the
    // next write, `in label of ...` included (agerr AGPREV).
    const stderr = labelStderr();
    const { label, rv } = makeHtmlLabelTo(content, { ...font, pencolor: getPenColor(obj), imageSizer, imageResolver, imageDpi }, measurer, stderr);
    if (rv !== 0 && obj !== undefined) stderr.write(`${inLabelOf(obj)}\n`);
    stderr.flush();
    return label;
  }
  // Plain path: resolve \G \N \E \T \H \L against the owning object
  // BEFORE measuring, as C does (labels.c:169, escBackslash=0; the
  // formatting escapes \n \l \r are handled separately), then decode HTML
  // entities (labels.c:174 htmlEntityUTF8, UTF-8 default branch).
  const subst = obj !== undefined ? substObj(content, obj, false) : content;
  const text = htmlEntityUTF8(subst);
  return makePlainLabel(text, font, measurer);
}
