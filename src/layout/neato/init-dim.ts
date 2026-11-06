// SPDX-License-Identifier: EPL-2.0
/**
 * Neato's layout dimension: the `dim`/`dimen` reads, the third and later
 * coordinates of `pos`, the `z` attribute, and the jitter that fills the
 * dimensions a 2-D input leaves open.
 *
 * C keeps the dimension in the global `Ndim` and in `GD_ndim`/`GD_odim` of the
 * root. The port keeps it on the root's `info` only (part-10 AD-2): solvers
 * take it as a parameter.
 *
 * @see lib/neatogen/neatoinit.c:neato_init_graph, user_pos, addZ
 * @see lib/neatogen/stuff.c:jitter_d, jitter3d
 */

import type { Graph } from '../../model/graph.js';
import type { Node } from '../../model/node.js';
import { ownAttrs } from '../../model/lazy-attrs.js';
import { lateInt } from '../../common/nodeinit.js';
import { drand48 } from '../../common/random.js';
import { inputscaleDivisor } from '../../common/utils-inputscale.js';
import { mapbool } from '../dot/rank.js';

/** Default layout dimension. @see lib/neatogen/neatoinit.c:neato_init_graph */
export const DFLT_DIM = 2;
/** Largest layout dimension. @see lib/common/const.h:MAXDIM */
export const MAXDIM = 10;

