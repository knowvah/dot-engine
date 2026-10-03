// SPDX-License-Identifier: EPL-2.0

/**
 * adjustNodes overlap-mode dispatch including AM_PRISM — the reference
 * binary is built with GTS+SFDP, so `overlap=false` (or any value that is
 * neither a named mode nor a recognizable boolean) resolves to PRISM, not
 * to a no-op. `overlap=true` (or unset) is AM_NONE.
 *
 * @see lib/neatogen/adjust.c:getAdjustMode / adjustMode table
 * @see lib/neatogen/adjust.c:fdpAdjust / removeOverlapWith / adjustNodes
 */

import type { Graph } from '../../model/graph.js';
import { makeMatrix, getSizes } from '../sfdp/init.js';
import {
  smIsSymmetric, smRemoveDiagonal, smGetRealAdjacencySymmetrized,
  MATRIX_TYPE_REAL,
} from '../sfdp/sparse-matrix.js';
import { removeOverlapPrism } from './overlap-prism.js';
import { scAdjust } from './sc-adjust.js';
import { simpleScale } from './simple-scale.js';
import { normalizeG } from '../fdp/normalize.js';
import { AM_ORTHO, AM_ORTHO_YX, AM_ORTHOXY, AM_ORTHOYX, AM_PORTHO, AM_PORTHO_YX, AM_PORTHOXY, AM_PORTHOYX, cAdjust } from './constraint-adjust.js';
import { countOverlapIn, sAdjustGraph } from './adjust-info.js';
import { vpscAdjust } from './vpsc-adjust.js';
import { sepFactor } from './sep-factor.js';
import { lateDouble } from '../../common/nodeinit.js';
import { RenderError } from '../../errors.js';

/** @see lib/neatogen/adjust.c:DFLT_MARGIN (points) */
const DFLT_MARGIN = 4;
const NDIM = 2;

/** @see lib/common/utils.c:mapBool */
function mapBoolDflt(p: string | undefined, defaultValue: boolean): boolean {
  if (p === undefined || p === '') return defaultValue;
  const s = p.toLowerCase();
  if (s === 'false' || s === 'no') return false;
  if (s === 'true' || s === 'yes') return true;
  if (p[0]! >= '0' && p[0]! <= '9') return parseInt(p, 10) !== 0;
  return defaultValue;
}

/** prism try-count from the attr suffix ("prism2000" → 2000; default 1000).
 * @see lib/neatogen/adjust.c:setPrismValues */
function prismValue(suffix: string): number {
  const v = parseInt(suffix, 10);
  return Number.isInteger(v) && v >= 0 ? v : 1000;
}

/** Named modes handled elsewhere or as no-ops; PRISM/scale handled here. */
const NAMED_MODES = new Set([
  'voronoi', 'scale', 'compress', 'vpsc', 'ipsep', 'oscale', 'scalexy',
  'ortho', 'ortho_yx', 'orthoxy', 'orthoyx',
  'portho', 'portho_yx', 'porthoxy', 'porthoyx',
]);

/**
 * Resolved PRISM try count for `flag`, or null when the mode is not PRISM
 * (AM_NONE, a scale-family mode, or an unported named mode). Note
 * "prism0" IS prism with ntry=0 — remove_overlap still applies the
 * initial scaling before its `if (!ntry) return`.
 * @see adjust.c:getAdjustMode
 */
export function overlapPrismTries(flag: string | undefined): number | null {
  if (flag === undefined || flag === '') return null; // AM_NONE
  const s = flag.toLowerCase();
  if (s.startsWith('prism')) return prismValue(flag.slice('prism'.length));
  if (NAMED_MODES.has(s)) return null; // dispatched elsewhere (or unported)
  // boolean fallback: true → AM_NONE; false or unrecognized → AM_PRISM
  const v = mapBoolDflt(flag, false);
  const unmappable = v !== mapBoolDflt(flag, true);
  if (unmappable || !v) return 1000;
  return null;
}

/**
 * PRISM node-overlap removal over ND_pos (inches).
 * @see lib/neatogen/adjust.c:fdpAdjust
 */
