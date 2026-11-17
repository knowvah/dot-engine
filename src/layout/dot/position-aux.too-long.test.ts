// SPDX-License-Identifier: EPL-2.0
//
// Issue #162. Graphviz 16.1.1 no longer clamps an aux edge longer than
// INT_MAX: make_aux_edge prints its error and returns NULL (upstream
// f86899fcc), and the callers that test the result fail the layout:
// make_LR_constraints at its four sites (e62e35be5, 92ef8d508),
// make_edge_pairs at both edges (73c1fd4d1, f0d837f19), create_aux_edges
// (d3f55476c, eee08edc1, f1e5ad67d). Every other caller ignores the result,
// so the edge is simply absent there.
//
// Each test drives one site with a length above INT_MAX and checks the
// status, what was not written, and where the caller stopped.
// @see lib/dotgen/position.c:make_aux_edge, make_LR_constraints,
//   make_edge_pairs, create_aux_edges, contain_nodes

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { MockInstance } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { fastEdge } from './fastgr.js';
import { SLACKNODE } from './rank.js';
import {
  makeAuxEdge, processFlatEdge, makeFlatEdgeConstraints, applyFlatLabel,
  makeFlatLabelConstraints, lrRankPair, makeLrRankConstraints, makeLrConstraints,
  addEdgePair, makeEdgePairs, createAuxEdges,
} from './position-aux.js';
import { containNodesRank } from './position-cluster.js';

const INT_MAX = 2147483647;
/** A half-width that puts any `rw + lw + nodesep` sum above INT_MAX. */
const OVERWIDE = 3e9;
const NODESEP = 10;
const CHECK_LINE = 'Check for overwide node(s).';

/** The line `agerrorf` writes for a refused length, as native prints it. */
function tooLong(value: string): string {
  return `Error: Edge length ${value} larger than maximum ${INT_MAX} allowed.\n${CHECK_LINE}`;
}

function makeRankEntry(v: Node[]): RankEntry {
  return {
    n: v.length, v, an: v.length, av: v,
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: true, cache_nc: 0,
  };
}

function rootGraph(): Graph {
  const g = new Graph('g', 'directed');
  g.root = g;
  g.info.nodesep = NODESEP;
  return g;
}

/** Number of fast out/in edges on a node (0 when the list is unallocated). */
const outSize = (n: Node): number => n.info.out?.size ?? 0;
const inSize = (n: Node): number => n.info.in?.size ?? 0;

let stderr: MockInstance<(...args: unknown[]) => void>;

beforeEach(() => {
  stderr = vi.spyOn(console, 'error').mockImplementation(() => undefined);
});

afterEach(() => {
  stderr.mockRestore();
});

describe('makeAuxEdge refuses a length above INT_MAX (16.1.1)', () => {
  it('returns null, links nothing, and prints native\'s two lines', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    expect(makeAuxEdge(u, v, 1e20, 0)).toBeNull();
    expect(outSize(u)).toBe(0);
    expect(inSize(v)).toBe(0);
    expect(stderr.mock.calls).toEqual([[tooLong('100000000000000000000.000000')]]);
  });

  it('prints a length past 1e21 in full, as C %f does', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    // 2781's length: a 1e24-inch node in points (the product, which is one
    // ulp below the literal 7.2e25). Number.prototype.toFixed prints it as
    // 7.1999999999999994e+25.
    expect(makeAuxEdge(u, v, 1e24 * 72, 0)).toBeNull();
    expect(stderr.mock.calls).toEqual([[tooLong('71999999999999994497073152.000000')]]);
  });

  it('accepts exactly INT_MAX: the test is `len > INT_MAX`', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    const e = makeAuxEdge(u, v, INT_MAX, 3);
    expect(e?.info.minlen).toBe(INT_MAX);
    expect(e?.info.weight).toBe(3);
    expect(outSize(u)).toBe(1);
    expect(stderr).not.toHaveBeenCalled();
  });

  it('refuses the first double above INT_MAX', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    expect(makeAuxEdge(u, v, INT_MAX + 0.5, 0)).toBeNull();
    expect(stderr.mock.calls).toEqual([[tooLong('2147483647.500000')]]);
  });
});

