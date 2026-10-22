// SPDX-License-Identifier: EPL-2.0
/**
 * The HTML STYLE flags. C's stylefn sets an htmlstyle_t bitfield at lex time;
 * the port keeps the legal tokens as a string (htmltable-attr-warn.ts joins
 * them with ' ') and reads the flags back here, token by token in order, so
 * SOLID still clears only the DOTTED/DASHED before it. HTML STYLE is not the
 * node/edge style: tokens split on space or comma and compare
 * case-insensitively, so `parseStyleFlags` cannot read it.
 *
 * @see lib/common/htmltable.h:htmlstyle_t
 * @see lib/common/htmllex.c:stylefn (DELIM " ,", strview_case_str_eq)
 */

/** @see lib/common/htmltable.h:htmlstyle_t */
export interface HtmlStyle {
  radial: boolean;
  rounded: boolean;
  invisible: boolean;
  dotted: boolean;
  dashed: boolean;
}

/** Read the htmlstyle_t flags from a kept HTML STYLE string. */
export function htmlStyle(style: string | undefined): HtmlStyle {
  const s: HtmlStyle = { radial: false, rounded: false, invisible: false, dotted: false, dashed: false };
  if (style === undefined) return s;
  for (const tk of style.split(/[ ,]+/)) {
    switch (tk.toUpperCase()) {
      case 'ROUNDED': s.rounded = true; break;
      case 'RADIAL': s.radial = true; break;
      case 'SOLID': s.dotted = false; s.dashed = false; break;
      case 'INVISIBLE': case 'INVIS': s.invisible = true; break;
      case 'DOTTED': s.dotted = true; break;
      case 'DASHED': s.dashed = true; break;
    }
  }
  return s;
}
