// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/mincross-flat.ts.
 *
 * D1 mixed mode: every function here is a small, mostly-pure helper over
 * hand-built Graph/Node/Edge/RankEntry fixtures, so branches are driven
 * directly rather than through the full dot-layout pipeline (see
 * mincross-flat.test.ts for the one end-to-end RC1 regression).
 *
 * @see lib/dotgen/mincross.c flat-edge handling
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { EdgeList } from '../../model/nodeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { newMatrix, matrixGet } from './mincross-utils.js';
import { FLATORDER, REVERSED, NORMAL } from './fastgr.js';
import {
  flatRevFindRev, flatRev,
  flatSearchOstack, flatSearchNormal, flatSearchEdge, flatSearch,
  flatBreakcyclesRank, flatBreakcycles,
  constrainingFlatEdge, countConstraining, postorder,
  flatReorderBuildTemprank, flatReorderFixEdges, flatReorderRank, flatReorder,
} from './mincross-flat.js';

// ---------------------------------------------------------------------------
// Test helpers
// ---------------------------------------------------------------------------

let nextId = 0;

function makeNode(g: Graph, name: string): Node {
  const n = new Node(nextId++, name, g.root);
  g.nodes.set(name, n);
  return n;
}

function makeEdge(tail: Node, head: Node): Edge {
  return new Edge(tail, head, '');
}

function el(...edges: Edge[]): EdgeList {
  return { list: edges, size: edges.length };
}

function makeRank(nodes: Node[]): RankEntry {
  return {
    n: nodes.length, v: [...nodes], an: nodes.length, av: [...nodes],
    ht1: 0, ht2: 0, pht1: 0, pht2: 0, candidate: false, valid: true,
    cache_nc: 0,
  };
}

/** Mark tail/head as `insideCluster`-true: NORMAL node_type + registered. */
function markInCluster(g: Graph, ...nodes: Node[]): void {
  for (const n of nodes) n.info.node_type = NORMAL;
}

// ---------------------------------------------------------------------------
// flatRevFindRev  @see lib/dotgen/mincross.c:flat_rev
// ---------------------------------------------------------------------------

describe('flatRevFindRev', () => {
  it('returns undefined when head.info.flat_out is unset', () => {
    const g = new Graph('g', 'directed');
    const h = makeNode(g, 'h');
    const t = makeNode(g, 't');
    expect(flatRevFindRev(h, t)).toBeUndefined();
  });

  it('returns the matching edge when one targets tail', () => {
    const g = new Graph('g', 'directed');
    const h = makeNode(g, 'h');
    const t = makeNode(g, 't');
    const other = makeNode(g, 'other');
    const e1 = makeEdge(h, other);
    const e2 = makeEdge(h, t);
    h.info.flat_out = el(e1, e2);
    expect(flatRevFindRev(h, t)).toBe(e2);
  });

  it('returns undefined after scanning a non-matching list', () => {
    const g = new Graph('g', 'directed');
    const h = makeNode(g, 'h');
    const t = makeNode(g, 't');
    const other = makeNode(g, 'other');
    h.info.flat_out = el(makeEdge(h, other));
    expect(flatRevFindRev(h, t)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// flatRev  @see lib/dotgen/mincross.c:flat_rev
// ---------------------------------------------------------------------------

describe('flatRev — rev found', () => {
  it('sets to_orig and appends to tail.other (both && arms true, no other list)', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const e = makeEdge(tail, head);
    const rev = makeEdge(head, tail);
    rev.info.edge_type = FLATORDER;
    head.info.flat_out = el(rev);
    flatRev(g, e);
    expect(rev.info.to_orig).toBe(e);
    expect(tail.info.other?.list).toContain(e);
  });

  it('leaves to_orig unset when rev.edge_type is not FLATORDER', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const e = makeEdge(tail, head);
    const rev = makeEdge(head, tail);
    // rev.info.edge_type left undefined (!== FLATORDER)
    head.info.flat_out = el(rev);
    flatRev(g, e);
    expect(rev.info.to_orig).toBeUndefined();
  });

  it('does not overwrite an already-set to_orig', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const priorOrig = makeEdge(tail, head);
    const e = makeEdge(tail, head);
    const rev = makeEdge(head, tail);
    rev.info.edge_type = FLATORDER;
    rev.info.to_orig = priorOrig;
    head.info.flat_out = el(rev);
    flatRev(g, e);
    expect(rev.info.to_orig).toBe(priorOrig);
  });

  it('appends to an already-existing tail.other list', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const e = makeEdge(tail, head);
    const rev = makeEdge(head, tail);
    head.info.flat_out = el(rev);
    const existing = makeEdge(tail, head);
    tail.info.other = el(existing);
    flatRev(g, e);
    expect(tail.info.other.list).toEqual([existing, e]);
  });
});

describe('flatRev — rev not found (else branch)', () => {
  it('creates a FLATORDER virtual edge when e.info.edge_type is FLATORDER', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const e = makeEdge(tail, head);
    e.info.edge_type = FLATORDER;
    flatRev(g, e);
    expect(head.info.flat_out?.size).toBe(1);
    const r = head.info.flat_out!.list[0]!;
    expect(r.info.edge_type).toBe(FLATORDER);
    expect(g.info.has_flat_edges).toBe(true);
  });

  it('creates a REVERSED virtual edge when e.info.edge_type is not FLATORDER', () => {
    const g = new Graph('g', 'directed');
    const tail = makeNode(g, 'tail');
    const head = makeNode(g, 'head');
    const e = makeEdge(tail, head);
    flatRev(g, e);
    const r = head.info.flat_out!.list[0]!;
    expect(r.info.edge_type).toBe(REVERSED);
  });
});

