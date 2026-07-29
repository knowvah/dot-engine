// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/fastgr.ts (fast-graph adjacency
 * list maintenance). Unit-tested directly against real Node/Edge/Graph model
 * instances (D1: this module mutates real `.info` fields, so real instances
 * are simpler than bare fakes), asserting on concrete list contents/lengths.
 *
 * @see lib/dotgen/fastgr.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import type { Port } from '../../model/geom.js';
import {
  ensureList, elistAppend, zapinlist,
  deleteFastEdge, fastEdge, findFastEdge,
  copyPort, copyVirtualPorts, copyVirtualEdgeInfo, newVirtualEdge, virtualEdge,
  mergeWeightsInto, basicMerge, mergeOneway,
  deleteFlatEdge, flatEdge, findFlatEdge,
  reverseEdge,
  fastNode, deleteFastNode, removeFromRank, virtualNode, otherEdge,
  VIRTUAL,
} from './fastgr.js';

function mkGraph(): Graph { return new Graph('g', 'directed'); }
function mkNode(g: Graph, id: number): Node { return new Node(id, `n${id}`, g); }

function mkPort(overrides: Partial<Port> = {}): Port {
  return {
    p: { x: 0, y: 0 }, theta: 0, bp: null, defined: false, constrained: false,
    clip: false, dyna: false, order: 0, side: 0, name: undefined,
    ...overrides,
  } as Port;
}

// ---------------------------------------------------------------------------
// ensureList
// ---------------------------------------------------------------------------

describe('ensureList', () => {
  it('returns the given list unchanged when defined', () => {
    const el = { list: [], size: 3 };
    expect(ensureList(el)).toBe(el);
  });
  it('returns a fresh empty list when undefined', () => {
    const el = ensureList(undefined);
    expect(el).toEqual({ list: [], size: 0 });
  });
});

// ---------------------------------------------------------------------------
// elistAppend / zapinlist
// ---------------------------------------------------------------------------

describe('elistAppend / zapinlist', () => {
  it('appends increasing size, and zapinlist swap-removes a found entry', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2), d = mkNode(g, 3);
    const e1 = new Edge(a, b, ''); const e2 = new Edge(a, c, ''); const e3 = new Edge(a, d, '');
    const el = { list: [], size: 0 };
    elistAppend(el, e1); elistAppend(el, e2); elistAppend(el, e3);
    expect(el.size).toBe(3);
    zapinlist(el, e2); // middle entry: swapped with last
    expect(el.size).toBe(2);
    expect(el.list.slice(0, 2)).toEqual([e1, e3]);
  });
  it('zapinlist leaves the list unchanged when the edge is not present', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e1 = new Edge(a, b, ''); const notIn = new Edge(a, c, '');
    const el = { list: [], size: 0 };
    elistAppend(el, e1);
    zapinlist(el, notIn);
    expect(el.size).toBe(1);
    expect(el.list[0]).toBe(e1);
  });
});

// ---------------------------------------------------------------------------
// deleteFastEdge / fastEdge
// ---------------------------------------------------------------------------

describe('deleteFastEdge', () => {
  it('does nothing when neither tail.out nor head.in is set', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    expect(() => deleteFastEdge(e)).not.toThrow();
    expect(a.info.out).toBeUndefined();
  });
  it('removes the edge from both tail.out and head.in when present', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    fastEdge(e);
    expect(a.info.out!.size).toBe(1);
    expect(b.info.in!.size).toBe(1);
    deleteFastEdge(e);
    expect(a.info.out!.size).toBe(0);
    expect(b.info.in!.size).toBe(0);
  });
});

