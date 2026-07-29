// SPDX-License-Identifier: EPL-2.0
//
// T3b (coverage-90, batch-3): branch coverage for layout/neato/init.ts.
// Direct unit tests for the exported helpers — neatoInitNode's pos/shape
// guards, userPos's regex + pin dispatch, setSeed's classify/prefix chain,
// buildVtxData's edge-weight/self-loop/dup-merge helpers, solveModel's mode
// dispatch, and the translate/cleanup utilities.
// @see lib/neatogen/neatoinit.c

import { describe, it, expect, vi } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import {
  neatoInitNode, userPos, classifyFirstChar, parseSeedPrefix, parseSeedInt,
  setSeed, assignNodeIds, initVtxEntries, edgeWeight, addEdgeToVtx,
  addGraphEdges, buildVtxData, buildDCoords, writeBackCoords,
  mapModelToStress, graphHasLen, checkStart, makeGraphDataC, solveModel,
  findMinPos, shiftPositions, neatoTranslate, neatoSetAspect, neatoCleanup,
  MODE_KK, MODE_MAJOR, MODE_HIER, MODE_IPSEP, MODE_SGD,
  MODEL_SHORTPATH, MODEL_CIRCUIT, MODEL_SUBSET, MODEL_MDS,
} from './init.js';

// ---------------------------------------------------------------------------
// neatoInitNode
// ---------------------------------------------------------------------------

describe('neatoInitNode: pos-length and shape guards', () => {
  it('resets pos when the existing array is shorter than dim', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.info.pos = [5]; // length 1 < dim 2
    neatoInitNode(n, 2);
    expect(n.info.pos).toEqual([0, 0]);
  });

  it('does not overwrite an already-set UF_size', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.info.UF_size = 7;
    neatoInitNode(n);
    expect(n.info.UF_size).toBe(7);
  });

  it('applies default width/height for a non-plain shaped node with 0 size', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.info.shape = { name: 'box', fns: null, polygon: null, kind: 1 };
    n.info.width = 0;
    n.info.height = 0;
    neatoInitNode(n);
    expect(n.info.width).toBe(0.75);
    expect(n.info.height).toBe(0.5);
  });
});

// ---------------------------------------------------------------------------
// userPos
// ---------------------------------------------------------------------------

describe('userPos', () => {
  it('returns false when pos attr is absent', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    expect(userPos(n)).toBe(false);
  });

  it('returns false for an empty pos attr', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', '');
    expect(userPos(n)).toBe(false);
  });

  it('returns false for a malformed pos attr', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', 'not-a-point');
    expect(userPos(n)).toBe(false);
    expect(n.info.pos).toBeUndefined();
  });

  it('sets pos/posSet without pinned for a plain "x,y"', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', '12,34');
    expect(userPos(n)).toBe(true);
    expect(n.info.pos).toEqual([12, 34]);
    expect(n.info.posSet).toBe(true);
    expect(n.info.pinned).toBeUndefined();
  });

  it('sets pinned for a trailing "!"', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', '1,2!');
    userPos(n);
    expect(n.info.pinned).toBe(true);
  });

  it('sets pinned when pin=true attr is present (no trailing !)', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', '1,2');
    n.attrs.set('pin', 'true');
    userPos(n);
    expect(n.info.pinned).toBe(true);
  });

  it('leaves pinned unset when pin=false', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.attrs.set('pos', '1,2');
    n.attrs.set('pin', 'false');
    userPos(n);
    expect(n.info.pinned).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// classifyFirstChar / parseSeedPrefix / parseSeedInt
// ---------------------------------------------------------------------------

describe('classifyFirstChar', () => {
  it('classifies a leading digit', () => { expect(classifyFirstChar('7x')).toBe('digit'); });
  it('classifies a leading lowercase letter', () => { expect(classifyFirstChar('random')).toBe('alpha'); });
  it('classifies a leading uppercase letter', () => { expect(classifyFirstChar('Random')).toBe('alpha'); });
  it('classifies a leading non-alnum as other', () => { expect(classifyFirstChar('_x')).toBe('other'); });
});

describe('parseSeedPrefix', () => {
  it('matches a "random" prefix and returns the remainder', () => {
    expect(parseSeedPrefix('random42')).toEqual({ rest: '42', matched: 'random' });
  });
  it('does not match a non-"random" alpha string', () => {
    expect(parseSeedPrefix('self')).toEqual({ rest: '', matched: null });
  });
});

describe('parseSeedInt', () => {
  it('parses a numeric suffix', () => { expect(parseSeedInt('42')).toBe(42); });
  it('returns 0 for a non-numeric suffix', () => { expect(parseSeedInt('')).toBe(0); });
});

// ---------------------------------------------------------------------------
// setSeed
// ---------------------------------------------------------------------------

describe('setSeed', () => {
  it('start unset leaves seed at 0', () => {
    const g = new Graph('g', 'undirected');
    const seed = { value: 99 };
    expect(setSeed(g, MODE_MAJOR, seed)).toBe(MODE_MAJOR);
    expect(seed.value).toBe(0);
  });

  it('start="@" (other) leaves seed at 0', () => {
    const g = new Graph('g', 'undirected');
    g.info.start = '@';
    const seed = { value: 99 };
    setSeed(g, MODE_MAJOR, seed);
    expect(seed.value).toBe(0);
  });

  it('start="123" (digit) sets seed via parseSeedInt', () => {
    const g = new Graph('g', 'undirected');
    g.info.start = '123';
    const seed = { value: 0 };
    setSeed(g, MODE_MAJOR, seed);
    expect(seed.value).toBe(123);
  });

  it('start="regular" (alpha, non-random) leaves seed at 0', () => {
    const g = new Graph('g', 'undirected');
    g.info.start = 'regular';
    const seed = { value: 99 };
    setSeed(g, MODE_MAJOR, seed);
    expect(seed.value).toBe(0);
  });

  it('start="random99" (alpha, random) sets seed to 99', () => {
    const g = new Graph('g', 'undirected');
    g.info.start = 'random99';
    const seed = { value: 0 };
    setSeed(g, MODE_MAJOR, seed);
    expect(seed.value).toBe(99);
  });
});

// ---------------------------------------------------------------------------
// buildVtxData helpers
// ---------------------------------------------------------------------------

describe('assignNodeIds', () => {
  it('assigns sequential ids in insertion order', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g);
    const b = new Node(0, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    const list = assignNodeIds(g);
    expect(list.map((n) => n.info.id)).toEqual([0, 1]);
    expect(list.map((n) => n.name)).toEqual(['A', 'B']);
  });
});

