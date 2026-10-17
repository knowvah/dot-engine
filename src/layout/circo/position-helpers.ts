// SPDX-License-Identifier: EPL-2.0

/**
 * Low-level rotation and delta-application helpers for block-tree positioning.
 *
 * Ports applyDelta and getRotation from lib/circogen/circpos.c.
 * All functions are exported so lizard counts each one independently.
 *
 * @see lib/circogen/circpos.c
 */

import type { Node } from '../../model/node.js';
import type { Block } from './blocks.js';
import { isCoalesced } from './blocks.js';
import { fma } from '../../common/fma.js';
import { libmHypot } from '../../common/libm-hypot.js';

/**
 * 2-D rotation of (x,y) by (cosR, sinR). clang contracts both lines into
 * fmadd: X = x*cosR + (-sinR*y), Y = x*sinR + cosR*y (objdump of
 * `_applyDelta`).
 */
export function rotatePoint(
  x: number, y: number, cosR: number, sinR: number,
): [number, number] {
  return [fma(x, cosR, -sinR * y), fma(x, sinR, cosR * y)];
}

/** Read psi from a node's alg field (set during Pass 4). */
export function nodePsi(n: Node): number {
  return (n.info.alg as { psi?: number } | undefined)?.psi ?? 0;
}

/** getRotation: single-node block with preset parent_pos. */
export function rotFromParentPos(sn: Block, theta: number): number {
  let r = theta + (Math.PI - sn.parentPos); // C: theta += M_PI - parent_pos
  if (r < 0) r += 2 * Math.PI;
  return r;
}

/** Find the node in sn closest to origin after translation by (x,y). */
export function closestNode(sn: Block, x: number, y: number, skip: Node): Node {
  let best = skip;
  let bestDist = libmHypot(skip.info.pos![0]! + x, skip.info.pos![1]! + y);
  for (const dn of sn.subGraph.nodes) {
    if (dn.orig === skip) continue;
    const d = libmHypot(dn.orig.info.pos![0]! + x, dn.orig.info.pos![1]! + y);
    if (d < bestDist) { bestDist = d; best = dn.orig; }
  }
  return best;
}

/**
 * getRotation: COALESCED block whose neighbor lies right of -r — off-center
 * trigonometric correction. C: `theta += M_PI / 2.0 - phi - asin(...)`.
 */
export function rotCoalesced(
  sn: Block, x: number, y: number, nbr: Node, theta: number,
): number {
  const rho = sn.rad0;
  const r = sn.radius - rho;
  const nx = nbr.info.pos![0]!;
  const ny = nbr.info.pos![1]!;
  const R = libmHypot(x, y);
  const phi = Math.atan2(ny, nx + r);
  const l = r - rho / Math.cos(phi);
  return theta + ((Math.PI / 2 - phi) - Math.asin((l / R) * Math.cos(phi)));
}

/**
 * getRotation when the neighbor is not the node closest to the parent: the
 * coalesced correction when `COALESCED(sn) && -r < n_x`, else the
 * origin-centred rotation `theta += M_PI - phi - PSI`, wrapped past 2*M_PI.
 * @see lib/circogen/circpos.c:getRotation
 */
export function rotGeneral(
  sn: Block, x: number, y: number, nbr: Node, theta: number,
): number {
  if (closestNode(sn, x, y, nbr) === nbr) return 0;
  const r = sn.radius - sn.rad0;
  if (isCoalesced(sn) && -r < nbr.info.pos![0]!) return rotCoalesced(sn, x, y, nbr, theta);
  const phi = Math.atan2(nbr.info.pos![1]!, nbr.info.pos![0]!);
  let t = theta + ((Math.PI - phi) - nodePsi(nbr));
  if (t > 2 * Math.PI) t -= 2 * Math.PI;
  return t;
}

/**
 * Apply rotation then translation to all nodes in sn and its children.
 * @see lib/circogen/circpos.c:applyDelta
 */
export function applyDelta(sn: Block, x: number, y: number, rotate: number): void {
  const cosR = Math.cos(rotate);
  const sinR = Math.sin(rotate);
  for (const dn of sn.subGraph.nodes) {
    const pos = dn.orig.info.pos!;
    const [X, Y] = rotatePoint(pos[0]!, pos[1]!, cosR, sinR);
    pos[0] = X + x;
    pos[1] = Y + y;
  }
  for (const child of sn.children) applyDelta(child, x, y, rotate);
}

/**
 * Determine rotation angle for block sn given center offset (x, y).
 * @see lib/circogen/circpos.c:getRotation
 */
export function getRotation(sn: Block, x: number, y: number, theta: number): number {
  if (sn.parentPos >= 0) return rotFromParentPos(sn, theta);
  if (sn.circleList.length === 2) return theta - Math.PI / 2;
  // C: neighbor = CHILD(sn) — the node in sn connected to the parent.
  const nbr = sn.child;
  if (!nbr) return 0;
  return rotGeneral(sn, x, y, nbr, theta);
}