describe('fastEdge', () => {
  it('creates out/in lists on first use and reuses them on the second edge', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e1 = new Edge(a, b, ''); const e2 = new Edge(a, c, '');
    fastEdge(e1);
    const out1 = a.info.out;
    fastEdge(e2); // a.info.out already set -> reused, not recreated
    expect(a.info.out).toBe(out1);
    expect(a.info.out!.size).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// findFastEdge
// ---------------------------------------------------------------------------

describe('findFastEdge', () => {
  it('returns undefined when u has no out-list', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    b.info.in = { list: [], size: 0 };
    expect(findFastEdge(a, b)).toBeUndefined();
  });
  it('returns undefined when v has no in-list', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    a.info.out = { list: [], size: 0 };
    expect(findFastEdge(a, b)).toBeUndefined();
  });
  it('searches the smaller out-list when uOut.size <= vIn.size, finding a match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    const e = new Edge(a, b, '');
    fastEdge(e);
    fastEdge(new Edge(other, b, '')); // grows b.info.in beyond a.info.out
    expect(findFastEdge(a, b)).toBe(e);
  });
  it('skips non-matching heads in the out-list before finding the match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other1 = mkNode(g, 2), other2 = mkNode(g, 3);
    fastEdge(new Edge(a, other1, ''));
    const match = new Edge(a, b, '');
    fastEdge(match);
    fastEdge(new Edge(other2, b, '')); // keep b.info.in >= a.info.out so the out-list is searched
    expect(findFastEdge(a, b)).toBe(match);
  });
  it('searches the smaller in-list when vIn.size < uOut.size, finding a match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    const e = new Edge(a, b, '');
    fastEdge(e);
    fastEdge(new Edge(a, other, '')); // grows a.info.out beyond b.info.in
    expect(findFastEdge(a, b)).toBe(e);
  });
  it('skips non-matching tails in the in-list before finding the match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other1 = mkNode(g, 2), other2 = mkNode(g, 3), other3 = mkNode(g, 4);
    fastEdge(new Edge(other1, b, '')); // b.info.in[0]: non-matching tail
    const match = new Edge(a, b, '');
    fastEdge(match); // b.info.in[1]: matches
    fastEdge(new Edge(a, other2, '')); // grow a.info.out so uOut.size > vIn.size
    fastEdge(new Edge(a, other3, ''));
    expect(findFastEdge(a, b)).toBe(match);
  });
  it('returns undefined when both lists are populated but no edge connects them', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    fastEdge(new Edge(a, other, ''));
    fastEdge(new Edge(other, b, ''));
    expect(findFastEdge(a, b)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// copyPort / copyVirtualPorts / copyVirtualEdgeInfo / newVirtualEdge / virtualEdge
// ---------------------------------------------------------------------------

describe('copyPort', () => {
  it('deep-copies a null-bp port', () => {
    const p = mkPort({ p: { x: 1, y: 2 }, theta: 0.5 });
    const copy = copyPort(p);
    expect(copy).toEqual(p);
    expect(copy).not.toBe(p);
  });
  it('deep-copies a port with a bounding box', () => {
    const p = mkPort({ bp: { ll: { x: 0, y: 0 }, ur: { x: 3, y: 4 } } });
    const copy = copyPort(p);
    expect(copy.bp).toEqual(p.bp);
    expect(copy.bp).not.toBe(p.bp);
  });
});

describe('copyVirtualPorts', () => {
  it('copies orig.tail_port to e.tail_port when e.tail===orig.tail (forward)', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.tail_port = mkPort({ theta: 1 });
    orig.info.head_port = mkPort({ theta: 2 });
    const e = new Edge(a, v, '');
    copyVirtualPorts(e, orig);
    expect(e.info.tail_port!.theta).toBe(1);
  });
  it('copies orig.head_port to e.tail_port when e.tail===orig.head (reversed)', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.tail_port = mkPort({ theta: 1 });
    orig.info.head_port = mkPort({ theta: 2 });
    const e = new Edge(b, v, ''); // e.tail === orig.head
    const originalHeadPort = e.info.head_port; // e.head !== orig.head or orig.tail
    copyVirtualPorts(e, orig);
    expect(e.info.tail_port!.theta).toBe(2);
    expect(e.info.head_port).toBe(originalHeadPort); // untouched, no branch matched
  });
  it('leaves tail_port at its pre-existing default when e.tail matches neither orig endpoint', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), x = mkNode(g, 2), y = mkNode(g, 3);
    const orig = new Edge(a, b, '');
    orig.info.tail_port = mkPort({ theta: 9 });
    const e = new Edge(x, y, '');
    const originalTailPort = e.info.tail_port;
    copyVirtualPorts(e, orig);
    expect(e.info.tail_port).toBe(originalTailPort); // untouched, no branch matched
  });
  it('copies orig.tail_port to e.head_port when e.head===orig.tail', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.tail_port = mkPort({ theta: 3 });
    const e = new Edge(v, a, ''); // e.head === orig.tail
    copyVirtualPorts(e, orig);
    expect(e.info.head_port!.theta).toBe(3);
  });
  it('copies orig.head_port to e.head_port when e.head===orig.head (forward)', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.head_port = mkPort({ theta: 4 });
    const e = new Edge(v, b, ''); // e.head === orig.head
    copyVirtualPorts(e, orig);
    expect(e.info.head_port!.theta).toBe(4);
  });
});