// ---------------------------------------------------------------------------
// flatSearchOstack  @see lib/dotgen/mincross.c:flat_search (onstack branch)
// ---------------------------------------------------------------------------

describe('flatSearchOstack', () => {
  it('defaults v.low/head.low to 0, sets matrix bit, skips flatRev for FLATORDER', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const head = makeNode(g, 'target');
    const e = makeEdge(v, head);
    e.info.edge_type = FLATORDER;
    v.info.flat_out = el(e);
    const M = newMatrix(2, 2);
    const result = flatSearchOstack(g, v, e, M);
    expect(result).toBe(true);
    expect(matrixGet(M, 0, 0)).toBe(true);
    expect(v.info.flat_out.size).toBe(0); // deleteFlatEdge removed it
    expect(head.info.flat_out).toBeUndefined(); // flatRev not called
  });

  it('uses explicit v.low/head.low and calls flatRev for non-FLATORDER edges', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const head = makeNode(g, 'target');
    v.info.low = 3;
    head.info.low = 5;
    const e = makeEdge(v, head);
    v.info.flat_out = el(e);
    const M = newMatrix(8, 8);
    flatSearchOstack(g, v, e, M);
    expect(matrixGet(M, 5, 3)).toBe(true);
    // flatRev's else branch fired: reversed virtual edge registered on head.
    expect(head.info.flat_out?.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// flatSearchNormal  @see lib/dotgen/mincross.c:flat_search (recursive branch)
// ---------------------------------------------------------------------------

describe('flatSearchNormal', () => {
  it('defaults low to 0 and recurses when e.head.info.mark is unset', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const head = makeNode(g, 'head');
    const e = makeEdge(v, head);
    const M = newMatrix(2, 2);
    flatSearchNormal(g, v, e, M, false);
    expect(matrixGet(M, 0, 0)).toBe(true);
    expect(head.info.mark).toBe(1); // flatSearch recursed onto head
  });

  it('uses explicit lows and skips recursion when e.head.info.mark is set', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const head = makeNode(g, 'head');
    v.info.low = 1;
    head.info.low = 4;
    head.info.mark = 1;
    const e = makeEdge(v, head);
    const M = newMatrix(8, 8);
    flatSearchNormal(g, v, e, M, false);
    expect(matrixGet(M, 1, 4)).toBe(true);
    expect(head.info.onstack).toBeUndefined(); // flatSearch never ran on head
  });
});

// ---------------------------------------------------------------------------
// flatSearchEdge  @see lib/dotgen/mincross.c:flat_search (dispatch branch)
// ---------------------------------------------------------------------------

describe('flatSearchEdge', () => {
  it('returns false when M is falsy', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const e = makeEdge(v, makeNode(g, 'h'));
    expect(flatSearchEdge(g, v, e, undefined, false)).toBe(false);
  });

  it('returns false when hascl and one endpoint is not contained', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    g.nodes.delete('h'); // h no longer contained in g
    const e = makeEdge(v, h);
    e.info.weight = 1;
    const M = newMatrix(2, 2);
    expect(flatSearchEdge(g, v, e, M, true)).toBe(false);
  });

  it('proceeds when hascl is true and both endpoints are contained', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    const e = makeEdge(v, h);
    e.info.weight = 1;
    const M = newMatrix(2, 2);
    // Passes the hascl containment check; falls through to weight check (true).
    expect(flatSearchEdge(g, v, e, M, true)).toBe(false);
    expect(matrixGet(M, 0, 0)).toBe(true); // flatSearchNormal ran
  });

  it('returns false for an undefined weight (defaults to 0)', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const e = makeEdge(v, makeNode(g, 'h'));
    const M = newMatrix(2, 2);
    expect(flatSearchEdge(g, v, e, M, false)).toBe(false);
  });

  it('returns false for an explicit zero weight', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const e = makeEdge(v, makeNode(g, 'h'));
    e.info.weight = 0;
    const M = newMatrix(2, 2);
    expect(flatSearchEdge(g, v, e, M, false)).toBe(false);
  });

  it('dispatches to flatSearchOstack (returns true) when head.onstack is set', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    h.info.onstack = 1;
    const e = makeEdge(v, h);
    e.info.weight = 1;
    v.info.flat_out = el(e);
    const M = newMatrix(2, 2);
    expect(flatSearchEdge(g, v, e, M, false)).toBe(true);
  });

  it('dispatches to flatSearchNormal (returns false) when head.onstack is unset', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    const e = makeEdge(v, h);
    e.info.weight = 1;
    const M = newMatrix(2, 2);
    expect(flatSearchEdge(g, v, e, M, false)).toBe(false);
    expect(h.info.mark).toBe(1); // recursed via flatSearchNormal
  });
});