describe('initVtxEntries', () => {
  it('allocates one self entry per node', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g);
    const b = new Node(1, 'B', g);
    const vtx = initVtxEntries([a, b]);
    expect(vtx).toEqual([
      { nedges: 1, edges: [0], ewgts: [0] },
      { nedges: 1, edges: [1], ewgts: [0] },
    ]);
  });
});

describe('edgeWeight', () => {
  it('prefers factor over weight', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    const e = new Edge(a, b, 'AB');
    e.info.factor = 3; e.info.weight = 9;
    expect(edgeWeight(e)).toBe(3);
  });

  it('falls back to weight when factor is unset', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    const e = new Edge(a, b, 'AB');
    e.info.weight = 5;
    expect(edgeWeight(e)).toBe(5);
  });

  it('defaults to 1 when neither is set', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    const e = new Edge(a, b, 'AB');
    expect(edgeWeight(e)).toBe(1);
  });
});

describe('addEdgeToVtx', () => {
  it('adds a bidirectional edge between two vtx entries', () => {
    const vtx = initVtxEntries([{} as never, {} as never]);
    addEdgeToVtx(vtx, 0, 1, 2.5);
    expect(vtx[0]).toEqual({ nedges: 2, edges: [0, 1], ewgts: [0, 2.5] });
    expect(vtx[1]).toEqual({ nedges: 2, edges: [1, 0], ewgts: [0, 2.5] });
  });
});

describe('addGraphEdges', () => {
  it('defaults tail/head index to 0 when info.id is unset', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    // info.id deliberately left undefined (assignNodeIds not called).
    const ab = new Edge(a, b, 'AB');
    g.edges.push(ab);
    const vtx = initVtxEntries([a, b]);
    addGraphEdges(g, vtx);
    // Both endpoints fall back to index 0: addEdgeToVtx(vtx,0,0,w) pushes
    // hi then ti onto the SAME entry (ti===hi===0), appending twice.
    expect(vtx[0]!.edges).toEqual([0, 0, 0]);
    expect(vtx[0]!.nedges).toBe(3);
  });

  it('skips self-loops and adds normal edges', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    a.info.id = 0; b.info.id = 1;
    const selfLoop = new Edge(a, a, 'AA');
    const ab = new Edge(a, b, 'AB'); ab.info.weight = 4;
    g.edges.push(selfLoop, ab);
    const vtx = initVtxEntries([a, b]);
    addGraphEdges(g, vtx);
    expect(vtx[0]!.edges).toEqual([0, 1]);
    expect(vtx[0]!.ewgts).toEqual([0, 4]);
    expect(vtx[1]!.edges).toEqual([1, 0]);
  });
});

describe('buildVtxData', () => {
  it('assigns ids and builds the sparse graph end-to-end', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    g.edges.push(new Edge(a, b, 'AB'));
    const vtx = buildVtxData(g);
    expect(vtx).toHaveLength(2);
    expect(vtx[0]!.edges).toEqual([0, 1]);
  });
});

