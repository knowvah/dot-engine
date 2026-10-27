// SPDX-License-Identifier: EPL-2.0

/**
 * The warning half of `gvrender_set_style`, plus the style-list filters its
 * callers apply first. The pen/width/fill mapping of the same C function is
 * not duplicated here: the port resolves it through style-resolve.ts
 * (parseStyleFlags, resolvePenType, resolvePenWidth), which already mirrors
 * the token cases below. Every caller in the port runs inside a render with a
 * render engine (`if (gvre)` in C), so no engine test is needed here.
 *
 * @see lib/gvc/gvrender.c:480 gvrender_set_style
 */

import { agwarningf } from '../common/agerr.js';
import { parseSegsSilent } from '../common/multicolor.js';
import { styleName } from '../common/style-resolve.js';
import type { PolygonT } from '../common/types.js';
import type { Edge } from '../model/edge.js';

/** Tokens gvrender_set_style maps to pen, pen width or fill state. */
const SUPPORTED_STYLES: ReadonlySet<string> = new Set([
  'solid', 'dashed', 'dotted', 'invis', 'invisible', 'bold', 'setlinewidth',
  'filled', 'unfilled', 'tapered',
]);

/** `fmod(orientation, 90)` bound of shapes.c:isBox. @see lib/common/shapes.c:isBox */
const BOX_ORIENTATION_TOLERANCE = 0.5;
const BOX_ORIENTATION_STEP = 90;
const BOX_SIDES = 4;
/** polygon_t.sides bound of shapes.c:isEllipse. @see lib/common/shapes.c:isEllipse */
const ELLIPSE_MAX_SIDES = 2;

/**
 * Warn for every token the render engine cannot map, on every call.
 * @see lib/gvc/gvrender.c:480 gvrender_set_style
 */
export function gvrenderSetStyle(styles: readonly string[] | null): void {
  if (styles === null) return;
  for (const token of styles) {
    const name = styleName(token);
    if (!SUPPORTED_STYLES.has(name)) {
      agwarningf(`gvrender_set_style: unsupported style ${name} - ignoring`);
    }
  }
}

/** @see lib/common/shapes.c:isBox */
function isBox(p: PolygonT | null): boolean {
  if (p === null) return false;
  return p.sides === BOX_SIDES
    && Math.abs(p.orientation % BOX_ORIENTATION_STEP) < BOX_ORIENTATION_TOLERANCE
    && p.distortion === 0 && p.skew === 0;
}

/** @see lib/common/shapes.c:isEllipse */
function isEllipse(p: PolygonT | null): boolean {
  return p !== null && p.sides <= ELLIPSE_MAX_SIDES;
}

/**
 * The node style list passed to the renderer: checkStyle removes the tokens
 * it turns into polygon flags. `shape` is `ND_shape(n)->polygon` (null for
 * records).
 * @see lib/common/shapes.c:465 checkStyle
 */
export function checkStyleTokens(styles: readonly string[], shape: PolygonT | null): string[] {
  return styles.filter((p) => {
    if (p === 'rounded' || p === 'diagonals' || p === 'radial') return false;
    if (p === 'striped') return !isBox(shape);
    if (p === 'wedged') return !isEllipse(shape);
    return true;
  });
}

/**
 * The cluster style list passed to the renderer.
 * @see lib/common/emit.c:367 checkClusterStyle
 */
export function checkClusterStyleTokens(styles: readonly string[]): string[] {
  return styles.filter((p) => p !== 'radial' && p !== 'striped' && p !== 'rounded');
}

/** Count of `ch` in `s`. */
function countChar(s: string, ch: string): number {
  return [...s].filter((c) => c === ch).length;
}

/** True when emit_edge_graphics' multicolor() accepts the colour list. */
function multicolorTaken(color: string): boolean {
  if (countChar(color, ';') === 0 || countChar(color, ':') === 0) return false;
  const { error } = parseSegsSilent(color);
  return error !== 1 && error !== 2;
}

/**
 * How many extra `gvrender_set_style(job, styles)` calls emit_edge_graphics
 * makes: one per bezier carrying an arrow, when the spline has several
 * beziers, in the `;` multicolor branch (when its colour list parses) and in
 * the plain branch. The tapered and parallel `:` branches make none.
 * @see lib/common/emit.c:2047 multicolor · :2677 emit_edge_graphics
 */
export function edgeStyleResets(e: Edge, styles: readonly string[]): number {
  const spl = e.info.spl;
  if (spl === undefined || spl.size <= 1 || styles.length === 0) return 0;
  const color = e.attrs.get('color') ?? '';
  const otherBranch = styles.includes('tapered') || countChar(color, ':') > 0;
  if (otherBranch && !multicolorTaken(color)) return 0;
  return spl.list.filter((bz) => bz.sflag !== 0 || bz.eflag !== 0).length;
}
