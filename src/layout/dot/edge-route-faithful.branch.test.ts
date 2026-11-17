// SPDX-License-Identifier: EPL-2.0

/**
 * `cl_bound` on a virtual node with no out edge (graphviz 16.1.1, upstream
 * f8e3f2100). 16.1.0 read `ED_to_orig(ND_out(n).list[0])` for every non-NORMAL
 * node; 16.1.1 takes the node's own cluster when `ND_out(n).size == 0`, as it
 * does for a NORMAL node. A neighbour in that same cluster then does not
 * interfere, so `maximal_bbox` does not clamp the box to the cluster.
 *
 * Hand-built: in the corpus only 2765 and 2765_1 reach the branch, on a node
 * whose neighbours are in no real cluster.
 *
 * @see lib/dotgen/dotsplines.c:cl_bound, maximal_bbox
 */

import { describe, it, expect } from 'vitest';
import type { Node } from '../../model/node.js';
import type { Edge } from '../../model/edge.js';
import type { Graph } from '../../model/graph.js';
import { NORMAL, VIRTUAL } from './fastgr.js';
import { maximalBbox, type BboxCtx } from './edge-route-faithful.js';

const NODESEP = 18;
const SPLINESEP = 4;
/** maximal_bbox's FUDGE. @see lib/dotgen/dotsplines.c:maximal_bbox */
const FUDGE = 4;
const CLUSTER_BB = { ll: { x: 50, y: -30 }, ur: { x: 350, y: 30 } };

interface NodeSpec { order: number; x: number; type: number; clust: Graph | undefined; mval?: number }

function nodeOf(s: NodeSpec): Node {
  return {
    info: {
      coord: { x: s.x, y: 0 }, lw: 10, rw: 10, ht: 20, mval: s.mval ?? 0,
      rank: 0, order: s.order, node_type: s.type, label: undefined, clust: s.clust,
      out: { list: [], size: 0 }, in: { list: [], size: 0 },
    },
  } as unknown as Node;
}

/** One rank `left, vn, right`: both neighbours NORMAL, in the cluster `cl`. */
function fixture(vnClust: (cl: Graph) => Graph | undefined) {
  const cl = { info: { bb: CLUSTER_BB } } as unknown as Graph;
  const left = nodeOf({ order: 0, x: 100, type: NORMAL, clust: cl, mval: 20 });
  const vn = nodeOf({ order: 1, x: 200, type: VIRTUAL, clust: vnClust(cl) });
  const right = nodeOf({ order: 2, x: 300, type: NORMAL, clust: cl });
  const rank = { n: 3, v: [left, vn, right], ht1: 10, ht2: 10 };
  const g = { info: { rank: [rank], nodesep: NODESEP } } as unknown as Graph;
  const ctx: BboxCtx = { g, sp: { leftBound: 0, rightBound: 400, splinesep: SPLINESEP } };
  return { ctx, cl, left, vn, right };
}

/** The walls maximal_bbox gives when no cluster interferes. */
function unclamped(f: ReturnType<typeof fixture>): { llx: number; urx: number } {
  const { left, vn, right } = f;
  return {
    llx: Math.min(left.info.coord.x + left.info.mval! + NODESEP / 2, vn.info.coord.x - vn.info.lw - FUDGE),
    urx: Math.max(right.info.coord.x - right.info.lw - NODESEP / 2, vn.info.coord.x + vn.info.rw + FUDGE),
  };
}

/** The walls maximal_bbox gives when the neighbours' cluster interferes. */
function clamped(f: ReturnType<typeof fixture>): { llx: number; urx: number } {
  const { vn } = f;
  return {
    llx: Math.min(CLUSTER_BB.ur.x + SPLINESEP, vn.info.coord.x - vn.info.lw - FUDGE),
    urx: Math.max(CLUSTER_BB.ll.x - SPLINESEP, vn.info.coord.x + vn.info.rw + FUDGE),
  };
}

describe('cl_bound on a virtual node with no out edge (16.1.1)', () => {
  it('takes the node\'s own cluster, so a neighbour in it does not clamp the box', () => {
    const f = fixture(cl => cl);
    const want = unclamped(f);
    expect(want).toEqual({ llx: 129, urx: 281 });
    expect(clamped(f)).toEqual({ llx: 186, urx: 214 }); // what 16.1.0's read gave the port
    const b = maximalBbox(f.ctx, f.vn, undefined, undefined);
    expect(b.ll.x).toBe(want.llx);
    expect(b.ur.x).toBe(want.urx);
  });

  it('still clamps when that node is in another cluster than its neighbours', () => {
    const f = fixture(() => undefined);
    const b = maximalBbox(f.ctx, f.vn, undefined, undefined);
    expect({ llx: b.ll.x, urx: b.ur.x }).toEqual(clamped(f));
  });

  it('keeps reading the original edge\'s endpoints when the node has an out edge', () => {
    // The chain vnode's own cluster is the neighbours', but its original edge
    // runs between nodes of no cluster: the neighbours' cluster interferes.
    const f = fixture(cl => cl);
    const end = nodeOf({ order: 0, x: 0, type: NORMAL, clust: undefined });
    const orig = { tail: end, head: end, info: {} } as unknown as Edge;
    const out = { tail: f.vn, head: end, info: { to_orig: orig } } as unknown as Edge;
    f.vn.info.out = { list: [out], size: 1 };
    const b = maximalBbox(f.ctx, f.vn, undefined, undefined);
    expect({ llx: b.ll.x, urx: b.ur.x }).toEqual(clamped(f));
  });
});
