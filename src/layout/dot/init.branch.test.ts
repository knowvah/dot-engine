// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/init.ts.
 *
 * D1 unit mode: every function here is exercised directly against
 * hand-built Graph/Node/Edge fixtures (mirroring rank.branch.test.ts /
 * ns.branch.test.ts conventions). Each describe block targets one ported
 * function and covers both arms of every `if`/`??`/`&&`/ternary.
 *
 * @see lib/dotgen/dotinit.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { GvcContext } from '../../gvc/context.js';
import { EstimateTextMeasurer } from '../../common/textmeasure.js';
import { agsubg } from '../../model/cgraph-ops.js';
import {
  dotGraphInit, dotInitNode, sameNonemptyGroup, dotInitEdge, dotInitSubg,
  dotInitNodeEdge, removeFill, dotCleanup, CL_CROSS,
} from './init.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

function makeGraph(name = 'g'): Graph {
  return new Graph(name, 'directed');
}

function makeNode(g: Graph, id: number, name: string): Node {
  const n = new Node(id, name, g);
  g.nodes.set(name, n);
  return n;
}

function makeSubg(root: Graph, name: string): Graph {
  const sub = new Graph(name, 'directed');
  sub.parent = root;
  sub.root = root;
  return sub;
}

function makeEdge(tail: Node, head: Node): Edge {
  return new Edge(tail, head, '');
}

// ---------------------------------------------------------------------------
// dotGraphInit / initSubgraphRankdir  @see lib/dotgen/dotinit.c:352 initSubg
// ---------------------------------------------------------------------------

describe('dotGraphInit — rankdir propagation to clusters', () => {
  it('propagates rankdir/flip through a real cluster chain (both branches true)', () => {
    const g = makeGraph();
    g.attrs.set('rankdir', 'LR');
    const c1 = makeSubg(g, 'clust1');
    const c2 = makeSubg(c1, 'clust1_1');
    g.info.n_cluster = 1;
    g.info.clust = [c1];
    c1.info.n_cluster = 1;
    c1.info.clust = [c2];
    dotGraphInit(g);
    expect(c1.info.rankdir).toBe(g.info.rankdir);
    expect(c1.info.flip).toBe(g.info.flip);
    expect(c2.info.rankdir).toBe(g.info.rankdir);
    expect(c2.info.flip).toBe(g.info.flip);
  });

  it('no-ops the recursion when n_cluster is 0 (loop body never runs)', () => {
    const g = makeGraph();
    g.info.n_cluster = 0;
    g.info.clust = undefined;
    dotGraphInit(g);
    // No clusters to propagate into; root itself still gets a rankdir.
    expect(typeof g.info.rankdir).toBe('number');
  });

  it('skips propagation when clust is undefined but n_cluster > 0', () => {
    const g = makeGraph();
    g.info.n_cluster = 1;
    g.info.clust = undefined;
    // Must not throw despite a nonzero count with no backing array.
    expect(() => dotGraphInit(g)).not.toThrow();
  });

  it('skips a hole in clust[] (entry missing at c-1) without touching later slots', () => {
    const g = makeGraph();
    const c2 = makeSubg(g, 'clust2');
    g.info.n_cluster = 2;
    // clust[0] (c=1) is a hole; clust[1] (c=2) is real.
    g.info.clust = [undefined as unknown as Graph, c2];
    dotGraphInit(g);
    expect(c2.info.rankdir).toBe(g.info.rankdir);
  });
});

// ---------------------------------------------------------------------------
// dotInitNode  @see lib/dotgen/dotinit.c:dot_init_node
// ---------------------------------------------------------------------------