// ---------------------------------------------------------------------------
// flatSearch  @see lib/dotgen/mincross.c:flat_search
// ---------------------------------------------------------------------------

describe('flatSearch', () => {
  it('sets mark/onstack and skips the loop entirely when flat_out is unset', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    flatSearch(g, v, undefined, false);
    expect(v.info.mark).toBe(1);
    expect(v.info.onstack).toBe(0);
  });

  it('advances i (no deletion) when flatSearchEdge returns false', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    const e = makeEdge(v, h);
    e.info.weight = 0; // flatSearchEdge returns false without dispatch
    v.info.flat_out = el(e);
    flatSearch(g, v, newMatrix(2, 2), false);
    expect(v.info.flat_out.size).toBe(1); // edge untouched, loop terminated via i++
  });

  it('does not advance i when the edge is deleted (deleted branch)', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    h.info.onstack = 1;
    const e = makeEdge(v, h);
    e.info.weight = 1;
    e.info.edge_type = FLATORDER; // skip flatRev's else-branch bookkeeping
    v.info.flat_out = el(e);
    flatSearch(g, v, newMatrix(2, 2), false);
    expect(v.info.flat_out.size).toBe(0); // deleteFlatEdge shrank the list
  });
});

// ---------------------------------------------------------------------------
// flatBreakcyclesRank  @see lib/dotgen/mincross.c:flat_breakcycles
// ---------------------------------------------------------------------------