const POINTS_PER_INCH = 72;
const NUM = '(-?\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)';
/** `%lf,%lf,%lf%c` and `%lf,%lf%c`, the `%c` capturing the next character. */
const POS3 = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}\\s*,\\s*${NUM}(.?)`);
const POS2 = new RegExp(`^\\s*${NUM}\\s*,\\s*${NUM}(.?)`);
const Z_NUM = new RegExp(`^\\s*${NUM}`);

/**
 * Read `dimen`, then `dim`, and clamp at MAXDIM, into the root's `ndim` and
 * `odim`. Runs before any node is initialised and before any solver.
 * @see lib/neatogen/neatoinit.c:neato_init_graph
 */
export function neatoInitGraphDim(g: Graph): number {
  const root = g.root;
  const outdim = lateInt(root.attrs.get('dimen'), DFLT_DIM, 2);
  const ndim = Math.min(lateInt(root.attrs.get('dim'), outdim, 2), MAXDIM);
  root.info.ndim = ndim;
  root.info.odim = Math.min(outdim, ndim);
  return ndim;
}

/** The layout dimension of the root `neatoInitGraphDim` set (C's `Ndim`). */
export function ndimOf(g: Graph): number {
  return g.root.info.ndim ?? DFLT_DIM;
}

/**
 * Fill dimensions `n`.. of a node's position with `nG * drand48()`.
 * @see lib/neatogen/stuff.c:jitter_d
 */
export function jitterD(np: Node, nG: number, n: number, ndim: number): void {
  const pos = np.info.pos;
  if (pos === undefined) return;
  for (let k = n; k < ndim; k++) pos[k] = nG * drand48();
}

/** @see lib/neatogen/stuff.c:jitter3d */
export function jitter3d(np: Node, nG: number, ndim: number): void {
  jitterD(np, nG, 2, ndim);
}

/** Is node attribute `name` declared anywhere in the graph (C's agfindnodeattr)? */
function nodeAttrDeclared(g: Graph, name: string): boolean {
  if (g.nodeDefaults.has(name)) return true;
  for (const n of g.nodes.values()) if (n.attrs.has(name)) return true;
  for (const sub of g.subgraphs.values()) if (nodeAttrDeclared(sub, name)) return true;
  return false;
}

/** C's `N_z`: the `z` symbol exists once any scope declares it. */
export function zDeclared(g: Graph): boolean {
  return nodeAttrDeclared(g.root, 'z');
}

/** `agxget(np, N_z)`: the node's own `z`, else the default it was created under. */
function zValue(np: Node): string {
  return np.attrs.get('z') ?? np.nodeDefaultsSnapshot?.get('z') ?? '';
}

/** `if (PSinputscale > 0) pvec[i] /= PSinputscale` for i below `ndim`. */
function scalePos(pvec: number[], ndim: number, div: number): void {
  for (let i = 0; i < ndim; i++) pvec[i] = pvec[i]! / div;
}

/** The 3-D branch of user_pos. @see lib/neatogen/neatoinit.c:user_pos */
function userPos3(np: Node, m: RegExpExecArray, nG: number, ndim: number): void {
  const pvec = np.info.pos!;
  pvec[0] = Number(m[1]);
  pvec[1] = Number(m[2]);
  pvec[2] = Number(m[3]);
  scalePos(pvec, ndim, inputscaleDivisor(np.root));
  if (ndim > 3) jitterD(np, nG, 3, ndim);
}

/** The 2-D branch of user_pos, with `z` or jitter for the third coordinate. */
function userPos2(np: Node, m: RegExpExecArray, nG: number, ndim: number): void {
  const pvec = np.info.pos!;
  const div = inputscaleDivisor(np.root);
  pvec[0] = Number(m[1]);
  pvec[1] = Number(m[2]);
  scalePos(pvec, ndim, div);
  if (ndim <= 2) return;
  const zm = zDeclared(np.root) ? Z_NUM.exec(zValue(np)) : null;
  if (zm === null) {
    jitter3d(np, nG, ndim);
    return;
  }
  pvec[2] = Number(zm[1]) / div;
  jitterD(np, nG, 3, ndim);
}

/** neato_init_node's calloc(ndim); a caller that skipped it gets the same. */
function ensurePos(n: Node, ndim: number): void {
  if (n.info.pos === undefined || n.info.pos.length < ndim) n.info.pos = new Array<number>(ndim).fill(0);
}

/** `c == '!' || (pinptr && mapbool(agxget(np, pinptr)))`. @see lib/neatogen/neatoinit.c:user_pos */
function pinRequested(n: Node, c: string | undefined): boolean {
  const pin = n.attrs.get('pin');
  return c === '!' || (pin !== undefined && mapbool(pin));
}

/**
 * Seed a node's initial position from its `pos=` attribute (C's P_SET),
 * mirroring user_pos. Sets info.pos + info.posSet so hasPos is true and neato
 * majorization starts from the input layout instead of a random init; a `!`
 * suffix or `pin=true` additionally sets info.pinned (P_PIN → isFixed).
 *
 * With `ndim` of 3 or more a third coordinate comes from `pos` or from `z`;
 * otherwise (and for the dimensions beyond) it is `nG * drand48()`.
 * `pos` is divided by PSinputscale when > 0. Must run AFTER neatoInitNode,
 * which zeroes info.pos.
 * @see lib/neatogen/neatoinit.c:user_pos
 */
export function userPos(n: Node, ndim: number = DFLT_DIM, nG: number = n.root.nodes.size): boolean {
  const p = n.attrs.get('pos');
  if (p === undefined || p.length === 0) return false;
  const m3 = ndim >= 3 ? POS3.exec(p) : null;
  const m = m3 ?? POS2.exec(p);
  if (m === null) return false; // C agerrorf: malformed pos, non-fatal
  n.info.posSet = true;
  ensurePos(n, ndim);
  if (m3 !== null) userPos3(n, m3, nG, ndim);
  else userPos2(n, m, nG, ndim);
  if (pinRequested(n, m[m.length - 1])) n.info.pinned = true;
  return true;
}

/**
 * With ndim of 3 or more and `z` declared, write each node's `z` (points).
 * @see lib/neatogen/neatoinit.c:addZ
 */
export function addZ(g: Graph): void {
  if (ndimOf(g) < 3 || !zDeclared(g)) return;
  for (const n of g.nodes.values()) {
    ownAttrs(n).set('z', (POINTS_PER_INCH * (n.info.pos?.[2] ?? 0)).toFixed(6));
  }
}