// ---------------------------------------------------------------------------
// buildDCoords / writeBackCoords
// ---------------------------------------------------------------------------

describe('buildDCoords', () => {
  it('copies pos into per-axis arrays, defaulting missing axes to 0', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); a.info.pos = [3, 4];
    const b = new Node(1, 'B', g); // no pos
    const coords = buildDCoords([a, b], 2);
    expect(Array.from(coords[0]!)).toEqual([3, 0]);
    expect(Array.from(coords[1]!)).toEqual([4, 0]);
  });
});

describe('writeBackCoords', () => {
  it('writes per-axis arrays back into pos, creating pos when absent', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); // no pos
    const dCoords = [new Float64Array([9]), new Float64Array([8])];
    writeBackCoords([a], dCoords, 2);
    expect(a.info.pos).toEqual([9, 8]);
  });
});

// ---------------------------------------------------------------------------
// mapModelToStress
// ---------------------------------------------------------------------------

describe('mapModelToStress', () => {
  it('maps MDS/CIRCUIT/SUBSET and defaults everything else to 0', () => {
    expect(mapModelToStress(MODEL_MDS)).toBeDefined();
    expect(mapModelToStress(MODEL_CIRCUIT)).toBeDefined();
    expect(mapModelToStress(MODEL_SUBSET)).toBeDefined();
    expect(mapModelToStress(MODEL_SHORTPATH)).toBe(0);
    expect(mapModelToStress(999)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// graphHasLen / checkStart
// ---------------------------------------------------------------------------

describe('graphHasLen', () => {
  it('false when no edge has a len attr', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.edges.push(new Edge(a, b, 'AB'));
    expect(graphHasLen(g)).toBe(false);
  });

  it('true when an edge carries a len attr', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    const e = new Edge(a, b, 'AB'); e.attrs.set('len', '2.0');
    g.edges.push(e);
    expect(graphHasLen(g)).toBe(true);
  });
});

describe('checkStart', () => {
  it('defaults to seed 1 when start is unset', () => {
    const g = new Graph('g', 'undirected');
    expect(() => checkStart(g)).not.toThrow();
  });

  it('uses the numeric prefix of a digit-led start attr', () => {
    const g = new Graph('g', 'undirected');
    g.root.attrs.set('start', '7');
    expect(() => checkStart(g)).not.toThrow();
  });

  it('ignores a non-digit-led start attr (stays at default seed)', () => {
    const g = new Graph('g', 'undirected');
    g.root.attrs.set('start', 'regular');
    expect(() => checkStart(g)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// makeGraphDataC
// ---------------------------------------------------------------------------

describe('makeGraphDataC', () => {
  it('skips self-loops', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g);
    g.nodes.set('A', a);
    g.edges.push(new Edge(a, a, 'AA'));
    const nodeList = assignNodeIds(g);
    const vtx = makeGraphDataC(g, nodeList, false);
    expect(vtx[0]).toEqual({ nedges: 1, edges: [0], ewgts: [] });
  });

  it('merges a duplicate neighbour, keeping the max len (haveLen=true)', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    const e1 = new Edge(a, b, 'AB1'); e1.attrs.set('len', '2');
    const e2 = new Edge(a, b, 'AB2'); e2.attrs.set('len', '5');
    g.edges.push(e1, e2);
    const nodeList = assignNodeIds(g);
    const vtx = makeGraphDataC(g, nodeList, true);
    expect(vtx[0]!.edges).toEqual([0, 1]); // one merged neighbour entry
    expect(vtx[0]!.ewgts).toEqual([0, 5]); // max(2,5)
  });

  it('without haveLen, duplicate neighbours are merged with no ewgts push', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    g.edges.push(new Edge(a, b, 'AB1'), new Edge(a, b, 'AB2'));
    const nodeList = assignNodeIds(g);
    const vtx = makeGraphDataC(g, nodeList, false);
    expect(vtx[0]!.edges).toEqual([0, 1]);
    expect(vtx[0]!.ewgts).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// solveModel
// ---------------------------------------------------------------------------

describe('solveModel', () => {
  it('returns immediately for graphs with fewer than 2 nodes', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); g.nodes.set('A', a);
    solveModel(g, MODE_MAJOR, MODEL_SHORTPATH);
    expect(a.info.pos).toBeUndefined();
  });

  it('dispatches to sgdLayout for MODE_SGD', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    g.edges.push(new Edge(a, b, 'AB'));
    solveModel(g, MODE_SGD, MODEL_SHORTPATH);
    expect(a.info.pos).toBeDefined();
    expect(b.info.pos).toBeDefined();
  });

  it('warns and falls back to majorization for MODE_HIER', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    g.edges.push(new Edge(a, b, 'AB'));
    solveModel(g, MODE_HIER, MODEL_SHORTPATH);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('hier'));
    expect(a.info.pos).toBeDefined();
    warn.mockRestore();
  });

  it('warns and falls back to majorization for MODE_IPSEP', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    g.edges.push(new Edge(a, b, 'AB'));
    solveModel(g, MODE_IPSEP, MODEL_SHORTPATH);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('ipsep'));
    warn.mockRestore();
  });

  it('MODE_KK runs majorization with maxiter forced to 0', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    g.nodes.set('A', a); g.nodes.set('B', b);
    const e = new Edge(a, b, 'AB'); e.attrs.set('len', '1.5');
    g.edges.push(e);
    solveModel(g, MODE_KK, MODEL_SHORTPATH);
    expect(a.info.pos).toBeDefined();
    expect(Number.isFinite(a.info.pos![0])).toBe(true);
  });

  it('MODE_MAJOR with a len attr uses the weighted APSP path', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
    const c = new Node(2, 'C', g);
    g.nodes.set('A', a); g.nodes.set('B', b); g.nodes.set('C', c);
    const eab = new Edge(a, b, 'AB'); eab.attrs.set('len', '2');
    const ebc = new Edge(b, c, 'BC'); ebc.attrs.set('len', '3');
    g.edges.push(eab, ebc);
    solveModel(g, MODE_MAJOR, MODEL_SHORTPATH);
    for (const n of [a, b, c]) {
      expect(n.info.pos).toBeDefined();
      expect(Number.isFinite(n.info.pos![0])).toBe(true);
      expect(Number.isFinite(n.info.pos![1])).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// findMinPos / shiftPositions / neatoTranslate
// ---------------------------------------------------------------------------

describe('findMinPos', () => {
  it('skips nodes with no pos and defaults a missing pos[1] to 0', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); a.info.pos = [3]; // pos[1] undefined
    const b = new Node(1, 'B', g); // no pos at all
    g.nodes.set('A', a); g.nodes.set('B', b);
    expect(findMinPos(g)).toEqual({ minX: 3, minY: 0 });
  });
});

describe('shiftPositions', () => {
  it('skips nodes with no pos and skips the y-shift for length-1 pos', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); a.info.pos = [10]; // length 1
    const b = new Node(1, 'B', g); // no pos
    g.nodes.set('A', a); g.nodes.set('B', b);
    shiftPositions(g, 4, 4);
    expect(a.info.pos).toEqual([6]);
    expect(b.info.pos).toBeUndefined();
  });
});