describe('copyVirtualEdgeInfo', () => {
  it('sets orig.to_virt when previously unset, and always sets e.to_orig', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.weight = 5;
    orig.seq = 42;
    const e = new Edge(a, v, '');
    copyVirtualEdgeInfo(e, orig);
    expect(orig.info.to_virt).toBe(e);
    expect(e.info.to_orig).toBe(orig);
    expect(e.info.weight).toBe(5);
    expect(e.seq).toBe(42);
  });
  it('does not overwrite an already-set orig.to_virt', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v1 = mkNode(g, 2), v2 = mkNode(g, 3);
    const orig = new Edge(a, b, '');
    const firstVirt = new Edge(a, v1, '');
    orig.info.to_virt = firstVirt;
    const e = new Edge(a, v2, '');
    copyVirtualEdgeInfo(e, orig);
    expect(orig.info.to_virt).toBe(firstVirt);
    expect(e.info.to_orig).toBe(orig);
  });
});

describe('newVirtualEdge', () => {
  it('copies fields from orig when provided', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    orig.info.weight = 7; orig.info.minlen = 2;
    const e = newVirtualEdge(a, v, orig);
    expect(e.info.edge_type).toBe(VIRTUAL);
    expect(e.info.weight).toBe(7);
    expect(e.info.minlen).toBe(2);
  });
  it('defaults weight/xpenalty/count/minlen to 1 when orig is null', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), v = mkNode(g, 1);
    const e = newVirtualEdge(a, v, null);
    expect(e.info.weight).toBe(1);
    expect(e.info.xpenalty).toBe(1);
    expect(e.info.count).toBe(1);
    expect(e.info.minlen).toBe(1);
  });
});

describe('virtualEdge', () => {
  it('creates and registers a virtual edge in the fast graph', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), v = mkNode(g, 2);
    const orig = new Edge(a, b, '');
    const e = virtualEdge(a, v, orig);
    expect(a.info.out!.list).toContain(e);
    expect(v.info.in!.list).toContain(e);
  });
});

// ---------------------------------------------------------------------------
// mergeWeightsInto / basicMerge / mergeOneway
// ---------------------------------------------------------------------------

describe('mergeWeightsInto', () => {
  it('accumulates onto existing values', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const f = new Edge(a, b, '');
    f.info.weight = 2; f.info.minlen = 1; f.info.count = 1; f.info.xpenalty = 3;
    mergeWeightsInto(f, 5, 4, 6);
    expect(f.info.weight).toBe(7);
    expect(f.info.minlen).toBe(4); // max(1,4)
    expect(f.info.count).toBe(2);
    expect(f.info.xpenalty).toBe(9);
  });
  it('defaults unset weight/minlen/count/xpenalty (0/1/1/0) before accumulating', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const f = new Edge(a, b, '');
    mergeWeightsInto(f, 1, 0, 1);
    expect(f.info.weight).toBe(1);
    expect(f.info.minlen).toBe(1); // max(1,0)
    expect(f.info.count).toBe(2);
    expect(f.info.xpenalty).toBe(1);
  });
});

describe('basicMerge', () => {
  it('applies e\'s weights to rep only when rep has no to_virt chain', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e = new Edge(a, b, ''); e.info.weight = 3; e.info.minlen = 1; e.info.xpenalty = 0;
    const rep = new Edge(a, c, ''); rep.info.weight = 1;
    basicMerge(e, rep);
    expect(rep.info.weight).toBe(4);
  });
  it('defaults e\'s unset weight/minlen/xpenalty to 1/1/0 before merging', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e = new Edge(a, b, ''); // weight/minlen/xpenalty all left unset
    const rep = new Edge(a, c, ''); rep.info.weight = 1;
    basicMerge(e, rep);
    expect(rep.info.weight).toBe(2); // 1 (rep) + 1 (e ?? fallback)
    expect(rep.info.minlen).toBe(1); // max(1 ?? 1, 1 ?? 1)
    expect(rep.info.xpenalty).toBe(0); // 0 + (0 ?? 0)
  });
  it('walks the to_virt chain, applying to every representative in it', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2), d = mkNode(g, 3);
    const e = new Edge(a, b, ''); e.info.weight = 1; e.info.minlen = 1; e.info.xpenalty = 0;
    const rep1 = new Edge(a, c, ''); rep1.info.weight = 1;
    const rep2 = new Edge(a, d, ''); rep2.info.weight = 1;
    rep1.info.to_virt = rep2;
    basicMerge(e, rep1);
    expect(rep1.info.weight).toBe(2);
    expect(rep2.info.weight).toBe(2);
  });
});