export function fdpAdjust(g: Graph, ntry: number): void {
  const A0 = makeMatrix(g);
  const pos = new Array<number>(NDIM * g.nodes.size).fill(0);
  const sep = sepFactor(g);
  const pad = sep.doAdd
    ? { x: sep.x / 72, y: sep.y / 72 }
    : { x: DFLT_MARGIN / 72, y: DFLT_MARGIN / 72 };
  const sizes = getSizes(g, pad);

  for (const n of g.nodes.values()) {
    const i = n.info.id!;
    pos[i * NDIM] = n.info.pos?.[0] ?? 0;
    pos[i * NDIM + 1] = n.info.pos?.[1] ?? 0;
  }

  const A = !smIsSymmetric(A0, false) || A0.type !== MATRIX_TYPE_REAL
    ? smGetRealAdjacencySymmetrized(A0)
    : smRemoveDiagonal(A0);

  const scaling = lateDouble(
    g.root.attrs.get('overlap_scaling'), -4.0, -1.e10);
  const doShrinking = mapBoolDflt(
    g.attrs.get('overlap_shrink') ?? g.root.attrs.get('overlap_shrink'), true);

  removeOverlapPrism(NDIM, A, pos, sizes, ntry, scaling, doShrinking);

  for (const n of g.nodes.values()) {
    const i = n.info.id!;
    if (!n.info.pos) n.info.pos = [0, 0];
    n.info.pos[0] = pos[i * NDIM]!;
    n.info.pos[1] = pos[i * NDIM + 1]!;
  }
}

/** Adjust modes, in C's enum order (modes above AM_SCALE take the early switch).
 * @see lib/neatogen/adjust.h:AM_NONE */
export const AM_NONE = 0;
export const AM_VOR = 1;
export const AM_SCALE = 2;
export const AM_NSCALE = 3;
export const AM_SCALEXY = 4;
export const AM_COMPRESS = 13;
export const AM_VPSC = 14;
export const AM_IPSEP = 15;
export const AM_PRISM = 16;

/** @see lib/neatogen/adjust.h:adjust_data (mode, print, value) */
export interface AdjustData {
  mode: number;
  print: string;
  value: number;
}

/** `overlap` value (lowercase) to mode and print string.
 * @see lib/neatogen/adjust.c:adjustMode */
const ADJUST_MODES = new Map<string, readonly [number, string]>([
  ['voronoi', [AM_VOR, 'Voronoi']],
  ['scale', [AM_NSCALE, 'scaling']],
  ['compress', [AM_COMPRESS, 'compress']],
  ['vpsc', [AM_VPSC, 'vpsc']],
  ['ipsep', [AM_IPSEP, 'ipsep']],
  ['oscale', [AM_SCALE, 'old scaling']],
  ['scalexy', [AM_SCALEXY, 'x and y scaling']],
  ['ortho', [AM_ORTHO, 'orthogonal constraints']],
  ['ortho_yx', [AM_ORTHO_YX, 'orthogonal constraints']],
  ['orthoxy', [AM_ORTHOXY, 'xy orthogonal constraints']],
  ['orthoyx', [AM_ORTHOYX, 'yx orthogonal constraints']],
  ['portho', [AM_PORTHO, 'pseudo-orthogonal constraints']],
  ['portho_yx', [AM_PORTHO_YX, 'pseudo-orthogonal constraints']],
  ['porthoxy', [AM_PORTHOXY, 'xy pseudo-orthogonal constraints']],
  ['porthoyx', [AM_PORTHOYX, 'yx pseudo-orthogonal constraints']],
]);

/**
 * getAdjustMode's fallback warning: a value that is not a mode name, not
 * prism*, and not a boolean is used as `false` (prism) with this warning.
 * @see lib/neatogen/adjust.c:getAdjustMode (unmappable branch)
 */
export function warnUnrecognizedOverlap(flag: string | undefined): void {
  if (flag === undefined || flag === '') return;
  const s = flag.toLowerCase();
  if (s.startsWith('prism') || NAMED_MODES.has(s)) return;
  if (mapBoolDflt(flag, false) === mapBoolDflt(flag, true)) return;
  console.warn(`Unrecognized overlap value "${flag}" - using false`);
}