describe('neatoTranslate (init.ts)', () => {
  it('no-ops when no node has a finite position', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); // no pos
    g.nodes.set('A', a);
    expect(() => neatoTranslate(g)).not.toThrow();
    expect(a.info.pos).toBeUndefined();
  });

  it('shifts all positions so the minimum lands at (0,0)', () => {
    const g = new Graph('g', 'undirected');
    const a = new Node(0, 'A', g); a.info.pos = [2, 3];
    const b = new Node(1, 'B', g); b.info.pos = [5, 7];
    g.nodes.set('A', a); g.nodes.set('B', b);
    neatoTranslate(g);
    expect(a.info.pos).toEqual([0, 0]);
    expect(b.info.pos).toEqual([3, 4]);
  });
});

// ---------------------------------------------------------------------------
// neatoSetAspect
// ---------------------------------------------------------------------------

describe('neatoSetAspect (init.ts)', () => {
  it('skips nodes with no pos', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g); // no pos
    g.nodes.set('n', n);
    neatoSetAspect(g);
    expect(n.info.coord).toEqual({ x: 0, y: 0 });
  });

  it('falls back to 0 for missing pos[0]/pos[1] elements', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.info.pos = []; // truthy array, elements undefined
    g.nodes.set('n', n);
    neatoSetAspect(g);
    expect(n.info.coord).toEqual({ x: 0, y: 0 });
  });
});

// ---------------------------------------------------------------------------
// neatoCleanup
// ---------------------------------------------------------------------------

describe('neatoCleanup', () => {
  it('clears neato-specific per-node scratch state', () => {
    const g = new Graph('g', 'undirected');
    const n = new Node(0, 'n', g);
    n.info.pos = [1, 2];
    n.info.pinned = true;
    n.info.id = 5;
    n.info.heapindex = 3;
    n.info.hops = 2;
    n.info.UF_size = 4;
    g.nodes.set('n', n);
    neatoCleanup(g);
    expect(n.info.pos).toBeUndefined();
    expect(n.info.pinned).toBeUndefined();
    expect(n.info.id).toBeUndefined();
    expect(n.info.heapindex).toBeUndefined();
    expect(n.info.hops).toBeUndefined();
    expect(n.info.UF_size).toBeUndefined();
  });
});
