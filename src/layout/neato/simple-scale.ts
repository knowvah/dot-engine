// SPDX-License-Identifier: EPL-2.0

/**
 * The `scale` graph attribute: multiply every node position by (sx, sy)
 * before overlap removal. removeOverlapWith runs it right after normalize,
 * whatever the overlap mode.
 *
 * @see lib/neatogen/adjust.c:simpleScale
 */

import type { Graph } from '../../model/graph.js';
import { aggetGraph } from '../fdp/fdp-model.js';

/** @see lib/neatogen/adjust.c:ISZERO */
const ISZERO = (d: number): boolean => Math.abs(d) < 0.000000001;

/** One C `%lf` conversion: optional leading whitespace, then a strtod number. */
const LF = /^\s*([+-]?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?)/;

/**
 * C `sscanf(p, "%lf,%lf", &x, &y)`: the values converted, in order (0, 1 or
 * 2 of them). An empty string returns none — C's EOF (-1) there reads an
 * uninitialised pointf, undefined behaviour the port defines as a no-op.
 */
function scanPair(p: string): number[] {
  const m1 = LF.exec(p);
  if (m1 === null) return [];
  const rest = p.slice(m1[0].length);
  if (!rest.startsWith(',')) return [parseFloat(m1[1]!)];
  const m2 = LF.exec(rest.slice(1));
  return m2 === null ? [parseFloat(m1[1]!)] : [parseFloat(m1[1]!), parseFloat(m2[1]!)];
}

/**
 * Scale node positions by the `scale` attribute ("s" or "sx,sy"). Returns 1
 * if nodes moved, else 0 (unset, unparsable, a zero factor, or 1,1).
 * @see lib/neatogen/adjust.c:simpleScale
 */
export function simpleScale(g: Graph): number {
  const p = aggetGraph(g, 'scale');
  if (p === undefined) return 0;
  const sc = scanPair(p);
  if (sc.length === 0) return 0;
  const x = sc[0]!;
  if (ISZERO(x)) return 0;
  const y = sc.length === 1 ? x : sc[1]!;
  if (ISZERO(y)) return 0;
  if (y === 1 && x === 1) return 0;
  for (const n of g.nodes.values()) {
    n.info.pos![0] *= x;
    n.info.pos![1] *= y;
  }
  return 1;
}