/**
 * Resolve an `overlap` value to its adjust mode (the PRISM try count lands in
 * `value`), warning as C does for an unrecognized value.
 * @see lib/neatogen/adjust.c:getAdjustMode
 */
export function getAdjustMode(flag: string | undefined): AdjustData {
  warnUnrecognizedOverlap(flag);
  const ntry = overlapPrismTries(flag);
  if (ntry !== null) return { mode: AM_PRISM, print: 'prism', value: ntry };
  const named = ADJUST_MODES.get((flag ?? '').toLowerCase());
  if (named !== undefined) return { mode: named[0], print: named[1], value: 0 };
  return { mode: AM_NONE, print: 'none', value: 0 };
}

/** Modes handled by cAdjust. @see lib/neatogen/adjust.c:removeOverlapWith */
function isConstraintMode(mode: number): boolean {
  return mode >= AM_ORTHO && mode <= AM_PORTHOYX;
}

/**
 * The `am->mode > AM_SCALE` switch of removeOverlapWith. Under IPSEPCOLA (on in
 * the reference build) ipsep is handled during layout; anything else warns.
 * @see lib/neatogen/adjust.c:removeOverlapWith
 */
function adjustLate(g: Graph, am: AdjustData): number {
  if (isConstraintMode(am.mode)) {
    cAdjust(g, am.mode);
    return 0;
  }
  switch (am.mode) {
    case AM_NSCALE: return scAdjust(g, 1);
    case AM_SCALEXY: return scAdjust(g, 0);
    case AM_COMPRESS: return scAdjust(g, -1);
    case AM_PRISM:
      fdpAdjust(g, am.value);
      return 0;
    case AM_IPSEP: return 0;
    case AM_VPSC: return vpscAdjust(g);
    default:
      console.warn(`Unhandled adjust option ${am.print}`);
      return 0;
  }
}

/**
 * AM_VOR (`overlap=voronoi`) is vAdjust: it returns 0 when countOverlap finds
 * nothing, otherwise runs the Voronoi adjuster, which is not ported (loud).
 * @see lib/neatogen/adjust.c:vAdjust
 */
function adjustVoronoi(g: Graph, am: AdjustData): number {
  if (countOverlapIn(g) === 0) return 0;
  throw new RenderError(
    `overlap=${(g.attrs.get('overlap') ?? g.root.attrs.get('overlap')) ?? am.print}: ` +
      'Voronoi overlap removal is not supported yet',
    'UNSUPPORTED_FEATURE',
  );
}

/**
 * Use `am` to decide if and how to remove node overlaps. normalize and
 * simpleScale run first, whatever the mode (the `normalize` / `scale`
 * attributes); returns non-zero if nodes moved.
 * @see lib/neatogen/adjust.c:removeOverlapWith
 */
export function removeOverlapWith(g: Graph, am: AdjustData): number {
  if (g.nodes.size < 2) return 0;
  const nret = normalizeG(g) + simpleScale(g);
  if (am.mode === AM_NONE) return nret;
  if (am.mode > AM_SCALE) return nret + adjustLate(g, am);
  return nret + (am.mode === AM_SCALE ? sAdjustGraph(g) : adjustVoronoi(g, am));
}

/**
 * Remove node overlap relying on the graph's `overlap` attribute.
 * @see lib/neatogen/adjust.c:adjustNodes / removeOverlapAs
 */
export function adjustNodesFull(g: Graph): number {
  if (g.nodes.size < 2) return 0; // removeOverlapAs returns before getAdjustMode
  return removeOverlapWith(g, graphAdjustMode(g));
}

/**
 * The graph's `overlap` value resolved once (agget falls back to the root).
 * @see lib/neatogen/adjust.c:graphAdjustMode
 */
export function graphAdjustMode(g: Graph): AdjustData {
  return getAdjustMode(g.attrs.get('overlap') ?? g.root.attrs.get('overlap'));
}
