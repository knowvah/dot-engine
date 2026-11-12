// SPDX-License-Identifier: EPL-2.0

/**
 * Tests for `ordering=out`/`in` enforcement in mincross.
 *
 * The bug: C's `new_virtual_edge` copies `AGSEQ(orig)` onto the virtual edge
 * (fastgr.c:new_virtual_edge), so `do_ordering_node`'s qsort-by-AGSEQ orders the
 * constraint edges by DOT-declaration order. The port originally left virtual
 * edges with a fresh `_nextSeq++`, so the sort ordered by virtual-creation order
 * instead — producing the wrong (or a suppressed) FLATORDER constraint.
 *
 * These tests pin the faithful behavior: a virtual edge inherits `orig.seq`, and
 * `doOrderingNode` installs the FLATORDER edge in DOT-declaration order even when
 * the node's out/in list is in the opposite (virtual-creation) order.
 *
 * @see lib/dotgen/mincross.c:do_ordering_node, lib/dotgen/fastgr.c:new_virtual_edge
 */

import { afterEach, describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import { newVirtualEdge, findFlatEdge, FLATORDER } from './fastgr.js';
import { doOrderingNode, doOrderingForNodes } from './mincross-build.js';
import type { MincrossContext } from './mincross-utils.js';

function mkNode(g: Graph, id: number, name: string): Node {
  const n = new Node(id, name, g);
  n.info = makeNodeInfo();
  g.nodes.set(name, n);
  return n;
}

function mkCtx(root: Graph): MincrossContext {
  return {
    root,
    globalMinRank: 0,
    globalMaxRank: 1,
    teList: [],
    tiList: [],
    reMincross: false,
    minQuit: 8,
    maxIter: 24,
  };
}

describe('newVirtualEdge — AGSEQ inheritance (C new_virtual_edge)', () => {
  it('a virtual edge inherits orig.seq, not a fresh sequence number', () => {
    const g = new Graph('g', 'directed');
    const t = mkNode(g, 1, 't');
    const h = mkNode(g, 2, 'h');
    const orig = new Edge(t, h, '');
    const ve = newVirtualEdge(t, h, orig);
    // C: AGSEQ(e) = AGSEQ(orig). The fresh _nextSeq++ assigned at construction
    // is overwritten by copyVirtualEdgeInfo.
    expect(ve.seq).toBe(orig.seq);
  });

  it('a FLATORDER virtual edge (orig=null) keeps its fresh seq (C leaves AGSEQ)', () => {
    const g = new Graph('g', 'directed');
    const u = mkNode(g, 1, 'u');
    const v = mkNode(g, 2, 'v');
    const before = new Edge(u, v, '').seq; // advance the counter for reference
    const ve = newVirtualEdge(u, v, null);
    expect(ve.seq).toBeGreaterThan(before);
  });
});

describe('doOrderingNode — FLATORDER follows DOT-declaration order', () => {
  it('ordering=out: installs head(first)->head(second) when out-list is reversed', () => {
    const g = new Graph('g', 'directed');
    const t = mkNode(g, 1, 't');
    const a = mkNode(g, 2, 'a');
    const b = mkNode(g, 3, 'b');

    // DOT declaration order: t->b first (lower seq), t->a second (higher seq).
    const origB = new Edge(t, b, '');
    const origA = new Edge(t, a, '');
    expect(origB.seq).toBeLessThan(origA.seq);

    // Virtual edges created in the OPPOSITE order (a before b), mirroring how
    // class2 may build the fast graph. Without the seq-copy fix these would sort
    // by creation order (a first) and produce FLATORDER a->b.
    const veToA = newVirtualEdge(t, a, origA);
    const veToB = newVirtualEdge(t, b, origB);
    t.info.out = { list: [veToA, veToB], size: 2 };

    doOrderingNode(mkCtx(g), g, t, true);

    // Faithful result: sort by seq -> [t->b, t->a] -> heads [b, a] -> FLATORDER b->a.
    const ba = findFlatEdge(b, a);
    expect(ba).toBeDefined();
    expect(ba!.info.edge_type).toBe(FLATORDER);
    expect(findFlatEdge(a, b)).toBeUndefined();
  });

  it('ordering=in: installs tail(first)->tail(second) when in-list is reversed', () => {
    const g = new Graph('g', 'directed');
    const z = mkNode(g, 1, 'z');
    const a = mkNode(g, 2, 'a');
    const b = mkNode(g, 3, 'b');

    // DOT declaration order: a->z first (lower seq), b->z second (higher seq).
    const origA = new Edge(a, z, '');
    const origB = new Edge(b, z, '');
    expect(origA.seq).toBeLessThan(origB.seq);

    // Virtual edges created in the OPPOSITE order (b before a).
    const veFromB = newVirtualEdge(b, z, origB);
    const veFromA = newVirtualEdge(a, z, origA);
    z.info.in = { list: [veFromB, veFromA], size: 2 };

    doOrderingNode(mkCtx(g), g, z, false);

    // Faithful result: sort by seq -> [a->z, b->z] -> tails [a, b] -> FLATORDER a->b.
    const ab = findFlatEdge(a, b);
    expect(ab).toBeDefined();
    expect(ab!.info.edge_type).toBe(FLATORDER);
    expect(findFlatEdge(b, a)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Issue #169: a node-default `ordering`, and the two "not recognized" errors.
//
// C `do_ordering_for_nodes` reads `late_string(n, N_ordering, NULL)`: the
// node's own value, else the `node [...]` default it was created under. Each
// NATIVE_* constant is native graphviz 16.1.0 `dot -Tplain` (stdout) or its
// stderr for the source above it (plans/issue-169-node-default-ordering/
// harness/native/).
// @see lib/dotgen/mincross.c:do_ordering_for_nodes, ordered_edges
// ---------------------------------------------------------------------------

const ROOT_DEFAULT = 'digraph { node [ordering=out]; q -> p; q -> z; z -> v; p -> v; p -> u; }';
const NATIVE_ROOT_DEFAULT_PLAIN = `graph 1 1.75 2.5
node q 0.875 2.25 0.75 0.5 q solid ellipse black lightgrey
node p 0.375 1.25 0.75 0.5 p solid ellipse black lightgrey
node z 1.375 1.25 0.75 0.5 z solid ellipse black lightgrey
node v 0.375 0.25 0.75 0.5 v solid ellipse black lightgrey
node u 1.375 0.25 0.75 0.5 u solid ellipse black lightgrey
edge q p 4 0.75903 2.0106 0.70034 1.8965 0.62766 1.7552 0.56138 1.6263 solid black
edge q z 4 0.99097 2.0106 1.0497 1.8965 1.1223 1.7552 1.1886 1.6263 solid black
edge p v 4 0.375 0.99579 0.375 0.89454 0.375 0.77398 0.375 0.66022 solid black
edge p u 4 0.5822 1.0347 0.71896 0.9017 0.90085 0.72486 1.0559 0.57411 solid black
edge z v 4 1.1678 1.0347 1.031 0.9017 0.84915 0.72486 0.69409 0.57411 solid black
stop
`;

const SUBGRAPH_DEFAULT = 'digraph { subgraph s { node [ordering=out]; q } q -> p; q -> z; z -> v; p -> v; p -> u; }';
const NATIVE_SUBGRAPH_DEFAULT_PLAIN = `graph 1 1.75 2.5
node q 0.875 2.25 0.75 0.5 q solid ellipse black lightgrey
node p 0.375 1.25 0.75 0.5 p solid ellipse black lightgrey
node z 1.375 1.25 0.75 0.5 z solid ellipse black lightgrey
node v 1.375 0.25 0.75 0.5 v solid ellipse black lightgrey
node u 0.375 0.25 0.75 0.5 u solid ellipse black lightgrey
edge q p 4 0.75903 2.0106 0.70034 1.8965 0.62766 1.7552 0.56138 1.6263 solid black
edge q z 4 0.99097 2.0106 1.0497 1.8965 1.1223 1.7552 1.1886 1.6263 solid black
edge p v 4 0.5822 1.0347 0.71896 0.9017 0.90085 0.72486 1.0559 0.57411 solid black
edge p u 4 0.375 0.99579 0.375 0.89454 0.375 0.77398 0.375 0.66022 solid black
edge z v 4 1.375 0.99579 1.375 0.89454 1.375 0.77398 1.375 0.66022 solid black
stop
`;

const LATE_DEFAULT = 'digraph { q -> p; q -> z; z -> v; p -> v; p -> u; node [ordering=out]; }';
const NATIVE_LATE_DEFAULT_PLAIN = `graph 1 1.75 2.5
node q 0.875 2.25 0.75 0.5 q solid ellipse black lightgrey
node p 1.375 1.25 0.75 0.5 p solid ellipse black lightgrey
node z 0.375 1.25 0.75 0.5 z solid ellipse black lightgrey
node v 0.375 0.25 0.75 0.5 v solid ellipse black lightgrey
node u 1.375 0.25 0.75 0.5 u solid ellipse black lightgrey
edge q p 4 0.99097 2.0106 1.0497 1.8965 1.1223 1.7552 1.1886 1.6263 solid black
edge q z 4 0.75903 2.0106 0.70034 1.8965 0.62766 1.7552 0.56138 1.6263 solid black
edge p v 4 1.1678 1.0347 1.031 0.9017 0.84915 0.72486 0.69409 0.57411 solid black
edge p u 4 1.375 0.99579 1.375 0.89454 1.375 0.77398 1.375 0.66022 solid black
edge z v 4 0.375 0.99579 0.375 0.89454 0.375 0.77398 0.375 0.66022 solid black
stop
`;

const BAD_NODE_DEFAULT = 'digraph { node [ordering=bogus]; q -> p; q -> z; }';
const NATIVE_BAD_NODE_DEFAULT_PLAIN = `graph 1 1.75 1.5
node q 0.875 1.25 0.75 0.5 q solid ellipse black lightgrey
node p 0.375 0.25 0.75 0.5 p solid ellipse black lightgrey
node z 1.375 0.25 0.75 0.5 z solid ellipse black lightgrey
edge q p 4 0.75903 1.0106 0.70034 0.8965 0.62766 0.75518 0.56138 0.62629 solid black
edge q z 4 0.99097 1.0106 1.0497 0.8965 1.1223 0.75518 1.1886 0.62629 solid black
stop
`;
const NATIVE_BAD_NODE_DEFAULT_ERR = `Error: ordering 'bogus' not recognized for node 'q'.
Error: ordering 'bogus' not recognized for node 'p'.
Error: ordering 'bogus' not recognized for node 'z'.
`;

const BAD_NODE_OWN = 'digraph { q [ordering=bogus]; q -> p; q -> z; }';
const NATIVE_BAD_NODE_OWN_PLAIN = `graph 1 1.75 1.5
node q 0.875 1.25 0.75 0.5 q solid ellipse black lightgrey
node p 0.375 0.25 0.75 0.5 p solid ellipse black lightgrey
node z 1.375 0.25 0.75 0.5 z solid ellipse black lightgrey
edge q p 4 0.75903 1.0106 0.70034 0.8965 0.62766 0.75518 0.56138 0.62629 solid black
edge q z 4 0.99097 1.0106 1.0497 0.8965 1.1223 0.75518 1.1886 0.62629 solid black
stop
`;
const NATIVE_BAD_NODE_OWN_ERR = `Error: ordering 'bogus' not recognized for node 'q'.
`;

const BAD_GRAPH = 'digraph { ordering=bogus; q -> p; q -> z; }';
const NATIVE_BAD_GRAPH_PLAIN = `graph 1 1.75 1.5
node q 0.875 1.25 0.75 0.5 q solid ellipse black lightgrey
node p 0.375 0.25 0.75 0.5 p solid ellipse black lightgrey
node z 1.375 0.25 0.75 0.5 z solid ellipse black lightgrey
edge q p 4 0.75903 1.0106 0.70034 0.8965 0.62766 0.75518 0.56138 0.62629 solid black
edge q z 4 0.99097 1.0106 1.0497 0.8965 1.1223 0.75518 1.1886 0.62629 solid black
stop
`;
const NATIVE_BAD_GRAPH_ERR = `Error: ordering 'bogus' not recognized.
`;

/** Render to plain, returning the output and everything the port wrote
 * through agerr (the pieces C's `out` hands a user error function, joined). */
function renderPlain(src: string): { out: string; err: string } {
  const pieces: string[] = [];
  agseterrf((m) => { pieces.push(m); });
  const out = render(parse(src), 'plain');
  return { out, err: pieces.join('') };
}

describe('node-default ordering (issue #169)', () => {
  afterEach(() => {
    agseterrf(null);
  });

  /** `t` with out-edges to `a` then `b` (declaration order), listed reversed. */
  function fanOut(): { g: Graph; t: Node; a: Node; b: Node } {
    const g = new Graph('g', 'directed');
    const t = mkNode(g, 1, 't');
    const a = mkNode(g, 2, 'a');
    const b = mkNode(g, 3, 'b');
    const ea = new Edge(t, a, '');
    const eb = new Edge(t, b, '');
    t.info.out = { list: [eb, ea], size: 2 };
    return { g, t, a, b };
  }

  it('doOrderingForNodes reads the default the node was created under', () => {
    const { g, t, a, b } = fanOut();
    t.nodeDefaultsSnapshot = new Map([['ordering', 'out']]);

    doOrderingForNodes(mkCtx(g), g);

    const fe = findFlatEdge(a, b);
    expect(fe).toBeDefined();
    expect(fe!.info.edge_type).toBe(FLATORDER);
  });

  // C: `else if (ordering[0])`. An empty value is neither applied nor reported.
  it('doOrderingForNodes neither orders nor reports an empty ordering', () => {
    const { g, t, a, b } = fanOut();
    t.attrs.set('ordering', '');
    const pieces: string[] = [];
    agseterrf((m) => { pieces.push(m); });

    doOrderingForNodes(mkCtx(g), g);

    expect(findFlatEdge(a, b)).toBeUndefined();
    expect(findFlatEdge(b, a)).toBeUndefined();
    expect(pieces).toEqual([]);
  });

  it('applies a root node [ordering=out] default to the nodes created under it', () => {
    expect(renderPlain(ROOT_DEFAULT)).toEqual({ out: NATIVE_ROOT_DEFAULT_PLAIN, err: '' });
  });

  it('applies a subgraph-scoped default only to the node declared in that subgraph', () => {
    expect(renderPlain(SUBGRAPH_DEFAULT)).toEqual({ out: NATIVE_SUBGRAPH_DEFAULT_PLAIN, err: '' });
  });

  it('ignores a default declared after the nodes, as agxget does', () => {
    expect(renderPlain(LATE_DEFAULT)).toEqual({ out: NATIVE_LATE_DEFAULT_PLAIN, err: '' });
  });

  it('reports an unrecognised node default once per node, in node order', () => {
    expect(renderPlain(BAD_NODE_DEFAULT)).toEqual({
      out: NATIVE_BAD_NODE_DEFAULT_PLAIN, err: NATIVE_BAD_NODE_DEFAULT_ERR,
    });
  });

  it("reports an unrecognised value on a node's own attribute", () => {
    expect(renderPlain(BAD_NODE_OWN)).toEqual({
      out: NATIVE_BAD_NODE_OWN_PLAIN, err: NATIVE_BAD_NODE_OWN_ERR,
    });
  });

  it('reports an unrecognised graph ordering once, without the node name', () => {
    expect(renderPlain(BAD_GRAPH)).toEqual({
      out: NATIVE_BAD_GRAPH_PLAIN, err: NATIVE_BAD_GRAPH_ERR,
    });
  });
});