describe('mergeOneway', () => {
  it('sets to_virt and merges weights when e has no to_virt yet', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e = new Edge(a, b, ''); e.info.weight = 2; e.info.minlen = 1; e.info.xpenalty = 0;
    const rep = new Edge(a, c, ''); rep.info.weight = 1;
    mergeOneway(e, rep);
    expect(e.info.to_virt).toBe(rep);
    expect(rep.info.weight).toBe(3);
  });
  it('does nothing (early return) when e.to_virt is already set', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2), d = mkNode(g, 3);
    const e = new Edge(a, b, '');
    const already = new Edge(a, d, '');
    e.info.to_virt = already;
    const rep = new Edge(a, c, ''); rep.info.weight = 1;
    mergeOneway(e, rep);
    expect(e.info.to_virt).toBe(already); // unchanged
    expect(rep.info.weight).toBe(1); // untouched
  });
});

// ---------------------------------------------------------------------------
// deleteFlatEdge / flatEdge / findFlatEdge
// ---------------------------------------------------------------------------

describe('deleteFlatEdge', () => {
  it('clears to_virt and no-ops the list removal when flat lists are unset', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    e.info.to_virt = new Edge(a, b, '');
    expect(() => deleteFlatEdge(e)).not.toThrow();
    expect(e.info.to_virt).toBeUndefined();
  });
  it('removes the edge from both tail.flat_out and head.flat_in when present', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    flatEdge(g, e);
    expect(a.info.flat_out!.size).toBe(1);
    deleteFlatEdge(e);
    expect(a.info.flat_out!.size).toBe(0);
    expect(b.info.flat_in!.size).toBe(0);
  });
});

describe('flatEdge', () => {
  it('creates flat_out/flat_in on first use, reuses on the second, and marks has_flat_edges', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    expect(g.info.has_flat_edges).toBeFalsy();
    flatEdge(g, new Edge(a, b, ''));
    const out1 = a.info.flat_out;
    flatEdge(g, new Edge(a, c, ''));
    expect(a.info.flat_out).toBe(out1);
    expect(a.info.flat_out!.size).toBe(2);
    expect(g.info.has_flat_edges).toBe(true);
  });
});

describe('findFlatEdge', () => {
  it('returns undefined when u has no flat_out', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    b.info.flat_in = { list: [], size: 0 };
    expect(findFlatEdge(a, b)).toBeUndefined();
  });
  it('returns undefined when v has no flat_in', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    a.info.flat_out = { list: [], size: 0 };
    expect(findFlatEdge(a, b)).toBeUndefined();
  });
  it('searches the smaller out-list (uOut.size <= vIn.size), finding a match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    const e = new Edge(a, b, '');
    flatEdge(g, e);
    flatEdge(g, new Edge(other, b, ''));
    expect(findFlatEdge(a, b)).toBe(e);
  });
  it('skips non-matching heads in the out-list before finding the match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other1 = mkNode(g, 2), other2 = mkNode(g, 3);
    flatEdge(g, new Edge(a, other1, ''));
    const match = new Edge(a, b, '');
    flatEdge(g, match);
    flatEdge(g, new Edge(other2, b, ''));
    expect(findFlatEdge(a, b)).toBe(match);
  });
  it('searches the smaller in-list when vIn.size < uOut.size, finding a match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    const e = new Edge(a, b, '');
    flatEdge(g, e);
    flatEdge(g, new Edge(a, other, ''));
    expect(findFlatEdge(a, b)).toBe(e);
  });
  it('skips non-matching tails in the in-list before finding the match', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other1 = mkNode(g, 2), other2 = mkNode(g, 3), other3 = mkNode(g, 4);
    flatEdge(g, new Edge(other1, b, '')); // b.info.flat_in[0]: non-matching tail
    const match = new Edge(a, b, '');
    flatEdge(g, match); // b.info.flat_in[1]: matches
    flatEdge(g, new Edge(a, other2, '')); // grow a.info.flat_out beyond b.info.flat_in
    flatEdge(g, new Edge(a, other3, ''));
    expect(findFlatEdge(a, b)).toBe(match);
  });
  it('returns undefined when both lists are populated but no edge connects them', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), other = mkNode(g, 2);
    flatEdge(g, new Edge(a, other, ''));
    flatEdge(g, new Edge(other, b, ''));
    expect(findFlatEdge(a, b)).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// reverseEdge
// ---------------------------------------------------------------------------