describe('make_LR_constraints: the adjacent-pair edge (position.c:269)', () => {
  it('lrRankPair returns null and leaves the neighbour\'s rank unwritten', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.rw = OVERWIDE;
    const v = new Node(1, 'v', g); v.info.lw = 27; v.info.rank = 7;
    expect(lrRankPair(g, 0, u, v, 0)).toBeNull();
    expect(v.info.rank).toBe(7);
    expect(outSize(u)).toBe(0);
    expect(stderr.mock.calls).toEqual([[tooLong('3000000037.000000')]]);
  });

  it('makeLrRankConstraints returns -1 and stops at the failing pair', () => {
    const g = rootGraph();
    const a = new Node(0, 'a', g); a.info.rw = OVERWIDE;
    const b = new Node(1, 'b', g); b.info.rw = 5;
    const c = new Node(2, 'c', g);
    g.info.rank = [makeRankEntry([a, b, c])];
    expect(makeLrRankConstraints(g, 0)).toBe(-1);
    expect(a.info.mval).toBe(OVERWIDE); // j = 0 ran up to the refusal
    expect(b.info.mval).toBeUndefined(); // j = 1 never ran
    expect(outSize(b)).toBe(0);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('makeLrConstraints returns -1 and does not reach the next rank', () => {
    const g = rootGraph();
    g.info.minrank = 0; g.info.maxrank = 1;
    const a = new Node(0, 'a', g); a.info.rw = OVERWIDE;
    const b = new Node(1, 'b', g);
    const c = new Node(2, 'c', g);
    const d = new Node(3, 'd', g);
    g.info.rank = [makeRankEntry([a, b]), makeRankEntry([c, d])];
    expect(makeLrConstraints(g)).toBe(-1);
    expect(outSize(c)).toBe(0);
    expect(c.info.mval).toBeUndefined();
  });
});

describe('make_LR_constraints: the flat-label pair (position.c:288, :293)', () => {
  /** A label node `lbl` whose two saved out edges go to `h0` and `h1`. */
  function flatLabel(g: Graph): { lbl: Node; h0: Node; h1: Node; e: Edge; e0: Edge; e1: Edge } {
    const lbl = new Node(0, 'lbl', g);
    const h0 = new Node(1, 'h0', g); h0.info.order = 0;
    const h1 = new Node(2, 'h1', g); h1.info.order = 1;
    const e = new Edge(lbl, lbl, ''); e.info.minlen = 4;
    return { lbl, h0, h1, e, e0: new Edge(lbl, h0, ''), e1: new Edge(lbl, h1, '') };
  }

  it('applyFlatLabel returns -1 at the first edge and does not try the second', () => {
    const g = rootGraph();
    const f = flatLabel(g);
    f.h0.info.rw = OVERWIDE;
    expect(applyFlatLabel(g, f.e, f.e0, f.e1)).toBe(-1);
    expect(outSize(f.h0)).toBe(0);
    expect(outSize(f.lbl)).toBe(0);
    expect(stderr.mock.calls).toEqual([[tooLong('3000000020.000000')]]);
  });

  it('applyFlatLabel returns -1 at the second edge, after making the first', () => {
    const g = rootGraph();
    const f = flatLabel(g);
    f.h1.info.lw = OVERWIDE;
    expect(applyFlatLabel(g, f.e, f.e0, f.e1)).toBe(-1);
    expect(outSize(f.h0)).toBe(1);
    expect(outSize(f.lbl)).toBe(0);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('applyFlatLabel returns 0 when both edges fit', () => {
    const g = rootGraph();
    const f = flatLabel(g);
    expect(applyFlatLabel(g, f.e, f.e0, f.e1)).toBe(0);
    expect(outSize(f.h0)).toBe(1);
    expect(outSize(f.lbl)).toBe(1);
  });

  it('makeFlatLabelConstraints passes the failure on, and 0 on its early returns', () => {
    const g = rootGraph();
    const f = flatLabel(g);
    f.h0.info.rw = OVERWIDE;
    expect(makeFlatLabelConstraints(g, f.lbl)).toBe(0); // no ND_alg edge
    f.lbl.info.posAlg = f.e;
    expect(makeFlatLabelConstraints(g, f.lbl)).toBe(0); // no saved out edges
    f.lbl.info.save_out = { list: [f.e0, f.e1], size: 2 };
    expect(makeFlatLabelConstraints(g, f.lbl)).toBe(-1);
  });

  it('makeLrRankConstraints returns -1 when the label constraint fails', () => {
    const g = rootGraph();
    const f = flatLabel(g);
    f.h0.info.rw = OVERWIDE;
    f.lbl.info.posAlg = f.e;
    f.lbl.info.save_out = { list: [f.e0, f.e1], size: 2 };
    const flat = new Edge(f.lbl, f.h1, ''); flat.info.minlen = 1;
    f.lbl.info.flat_out = { list: [flat], size: 1 };
    g.info.rank = [makeRankEntry([f.lbl])];
    expect(makeLrRankConstraints(g, 0)).toBe(-1);
    expect(outSize(f.lbl)).toBe(0); // the flat-edge loop after it never ran
  });
});

describe('make_LR_constraints: an unlabelled flat edge between non-neighbours (position.c:324)', () => {
  it('processFlatEdge returns -1 and adds no edge', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.order = 0; u.info.rw = OVERWIDE;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const e = new Edge(u, h, ''); e.info.minlen = 1;
    expect(processFlatEdge(g, u, e)).toBe(-1);
    expect(outSize(u)).toBe(0);
    expect(stderr.mock.calls).toEqual([[tooLong('3000000010.000000')]]);
  });

  it('processFlatEdge returns 0 on the arms that make no new edge', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.order = 0; u.info.rw = OVERWIDE;
    const h = new Node(1, 'h', g); h.info.order = 1;
    const labelled = new Edge(u, h, ''); labelled.info.minlen = 1;
    labelled.info.label = { text: 'x' } as never;
    expect(processFlatEdge(g, u, labelled)).toBe(0);
    const existing = new Edge(u, h, ''); fastEdge(existing);
    const e = new Edge(u, h, ''); e.info.minlen = 1;
    // An adjacent pair updates the existing fast edge in place: C writes the
    // int m0 into ED_minlen with no make_aux_edge call, so nothing refuses.
    expect(processFlatEdge(g, u, e)).toBe(0);
    expect(stderr).not.toHaveBeenCalled();
  });

  it('makeFlatEdgeConstraints returns -1 and skips the edges after the failure', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.order = 0;
    const far = new Node(1, 'far', g); far.info.order = 1; far.info.lw = OVERWIDE;
    const near = new Node(2, 'near', g); near.info.order = 2;
    const bad = new Edge(u, far, ''); bad.info.minlen = 1;
    const good = new Edge(u, near, ''); good.info.minlen = 1;
    u.info.flat_out = { list: [bad, good], size: 2 };
    expect(makeFlatEdgeConstraints(g, u)).toBe(-1);
    expect(outSize(u)).toBe(0);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('makeLrRankConstraints returns -1 when a flat-edge constraint fails', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.order = 0;
    const mid = new Node(1, 'mid', g); mid.info.order = 1;
    const far = new Node(2, 'far', g); far.info.order = 2;
    // u's flat edge skips `mid`, and its minlen * nodesep term is what is too
    // long: the adjacent pairs u-mid and mid-far both fit.
    const e = new Edge(u, far, ''); e.info.minlen = OVERWIDE;
    u.info.flat_out = { list: [e], size: 1 };
    g.info.rank = [makeRankEntry([u, mid, far])];
    expect(makeLrRankConstraints(g, 0)).toBe(-1);
    expect(outSize(u)).toBe(1); // only the adjacent pair u -> mid
    expect(mid.info.mval).toBeUndefined(); // the loop stopped at u
    expect(stderr.mock.calls).toEqual([[tooLong('30000000000.000000')]]);
  });

  it('makeFlatEdgeConstraints returns 0 with no flat edges and when all fit', () => {
    const g = rootGraph();
    const u = new Node(0, 'u', g); u.info.order = 0;
    expect(makeFlatEdgeConstraints(g, u)).toBe(0);
    const near = new Node(1, 'near', g); near.info.order = 1;
    const good = new Edge(u, near, ''); good.info.minlen = 1;
    u.info.flat_out = { list: [good], size: 1 };
    expect(makeFlatEdgeConstraints(g, u)).toBe(0);
    expect(outSize(u)).toBe(1);
  });
});

describe('make_edge_pairs (position.c:357, :360)', () => {
  /** An edge whose head port sits `dx` to the right of its tail port. */
  function portEdge(g: Graph, dx: number): { t: Node; h: Node; e: Edge } {
    const t = new Node(0, 't', g); t.info.rank = 10;
    const h = new Node(1, 'h', g); h.info.rank = 20;
    const e = new Edge(t, h, '');
    e.info.head_port.p.x = dx;
    return { t, h, e };
  }

  it('addEdgePair returns -1 at the tail edge and leaves the slack node unranked', () => {
    const g = rootGraph();
    const { t, h, e } = portEdge(g, OVERWIDE);
    expect(addEdgePair(g, e)).toBe(-1);
    const sn = g.info.nlist!;
    expect(sn.info.node_type).toBe(SLACKNODE); // C makes the node before the edges
    expect(sn.info.rank).toBeUndefined();
    expect(inSize(t)).toBe(0);
    expect(inSize(h)).toBe(0);
    expect(stderr.mock.calls).toEqual([[tooLong('3000000001.000000')]]);
  });

  it('addEdgePair returns -1 at the head edge, after making the tail edge', () => {
    const g = rootGraph();
    const { t, h, e } = portEdge(g, -OVERWIDE);
    expect(addEdgePair(g, e)).toBe(-1);
    expect(g.info.nlist!.info.rank).toBeUndefined();
    expect(inSize(t)).toBe(1);
    expect(inSize(h)).toBe(0);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('addEdgePair returns 0 when both edges fit', () => {
    const g = rootGraph();
    const { e } = portEdge(g, 6);
    expect(addEdgePair(g, e)).toBe(0);
    expect(g.info.nlist!.info.rank).toBe(3); // min(10 - 6 - 1, 20 - 0 - 1)
  });

  it('makeEdgePairs returns -1 and makes no pair for the edges after the failure', () => {
    const g = rootGraph();
    const { t, h, e } = portEdge(g, OVERWIDE);
    const good = new Edge(h, t, '');
    t.info.save_out = { list: [e], size: 1 };
    h.info.save_out = { list: [good], size: 1 };
    t.info.next = h;
    g.info.nlist = t;
    expect(makeEdgePairs(g)).toBe(-1);
    // One slack node (the failing edge's) was prepended, not two.
    expect(g.info.nlist!.info.node_type).toBe(SLACKNODE);
    expect(g.info.nlist!.info.next).toBe(t);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('makeEdgePairs returns 0 when every pair fits', () => {
    const g = rootGraph();
    const { t, e } = portEdge(g, 6);
    t.info.save_out = { list: [e], size: 1 };
    g.info.nlist = t;
    expect(makeEdgePairs(g)).toBe(0);
  });
});

describe('create_aux_edges returns the first failure before pos_clusters (position.c:534-550)', () => {
  function spies(): { calls: string[]; pos: (g: Graph) => void; compress: (g: Graph) => void } {
    const calls: string[] = [];
    return {
      calls,
      pos: () => { calls.push('posClusters'); },
      compress: () => { calls.push('compressGraph'); },
    };
  }

  it('stops when make_LR_constraints fails: no edge pairs, no cluster pass', () => {
    const g = rootGraph();
    const a = new Node(0, 'a', g); a.info.rw = OVERWIDE;
    const b = new Node(1, 'b', g);
    fastEdge(new Edge(a, b, '')); // an input edge make_edge_pairs would pair
    a.info.next = b;
    g.info.nlist = a;
    g.info.rank = [makeRankEntry([a, b])];
    const s = spies();
    expect(createAuxEdges(g, s.pos, s.compress)).toBe(-1);
    expect(s.calls).toEqual([]);
    expect(g.info.nlist).toBe(a); // no slack node: make_edge_pairs never ran
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('stops when make_edge_pairs fails: no cluster pass', () => {
    const g = rootGraph();
    const a = new Node(0, 'a', g);
    const b = new Node(1, 'b', g);
    const e = new Edge(a, b, '');
    e.info.head_port.p.x = OVERWIDE;
    fastEdge(e);
    a.info.next = b;
    g.info.nlist = a;
    g.info.minrank = 0; g.info.maxrank = 1;
    g.info.rank = [makeRankEntry([a]), makeRankEntry([b])];
    const s = spies();
    expect(createAuxEdges(g, s.pos, s.compress)).toBe(-1);
    expect(s.calls).toEqual([]);
    expect(stderr).toHaveBeenCalledTimes(1);
  });

  it('returns 0 and runs both cluster passes when nothing is refused', () => {
    const g = rootGraph();
    const a = new Node(0, 'a', g);
    g.info.nlist = a;
    g.info.rank = [makeRankEntry([a])];
    const s = spies();
    expect(createAuxEdges(g, s.pos, s.compress)).toBe(0);
    expect(s.calls).toEqual(['posClusters', 'compressGraph']);
  });
});

describe('a caller that does not test make_aux_edge carries on (contain_nodes)', () => {
  it('prints the error, adds no edge for the overwide node, and makes the next one', () => {
    const g = rootGraph();
    g.info.clusterMargin = 8;
    const ln = new Node(0, 'ln', g);
    const rn = new Node(1, 'rn', g);
    const first = new Node(2, 'first', g); first.info.lw = OVERWIDE;
    const last = new Node(3, 'last', g); last.info.rw = 27;
    g.info.rank = [makeRankEntry([first, last])];
    containNodesRank(g, 0, ln, rn);
    expect(stderr.mock.calls).toEqual([[tooLong('3000000008.000000')]]);
    expect(outSize(ln)).toBe(0); // ln -> first was refused
    expect(last.info.out?.list[0].info.minlen).toBe(35); // last -> rn: 27 + 8
    expect(inSize(rn)).toBe(1);
  });
});