describe('dotInitNode', () => {
  it('installs empty edge lists and default sizes on a fresh node', () => {
    const g = makeGraph();
    const n = makeNode(g, 0, 'a');
    // makeNodeInfo() defaults lw/rw/ht to 0 (not undefined); force the
    // "reached here UNSIZED" state the `=== undefined` guard targets.
    n.info.lw = undefined as unknown as number;
    n.info.rw = undefined as unknown as number;
    n.info.ht = undefined as unknown as number;
    dotInitNode(n);
    expect(n.info.UF_size).toBe(1);
    expect(n.info.in).toEqual({ list: [], size: 0 });
    expect(n.info.out).toEqual({ list: [], size: 0 });
    expect(n.info.flat_in).toEqual({ list: [], size: 0 });
    expect(n.info.flat_out).toEqual({ list: [], size: 0 });
    expect(n.info.other).toEqual({ list: [], size: 0 });
    expect(n.info.lw).toBe(27);
    expect(n.info.rw).toBe(27);
    expect(n.info.ht).toBe(36);
    expect(n.info.node_type).toBe(0);
  });

  it('preserves pre-existing edge lists and sizes, including a legitimate 0', () => {
    const g = makeGraph();
    const n = makeNode(g, 0, 'a');
    const sentinelIn = { list: [], size: 5 };
    const sentinelOut = { list: [], size: 6 };
    const sentinelFlatIn = { list: [], size: 7 };
    const sentinelFlatOut = { list: [], size: 8 };
    const sentinelOther = { list: [], size: 9 };
    n.info.in = sentinelIn;
    n.info.out = sentinelOut;
    n.info.flat_in = sentinelFlatIn;
    n.info.flat_out = sentinelFlatOut;
    n.info.other = sentinelOther;
    // shape=plain nodes legitimately compute lw=rw=ht=0; must not be clobbered.
    n.info.lw = 0;
    n.info.rw = 0;
    n.info.ht = 0;
    dotInitNode(n);
    expect(n.info.in).toBe(sentinelIn);
    expect(n.info.out).toBe(sentinelOut);
    expect(n.info.flat_in).toBe(sentinelFlatIn);
    expect(n.info.flat_out).toBe(sentinelFlatOut);
    expect(n.info.other).toBe(sentinelOther);
    expect(n.info.lw).toBe(0);
    expect(n.info.rw).toBe(0);
    expect(n.info.ht).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sameNonemptyGroup  @see lib/dotgen/dotinit.c:dot_init_edge (tailgroup check)
// ---------------------------------------------------------------------------

describe('sameNonemptyGroup', () => {
  it('is false when both groups are empty (short-circuits before ===)', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    expect(sameNonemptyGroup(e)).toBe(false);
  });

  it('is false when tailgroup is non-empty but differs from headgroup', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    a.attrs.set('group', 'x');
    b.attrs.set('group', 'y');
    const e = makeEdge(a, b);
    expect(sameNonemptyGroup(e)).toBe(false);
  });

  it('is true when both endpoints share the same non-empty group', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    a.attrs.set('group', 'x');
    b.attrs.set('group', 'x');
    const e = makeEdge(a, b);
    expect(sameNonemptyGroup(e)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// dotInitEdge  @see lib/dotgen/dotinit.c:dot_init_edge
// ---------------------------------------------------------------------------

describe('dotInitEdge', () => {
  it('applies default weight/count/xpenalty/minlen with no attrs set', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    dotInitEdge(e);
    expect(e.info.weight).toBe(1);
    expect(e.info.count).toBe(1);
    expect(e.info.xpenalty).toBe(1);
    expect(e.info.minlen).toBe(1);
    expect(e.info.samehead).toBeUndefined();
    expect(e.info.sametail).toBeUndefined();
  });

  it('honors an explicit weight attr over the default', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('weight', '7');
    dotInitEdge(e);
    expect(e.info.weight).toBe(7);
  });

  it('preserves a pre-stamped synthetic weight when no weight attr is present', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.info.weight = 10000; // flat-label machinery stamp
    dotInitEdge(e);
    expect(e.info.weight).toBe(10000);
  });

  it('applies the same-group penalty: xpenalty=CL_CROSS, weight*100', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    a.attrs.set('group', 'grp');
    b.attrs.set('group', 'grp');
    const e = makeEdge(a, b);
    e.attrs.set('weight', '2');
    dotInitEdge(e);
    expect(e.info.xpenalty).toBe(CL_CROSS);
    expect(e.info.weight).toBe(200);
  });

  it('does not apply the group penalty when groups differ (guard true/return)', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    dotInitEdge(e);
    expect(e.info.xpenalty).toBe(1);
  });

  it('zeroes xpenalty/weight for a nonconstraint edge (constraint=false attr)', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('constraint', 'false');
    dotInitEdge(e);
    expect(e.info.constraint).toBe(false);
    expect(e.info.xpenalty).toBe(0);
    expect(e.info.weight).toBe(0);
  });

  it('leaves an absent/empty constraint attr unchanged (e.info.constraint stays undefined)', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('constraint', '');
    dotInitEdge(e);
    expect(e.info.constraint).toBeUndefined();
    expect(e.info.xpenalty).toBe(1);
  });

  it('honors an explicit minlen attr', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('minlen', '3');
    dotInitEdge(e);
    expect(e.info.minlen).toBe(3);
  });

  it('sets samehead/sametail when present and non-empty', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('samehead', 'h1');
    e.attrs.set('sametail', 't1');
    dotInitEdge(e);
    expect(e.info.samehead).toBe('h1');
    expect(e.info.sametail).toBe('t1');
  });

  it('treats an empty samehead/sametail attr as "no group" (undefined)', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('samehead', '');
    e.attrs.set('sametail', '');
    dotInitEdge(e);
    expect(e.info.samehead).toBeUndefined();
    expect(e.info.sametail).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// dotInitSubg  @see lib/dotgen/dotinit.c:dot_init_subg
// ---------------------------------------------------------------------------

describe('dotInitSubg', () => {
  it('sets nodesep/ranksep defaults when unset', () => {
    const g = makeGraph();
    dotInitSubg(g);
    expect(g.info.nodesep).toBe(18);
    expect(g.info.ranksep).toBe(36);
  });

  it('preserves pre-set nodesep/ranksep', () => {
    const g = makeGraph();
    g.info.nodesep = 5;
    g.info.ranksep = 10;
    dotInitSubg(g);
    expect(g.info.nodesep).toBe(5);
    expect(g.info.ranksep).toBe(10);
  });

  it('recurses into real clusters, applying defaults to each', () => {
    const g = makeGraph();
    const c1 = makeSubg(g, 'clust1');
    g.info.n_cluster = 1;
    g.info.clust = [c1];
    dotInitSubg(g);
    expect(c1.info.nodesep).toBe(18);
    expect(c1.info.ranksep).toBe(36);
  });

  it('skips a hole in clust[] without throwing', () => {
    const g = makeGraph();
    g.info.n_cluster = 1;
    g.info.clust = [undefined as unknown as Graph];
    expect(() => dotInitSubg(g)).not.toThrow();
  });

  it('is a no-op recursion when clust is undefined and n_cluster>0', () => {
    const g = makeGraph();
    g.info.n_cluster = 2;
    g.info.clust = undefined;
    expect(() => dotInitSubg(g)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// dotInitNodeEdge  @see lib/dotgen/dotinit.c:dot_init_node_edge
// ---------------------------------------------------------------------------

describe('dotInitNodeEdge', () => {
  it('initializes nodes and edges without a text measurer (initEdgeLabels skipped)', () => {
    const g = makeGraph();
    g.root = g;
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('label', 'edge label');
    g.edges.push(e);
    dotInitNodeEdge(g);
    expect(a.info.node_type).toBe(0);
    expect(e.info.count).toBe(1);
    // No measurer: initEdgeLabels never ran, so no label geometry was set.
    expect(e.info.label).toBeUndefined();
  });

  it('initializes edge labels through initEdgeLabels when a measurer is present', () => {
    const g = makeGraph();
    g.root = g;
    g.info.gvc = new GvcContext(new EstimateTextMeasurer());
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    const e = makeEdge(a, b);
    e.attrs.set('label', 'edge label');
    g.edges.push(e);
    dotInitNodeEdge(g);
    expect(e.info.label).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// removeFill  @see lib/dotgen/dotinit.c:removeFill
// ---------------------------------------------------------------------------

describe('removeFill', () => {
  it('is a no-op when no _new_rank subgraph exists', () => {
    const g = makeGraph();
    g.root = g;
    const a = makeNode(g, 0, 'a');
    removeFill(g);
    expect(g.nodes.get('a')).toBe(a);
  });

  it('deletes fill nodes and the _new_rank subgraph when present', () => {
    const g = makeGraph();
    g.root = g;
    const real = makeNode(g, 0, 'real');
    const fillSg = agsubg(g, '_new_rank', true);
    expect(fillSg).not.toBeNull();
    const fill = new Node(1, '_fill1', g);
    g.nodes.set(fill.name, fill);
    fillSg!.nodes.set(fill.name, fill);
    removeFill(g);
    expect(g.nodes.get('real')).toBe(real);
    expect(g.nodes.get('_fill1')).toBeUndefined();
    expect(g.subgraphs.get('_new_rank')).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// dotCleanup  @see lib/dotgen/dotinit.c:dot_cleanup
// ---------------------------------------------------------------------------

describe('dotCleanup', () => {
  it('clears edge lists and linked-list pointers, then blanks GD_nlist', () => {
    const g = makeGraph();
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    a.info.next = b;
    b.info.prev = a;
    a.info.in = { list: [], size: 0 };
    b.info.out = { list: [], size: 0 };
    g.info.nlist = a;
    dotCleanup(g);
    expect(a.info.in).toBeUndefined();
    expect(a.info.next).toBeUndefined();
    expect(b.info.prev).toBeUndefined();
    expect(b.info.out).toBeUndefined();
    expect(g.info.nlist).toBeUndefined();
  });

  it('is a no-op on an empty nlist (while condition false immediately)', () => {
    const g = makeGraph();
    g.info.nlist = undefined;
    dotCleanup(g);
    expect(g.info.nlist).toBeUndefined();
  });
});