describe('reverseEdge', () => {
  it('merges into an existing opposite-direction fast edge when one exists', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, ''); e.info.weight = 1; e.info.minlen = 1; e.info.xpenalty = 0;
    fastEdge(e);
    const existing = new Edge(b, a, ''); existing.info.weight = 1;
    fastEdge(existing);
    reverseEdge(e);
    expect(e.info.reversed).toBe(true);
    expect(e.info.to_virt).toBe(existing);
    expect(a.info.out!.size).toBe(0); // deleteFastEdge removed e
  });
  it('creates a new virtual reverse edge when no opposite edge exists', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    fastEdge(e);
    reverseEdge(e);
    expect(e.info.reversed).toBe(true);
    expect(b.info.out!.size).toBe(1); // new virtual edge b->a registered
    expect(b.info.out!.list[0].head).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// fastNode / deleteFastNode
// ---------------------------------------------------------------------------

describe('fastNode', () => {
  it('prepends to an empty nlist', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    fastNode(g, a);
    expect(g.info.nlist).toBe(a);
    expect(a.info.prev).toBeUndefined();
  });
  it('prepends and links prev on a non-empty nlist', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    fastNode(g, a);
    fastNode(g, b);
    expect(g.info.nlist).toBe(b);
    expect(b.info.next).toBe(a);
    expect(a.info.prev).toBe(b);
  });
});

describe('deleteFastNode', () => {
  it('unlinks a middle node, restitching prev/next', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    fastNode(g, a); fastNode(g, b); fastNode(g, c); // nlist: c -> b -> a
    deleteFastNode(g, b);
    expect(c.info.next).toBe(a);
    expect(a.info.prev).toBe(c);
  });
  it('unlinks the head node (no prev), updating g.info.nlist', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    fastNode(g, a); fastNode(g, b); // nlist: b -> a
    deleteFastNode(g, b);
    expect(g.info.nlist).toBe(a);
    expect(a.info.prev).toBeUndefined();
  });
  it('unlinks the tail node (no next)', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    fastNode(g, a); fastNode(g, b); // nlist: b -> a (a is tail, no next)
    deleteFastNode(g, a);
    expect(b.info.next).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// removeFromRank
// ---------------------------------------------------------------------------

describe('removeFromRank', () => {
  it('does nothing when g.info.rank is undefined', () => {
    const g = mkGraph();
    const a = mkNode(g, 0);
    a.info.rank = 0;
    expect(() => removeFromRank(g, a)).not.toThrow();
  });
  it('defaults to rank 0 when n.info.rank is unset, and shifts later entries down', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const rk = { n: 3, v: [a, b, c], an: 3, av: [], ht1: 0, ht2: 0, pht1: 0, pht2: 0, candidate: false, valid: false, cache_nc: 0 };
    g.info.rank = [rk];
    removeFromRank(g, a); // a.info.rank unset -> defaults to 0
    expect(rk.n).toBe(2);
    expect(rk.v[0]).toBe(b);
    expect(rk.v[1]).toBe(c);
  });
  it('leaves the rank entry unchanged when the node is not found in it', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), notIn = mkNode(g, 2);
    a.info.rank = 0;
    const rk = { n: 2, v: [a, b], an: 2, av: [], ht1: 0, ht2: 0, pht1: 0, pht2: 0, candidate: false, valid: false, cache_nc: 0 };
    g.info.rank = [rk];
    removeFromRank(g, notIn);
    expect(rk.n).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// virtualNode / otherEdge
// ---------------------------------------------------------------------------

describe('virtualNode', () => {
  it('allocates a VIRTUAL node bound to g.root and registers it in the fast graph', () => {
    const root = mkGraph();
    const n = virtualNode(root);
    expect(n.info.node_type).toBe(VIRTUAL);
    expect(n.root).toBe(root.root);
    expect(n.info.lw).toBe(1);
    expect(n.info.rw).toBe(1);
    expect(n.info.ht).toBe(1);
    expect(root.info.nlist).toBe(n);
  });
});

describe('otherEdge', () => {
  it('creates tail.info.other on first use', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1);
    const e = new Edge(a, b, '');
    otherEdge(e);
    expect(a.info.other!.size).toBe(1);
    expect(a.info.other!.list[0]).toBe(e);
  });
  it('reuses tail.info.other on the second call', () => {
    const g = mkGraph();
    const a = mkNode(g, 0), b = mkNode(g, 1), c = mkNode(g, 2);
    const e1 = new Edge(a, b, ''); const e2 = new Edge(a, c, '');
    otherEdge(e1);
    const other1 = a.info.other;
    otherEdge(e2);
    expect(a.info.other).toBe(other1);
    expect(a.info.other!.size).toBe(2);
  });
});
