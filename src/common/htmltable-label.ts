// SPDX-License-Identifier: EPL-2.0

/**
 * make_html_label: parse, size and position an HTML-like label, writing what
 * C writes to stderr along the way through one {@link StderrLines}, so a
 * message without a trailing newline (htmllex.c's doInt) runs into the next
 * write: a later warning, the parse error, or make_label's `in label of ...`.
 *
 * @see lib/common/htmltable.c:make_html_label
 */

import type { TextlabelT } from './types.js';
import type { TextMeasurer } from './textmeasure.js';
import type { ImageResolver } from '../gvc/image-resolver.js';
import type { HtmlLabel, ImageSizer } from './htmltable-types.js';
import { sizeHtmlLabel, parseHtmlLabelRv, inheritTablePenColor } from './htmltable.js';
import { makeLabel } from './make-label.js';
import { HtmlLexError } from './htmltable-lex.js';
import { labelStderr, type StderrLines } from './htmltable-attr-warn.js';
import { posHtmlLabel, type HtmlFontInfo, type PlacedHtml } from './htmltable-pos.js';

/** parseHTML's rv for a label that failed to parse (`ctx->error`). */
const HTML_PARSE_FATAL = 3;

/** A built HTML label plus make_html_label's "problem" return value. */
export interface HtmlLabelResult {
  label: TextlabelT;
  rv: number;
}

/** The label's font, the object's pen color, and the `<IMG>` sizer. */
export type HtmlLabelInfo = HtmlFontInfo & {
  imageSizer?: ImageSizer; imageResolver?: ImageResolver; imageDpi?: number; pencolor?: string;
};

/**
 * make_html_label: parse, size and position an HTML-like label. Returns C's
 * rv too (nonzero: the caller appends `in label of ...`, labels.c:make_label).
 * Everything C prints goes to `stderr`, which the caller owns and flushes once
 * its own continuation is written. The optional `imageSizer` resolves
 * `<IMG SRC>`; absent means C's missing image.
 * @see lib/common/htmltable.c:make_html_label
 */
export function makeHtmlLabelTo(
  content: string,
  finfo: HtmlLabelInfo,
  measurer: TextMeasurer,
  stderr: StderrLines,
): HtmlLabelResult {
  const { fontname, fontsize, fontcolor, imageSizer, imageResolver, imageDpi, pencolor } = finfo;
  let lbl: HtmlLabel, lexWarn: boolean; // lexWarn: htmllex.c's ctx->warn, rv bit 1
  try {
    ({ label: lbl, warn: lexWarn } = parseHtmlLabelRv(content, stderr));
  } catch (e) {
    // C aborts the HTML parse on a syntax error (YYABORT): parseHTML returns
    // rv 3 (ctx->error) with no label, and make_html_label returns it with
    // lp->html cleared and no spans, so the label renders empty.
    // @see lib/common/htmltable.c:1880 (rv == 3), htmlparse.y (YYABORT)
    if (e instanceof HtmlLexError) for (const line of e.diagnostics) stderr.write(`${line}\n`);
    return { label: makeLabel('', fontname, fontsize, fontcolor, measurer), rv: HTML_PARSE_FATAL };
  }
  // A top-level table with no explicit COLOR inherits the object's pen color,
  // which then flows table->cell->nested-table.
  // @see lib/common/htmltable.c:1911 (getPenColor), :1406/:1556 (inheritance)
  if (lbl.kind === 'table') inheritTablePenColor(lbl.table, pencolor);
  const rv = Number(lexWarn) | sizeHtmlLabel(lbl, measurer, {
    fontsize, fontname, imageSizer, imageResolver, imageDpi, stderr,
  });
  const placed = posHtmlLabel(lbl, { fontname, fontsize, fontcolor }, measurer);
  const dim = lbl.dimen ?? { w: 0, h: 0 };
  // C replaces table-label text: "this may be used for the title and
  // alt fields in image maps" — anchors inherit it as default tooltip.
  // @see lib/common/htmltable.c:make_html_label (line 1935)
  const text = lbl.kind === 'table' ? '<TABLE>' : content;
  return { label: htmlTextLabel(text, { fontname, fontsize, fontcolor }, placed, dim), rv };
}

/** {@link makeHtmlLabelTo} on a stderr of its own, flushed before it returns. */
export function makeHtmlLabelRv(content: string, finfo: HtmlLabelInfo, measurer: TextMeasurer): HtmlLabelResult {
  const stderr = labelStderr();
  try {
    return makeHtmlLabelTo(content, finfo, measurer, stderr);
  } finally {
    stderr.flush();
  }
}

/** {@link makeHtmlLabelRv} without the problem flag. */
export function makeHtmlLabel(content: string, finfo: HtmlLabelInfo, measurer: TextMeasurer): TextlabelT {
  return makeHtmlLabelRv(content, finfo, measurer).label;
}

/** Build the TextlabelT wrapper around a positioned HTML label. */
function htmlTextLabel(
  text: string,
  finfo: HtmlFontInfo,
  placed: PlacedHtml,
  dim: { w: number; h: number },
): TextlabelT {
  return {
    text,
    fontname: finfo.fontname, fontcolor: finfo.fontcolor, charset: 0,
    fontsize: finfo.fontsize,
    dimen: { x: dim.w, y: dim.h },
    space: { x: dim.w, y: dim.h },
    pos: { x: 0, y: 0 },
    u: { kind: 'html', html: placed },
    valign: 'c'.charCodeAt(0),
    set: false,
    html: true,
  };
}