describe('flatBreakcyclesRank', () => {
  it('never allocates rk.flat when no node has flat_out (hasFlat stays false)', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const rk = makeRank([v]);
    flatBreakcyclesRank(g, rk, false);
    expect(rk.flat).toBeUndefined();
  });

  it('allocates rk.flat once, skips re-marked nodes, handles empty flat_out', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 'a');
    const b = makeNode(g, 'b');
    const c = makeNode(g, 'c');
    const eAB = makeEdge(a, b);
    eAB.info.weight = 1;
    a.info.flat_out = el(eAB);
    c.info.flat_out = el(); // defined but size 0 — exercises the ternary's true arm
    const rk = makeRank([a, b, c]);
    flatBreakcyclesRank(g, rk, false);
    expect(rk.flat).toBeDefined();
    expect(rk.flat!.nrows).toBe(3);
    // b was marked by recursion through flatSearch(a); the outer loop's
    // `if (!v.info.mark)` check must skip it (false branch).
    expect(a.info.mark).toBe(1);
    expect(b.info.mark).toBe(1);
    expect(c.info.mark).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// flatBreakcycles  @see lib/dotgen/mincross.c:flat_breakcycles
// ---------------------------------------------------------------------------

describe('flatBreakcycles', () => {
  it('returns immediately when g.info.rank is unset', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    expect(() => flatBreakcycles({} as never, g)).not.toThrow();
  });

  it('defaults minrank/maxrank/n_cluster to 0 via dotRoot=g.root', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    const v = makeNode(g, 'v');
    g.info.rank = [makeRank([v])];
    expect(() => flatBreakcycles({} as never, g)).not.toThrow();
  });

  it('walks explicit minrank..maxrank and uses root.n_cluster > 0 (hascl true)', () => {
    const g = new Graph('g', 'directed');
    const root = new Graph('root', 'directed');
    root.info.n_cluster = 1;
    g.info.dotroot = root;
    g.root = g;
    const a = makeNode(g, 'a');
    const b = makeNode(g, 'b');
    g.info.minrank = 0;
    g.info.maxrank = 1;
    const eAB = makeEdge(a, b);
    eAB.info.weight = 1;
    a.info.flat_out = el(eAB);
    g.info.rank = [makeRank([a]), makeRank([b])];
    flatBreakcycles({} as never, g);
    // hascl=true and b is not contained in g's own node set relative to a's
    // rank window, but both a,b ARE in g.nodes, so the containment check
    // passes and the edge is processed (flatSearch ran on a).
    expect(a.info.mark).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// constrainingFlatEdge  @see lib/dotgen/mincross.c
// ---------------------------------------------------------------------------

describe('constrainingFlatEdge', () => {
  it('returns false for an undefined weight (defaults to 0)', () => {
    const g = new Graph('g', 'directed');
    const e = makeEdge(makeNode(g, 't'), makeNode(g, 'h'));
    expect(constrainingFlatEdge(g, e)).toBe(false);
  });

  it('returns false for an explicit zero weight', () => {
    const g = new Graph('g', 'directed');
    const e = makeEdge(makeNode(g, 't'), makeNode(g, 'h'));
    e.info.weight = 0;
    expect(constrainingFlatEdge(g, e)).toBe(false);
  });

  it('returns false when the tail is not inside the cluster', () => {
    const g = new Graph('g', 'directed');
    const t = makeNode(g, 't');
    const h = makeNode(g, 'h');
    markInCluster(g, h);
    const e = makeEdge(t, h);
    e.info.weight = 1;
    expect(constrainingFlatEdge(g, e)).toBe(false);
  });

  it('returns false when the head is not inside the cluster', () => {
    const g = new Graph('g', 'directed');
    const t = makeNode(g, 't');
    const h = makeNode(g, 'h');
    markInCluster(g, t);
    const e = makeEdge(t, h);
    e.info.weight = 1;
    expect(constrainingFlatEdge(g, e)).toBe(false);
  });

  it('returns true when weight nonzero and both endpoints inside the cluster', () => {
    const g = new Graph('g', 'directed');
    const t = makeNode(g, 't');
    const h = makeNode(g, 'h');
    markInCluster(g, t, h);
    const e = makeEdge(t, h);
    e.info.weight = 1;
    expect(constrainingFlatEdge(g, e)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// countConstraining  @see lib/dotgen/mincross.c
// ---------------------------------------------------------------------------

describe('countConstraining', () => {
  it('returns 0 for an empty edge list', () => {
    const g = new Graph('g', 'directed');
    expect(countConstraining(g, el())).toBe(0);
  });

  it('counts only the constraining edges in a mixed list', () => {
    const g = new Graph('g', 'directed');
    const t = makeNode(g, 't');
    const h = makeNode(g, 'h');
    const h2 = makeNode(g, 'h2');
    markInCluster(g, t, h);
    const good = makeEdge(t, h);
    good.info.weight = 1;
    const bad = makeEdge(t, h2); // h2 not in cluster
    bad.info.weight = 1;
    expect(countConstraining(g, el(good, bad))).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// postorder  @see lib/dotgen/mincross.c
// ---------------------------------------------------------------------------

describe('postorder', () => {
  it('pushes v alone when flat_out is unset', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const list: Node[] = [];
    postorder(g, v, list, 0);
    expect(list).toEqual([v]);
  });

  it('pushes v alone when flat_out is defined but empty', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    v.info.flat_out = el();
    const list: Node[] = [];
    postorder(g, v, list, 0);
    expect(list).toEqual([v]);
  });

  it('skips non-constraining edges, already-marked heads, and recurses into fresh ones', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const c1 = makeNode(g, 'c1'); // non-constraining: weight 0
    const c2 = makeNode(g, 'c2'); // constraining but already marked
    const c3 = makeNode(g, 'c3'); // constraining, fresh -> recursion
    markInCluster(g, v, c2, c3);
    const eC1 = makeEdge(v, c1); // weight 0 -> constrainingFlatEdge false
    const eC2 = makeEdge(v, c2);
    eC2.info.weight = 1;
    c2.info.mark = 1;
    const eC3 = makeEdge(v, c3);
    eC3.info.weight = 1;
    v.info.flat_out = el(eC1, eC2, eC3);
    const list: Node[] = [];
    postorder(g, v, list, 7);
    expect(list).toEqual([c3, v]);
  });
});

// ---------------------------------------------------------------------------
// flatReorderBuildTemprank  @see lib/dotgen/mincross.c:flat_reorder
// ---------------------------------------------------------------------------

describe('flatReorderBuildTemprank', () => {
  it('respects the flip ternary: flip=false walks rank in reverse', () => {
    const g = new Graph('g', 'directed');
    const v0 = makeNode(g, 'v0');
    const v1 = makeNode(g, 'v1');
    const rk = makeRank([v0, v1]);
    const temprank: Node[] = [];
    flatReorderBuildTemprank(g, rk, temprank, false);
    expect(temprank).toEqual([v1, v0]);
  });

  it('respects the flip ternary: flip=true walks rank forward', () => {
    const g = new Graph('g', 'directed');
    const v0 = makeNode(g, 'v0');
    const v1 = makeNode(g, 'v1');
    const rk = makeRank([v0, v1]);
    const temprank: Node[] = [];
    flatReorderBuildTemprank(g, rk, temprank, true);
    expect(temprank).toEqual([v0, v1]);
  });

  it('drops a node with nonzero inCnt and unmarked state (neither push nor postorder)', () => {
    const g = new Graph('g', 'directed');
    const x = makeNode(g, 'x');
    const v = makeNode(g, 'v');
    markInCluster(g, x, v);
    const eIn = makeEdge(x, v);
    eIn.info.weight = 1; // constraining -> inCnt=1
    v.info.flat_in = el(eIn);
    const rk = makeRank([v]);
    const temprank: Node[] = [];
    flatReorderBuildTemprank(g, rk, temprank, true);
    expect(temprank).toEqual([]);
  });

  it('runs postorder (default rank 0) when unmarked with inCnt=0 and outCnt>0', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const c = makeNode(g, 'c');
    markInCluster(g, v, c);
    const eOut = makeEdge(v, c);
    eOut.info.weight = 1; // constraining -> outCnt=1
    v.info.flat_out = el(eOut);
    // v.info.rank left undefined -> exercises the `?? 0` default arm.
    const rk = makeRank([v]);
    const temprank: Node[] = [];
    flatReorderBuildTemprank(g, rk, temprank, true);
    expect(temprank).toEqual([c, v]); // postorder(v) pushes c then v
  });

  it('skips postorder when v.info.mark is already set', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const c = makeNode(g, 'c');
    markInCluster(g, v, c);
    const eOut = makeEdge(v, c);
    eOut.info.weight = 1;
    v.info.flat_out = el(eOut);
    v.info.mark = 1;
    v.info.rank = 3; // exercises the defined arm of the `?? 0` default
    const rk = makeRank([v]);
    const temprank: Node[] = [];
    flatReorderBuildTemprank(g, rk, temprank, true);
    expect(temprank).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// flatReorderFixEdges  @see lib/dotgen/mincross.c:flat_reorder
// ---------------------------------------------------------------------------

describe('flatReorderFixEdges', () => {
  it('continues past a node with no flat_out, reverses/keeps for flip=false', () => {
    const g = new Graph('g', 'directed');
    const skip = makeNode(g, 'skip'); // flat_out unset -> continue branch
    const v = makeNode(g, 'v');
    v.info.order = 5; // constant tOrd for both edges (shared tail)
    const h1 = makeNode(g, 'h1');
    h1.info.order = 2; // hOrd(2) < tOrd(5) -> shouldRev true (flip=false)
    const e1 = makeEdge(v, h1);
    const h2 = makeNode(g, 'h2');
    h2.info.order = 8; // hOrd(8) < tOrd(5) false -> shouldRev false
    const e2 = makeEdge(v, h2);
    v.info.flat_out = el(e1, e2);
    const rk = makeRank([skip, v]);
    flatReorderFixEdges(g, rk, false);
    // e1 was reversed (deleted from v.flat_out + flatRev registered a new
    // edge on h1); e2 survived untouched.
    expect(v.info.flat_out.size).toBe(1);
    expect(v.info.flat_out.list[0]).toBe(e2);
  });

  it('reverses the complementary pair for flip=true', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    v.info.order = 5;
    const h1 = makeNode(g, 'h1');
    h1.info.order = 8; // hOrd(8) > tOrd(5) -> shouldRev true (flip=true)
    const e1 = makeEdge(v, h1);
    const h2 = makeNode(g, 'h2');
    h2.info.order = 2; // hOrd(2) > tOrd(5) false -> shouldRev false
    const e2 = makeEdge(v, h2);
    v.info.flat_out = el(e1, e2);
    const rk = makeRank([v]);
    flatReorderFixEdges(g, rk, true);
    expect(v.info.flat_out.size).toBe(1);
    expect(v.info.flat_out.list[0]).toBe(e2);
  });

  it('defaults hOrd/tOrd to 0 when order is unset (no crash, no reversal)', () => {
    const g = new Graph('g', 'directed');
    const v = makeNode(g, 'v');
    const h = makeNode(g, 'h');
    const e = makeEdge(v, h); // both .order left undefined
    v.info.flat_out = el(e);
    const rk = makeRank([v]);
    expect(() => flatReorderFixEdges(g, rk, false)).not.toThrow();
    expect(v.info.flat_out.size).toBe(1); // 0<0 is false -> untouched
  });
});

// ---------------------------------------------------------------------------
// flatReorderRank  @see lib/dotgen/mincross.c:flat_reorder
// ---------------------------------------------------------------------------

describe('flatReorderRank', () => {
  it('returns immediately when rk.n === 0', () => {
    const g = new Graph('g', 'directed');
    const rk = makeRank([]);
    const rootRank = [makeRank([])];
    rootRank[0]!.valid = true;
    flatReorderRank(g, rk, rootRank, 0, false);
    expect(rootRank[0]!.valid).toBe(true); // untouched by the early return
  });

  it('leaves the rank untouched when temprank stays empty (length===0 branch)', () => {
    const g = new Graph('g', 'directed');
    const x = makeNode(g, 'x');
    const v = makeNode(g, 'v');
    markInCluster(g, x, v);
    const eIn = makeEdge(x, v);
    eIn.info.weight = 1;
    v.info.flat_in = el(eIn); // inCnt=1, outCnt=0 -> dropped by buildTemprank
    const rk = makeRank([v]);
    const rootRank = [makeRank([])];
    flatReorderRank(g, rk, rootRank, 0, false);
    expect(rk.v[0]).toBe(v); // unchanged: reorder/fixEdges never ran
    expect(rootRank[0]!.valid).toBe(false); // unconditional tail line still ran
  });

  it('reorders, reverses (flip=false) and sets order using the default baseOrder', () => {
    const g = new Graph('g', 'directed');
    const v0 = makeNode(g, 'v0');
    const v1 = makeNode(g, 'v1');
    // both nodes have inCnt=0/outCnt=0 -> pushed directly by buildTemprank
    const rk = makeRank([v0, v1]); // rankGet(rk,0).info.order undefined -> baseOrder=0
    const rootRank = [makeRank([])];
    flatReorderRank(g, rk, rootRank, 0, false);
    expect(rk.v[0]).toBe(v0);
    expect(rk.v[1]).toBe(v1);
    expect(v0.info.order).toBe(0);
    expect(v1.info.order).toBe(1);
    expect(rootRank[0]!.valid).toBe(false);
  });

  it('reorders without reversing (flip=true) using an explicit baseOrder', () => {
    const g = new Graph('g', 'directed');
    const v0 = makeNode(g, 'v0');
    const v1 = makeNode(g, 'v1');
    v0.info.order = 10; // rankGet(rk,0).info.order defined -> baseOrder=10
    const rk = makeRank([v0, v1]);
    const rootRank = [makeRank([])];
    flatReorderRank(g, rk, rootRank, 0, true);
    // flip=true: buildTemprank walks forward [v0,v1], not reversed.
    expect(rk.v[0]).toBe(v0);
    expect(rk.v[1]).toBe(v1);
    expect(v0.info.order).toBe(10);
    expect(v1.info.order).toBe(11);
  });
});

// ---------------------------------------------------------------------------
// flatReorder  @see lib/dotgen/mincross.c:flat_reorder
// ---------------------------------------------------------------------------

describe('flatReorder', () => {
  it('returns immediately when has_flat_edges is falsy', () => {
    const g = new Graph('g', 'directed');
    g.info.rank = [makeRank([])];
    expect(() => flatReorder({} as never, g)).not.toThrow();
    expect(g.info.rank[0]!.valid).toBe(true); // untouched
  });

  it('returns immediately when g.info.rank is unset', () => {
    const g = new Graph('g', 'directed');
    g.info.has_flat_edges = true;
    expect(() => flatReorder({} as never, g)).not.toThrow();
  });

  it('returns immediately when dotRoot(g).info.rank is unset (rootRank falsy)', () => {
    const root = new Graph('root', 'directed'); // root.info.rank left unset
    const g = new Graph('g', 'directed');
    g.root = root; // dotRoot(g) = g.info.dotroot ?? g.root = root
    g.info.has_flat_edges = true;
    g.info.rank = [makeRank([])]; // g's own rank set, but root's is not
    expect(() => flatReorder({} as never, g)).not.toThrow();
  });

  it('walks default minrank..maxrank (0..0) and default flip=false', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.has_flat_edges = true;
    g.info.rank = [makeRank([])]; // n=0 -> flatReorderRank early-returns
    expect(() => flatReorder({} as never, g)).not.toThrow();
  });

  it('walks explicit minrank..maxrank with flip=true', () => {
    const g = new Graph('g', 'directed');
    g.root = g;
    g.info.has_flat_edges = true;
    g.info.minrank = 1;
    g.info.maxrank = 2;
    g.info.flip = true;
    g.info.rank = [makeRank([]), makeRank([]), makeRank([])];
    expect(() => flatReorder({} as never, g)).not.toThrow();
  });
});
