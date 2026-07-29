// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/mincross-order.ts.
 *
 * Extends mincross-order.test.ts (do not duplicate its cases). Focused on:
 * (1) default-value ternary branches (order/mval/minrank/maxrank undefined),
 * (2) early-return guards (undefined rank/rootRank), (3) the previously
 * untested main-loop functions (reorder, mincrossStep, mincrossIter,
 * mincrossPassSetup, mincrossMain) which had zero direct coverage in this
 * file's own test suite.
 *
 * @see lib/dotgen/mincross.c
 */

import { describe, it, expect, afterEach } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { fastEdge } from './fastgr.js';
import { allocateRanks } from './mincross-build.js';
import {
  flatMvalIn, flatMvalOut,
  computeMedian, medians,
  saveBest, restoreBest,
  reorderFindRp, reorderInner, reorder,
  mincrossStepBounds, mincrossStep, mincrossIter, mincrossPassSetup, mincrossMain,
  setMincrossTrace,
} from './mincross-order.js';
import type { MincrossContext } from './mincross-utils.js';
import type { RankEntry } from '../../model/rankEntry.js';

// ---------------------------------------------------------------------------
// Test helpers (duplicated from mincross-order.test.ts per D1 file isolation)
// ---------------------------------------------------------------------------

function makeCtx(root: Graph): MincrossContext {
  return {
    root,
    globalMinRank: root.info.minrank ?? 0,
    globalMaxRank: root.info.maxrank ?? 0,
    teList: [],
    tiList: [],
    reMincross: false,
    minQuit: 8,
    maxIter: 24,
  };
}

function makeNode(g: Graph, id: number, name = `n${id}`): Node {
  const n = new Node(id, name, g);
  g.nodes.set(n.name, n);
  return n;
}

function makeRankEntry(nodes: Node[], n?: number): RankEntry {
  return {
    n: n ?? nodes.length,
    v: nodes,
    an: nodes.length,
    av: nodes,
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false,
    valid: false,
    cache_nc: 0,
  };
}

// ---------------------------------------------------------------------------
// computeMedian — unequal-span weighted-median branch (all existing tests
// use a tie, so the `lspan===rspan` false arm was never hit).
// ---------------------------------------------------------------------------

describe('computeMedian: unequal spans take the weighted-median branch', () => {
  it('computes (list[m-1]*rspan + list[m]*lspan)/(lspan+rspan)', () => {
    // sorted [0,10,10,30], m=2: lspan=10-0=10, rspan=30-10=20 (unequal).
    expect(computeMedian([0, 10, 10, 30])).toBe(10);
  });
});

// ---------------------------------------------------------------------------
// flatMvalIn — undefined-order ternary defaults + no-swap `if` branch
// ---------------------------------------------------------------------------

describe('flatMvalIn: undefined-order defaults produce no swap', () => {
  it('defaults both ord and nnOrd to 0 when tail.info.order is unset (0>0 is false)', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a'); // order left unset -> default 0
    const b = makeNode(g, 1, 'b'); // order left unset -> default 0
    const dummy = makeNode(g, 2, 'dummy');
    const e1 = new Edge(a, dummy, '');
    const e2 = new Edge(b, dummy, '');
    const target = makeNode(g, 3, 'target');
    const fi = { list: [e1, e2], size: 2 };
    const result = flatMvalIn(target, fi);
    // nn stays fi.list[0].tail === a (order default 0) since 0>0 is false.
    expect(result).toBe(true); // a.info.mval unset -> nnMval defaults to -1 -> true
  });
});

// ---------------------------------------------------------------------------
// flatMvalOut — loop body never executed by existing tests (fo.size was
// always 1); cover the swap (true) and no-swap/undefined-default (false)
// arms of the `if (ord < nnOrd)` at fo.size>=2.
// ---------------------------------------------------------------------------

describe('flatMvalOut: swap branch (ord<nnOrd true) at fo.size>=2', () => {
  it('replaces nn with the later edge head when its order is smaller', () => {
    const g = new Graph('g', 'directed');
    const dummy = makeNode(g, 0, 'dummy');
    const hi = makeNode(g, 1, 'hi'); hi.info.order = 5;
    const lo = makeNode(g, 2, 'lo'); lo.info.order = 2; lo.info.mval = 4;
    const e0 = new Edge(dummy, hi, '');
    const e1 = new Edge(dummy, lo, '');
    const target = makeNode(g, 3, 'target');
    const fo = { list: [e0, e1], size: 2 };
    const result = flatMvalOut(target, fo);
    // nn becomes lo (order 2 < 5) -> nnMval=4>0 -> mval=3, returns false.
    expect(result).toBe(false);
    expect(target.info.mval).toBe(3);
  });
});

describe('flatMvalOut: no-swap branch with undefined-order defaults', () => {
  it('defaults both ord and nnOrd to 0, leaving nn as list[0].head (0<0 false)', () => {
    const g = new Graph('g', 'directed');
    const dummy = makeNode(g, 0, 'dummy');
    const x = makeNode(g, 1, 'x'); // order unset -> default 0
    const y = makeNode(g, 2, 'y'); // order unset -> default 0
    const e0 = new Edge(dummy, x, '');
    const e1 = new Edge(dummy, y, '');
    const target = makeNode(g, 3, 'target');
    const fo = { list: [e0, e1], size: 2 };
    const result = flatMvalOut(target, fo);
    // nn stays x (mval unset) -> nnMval defaults to -1 -> not >0 -> true.
    expect(result).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// medians — gRank undefined guard + null-entry skip in both loops
// ---------------------------------------------------------------------------

describe('medians: g.info.rank undefined returns false without throwing', () => {
  it('short-circuits before touching any rank data', () => {
    const g = new Graph('g', 'directed');
    const rootG = new Graph('root', 'directed');
    const ctx = makeCtx(rootG);
    expect(medians(ctx, g, 0, 1)).toBe(false);
    expect(g.info.rank).toBeUndefined();
  });
});

describe('medians: null rank-slot entries are skipped in both loops', () => {
  it('skips a null v in loop 1 (mval reset) and loop 2 (flat_mval)', () => {
    const g = new Graph('g', 'directed');
    const real = makeNode(g, 0, 'real');
    real.info.rank = 0;
    const rk = makeRankEntry([null as unknown as Node, real], 2);
    g.info.rank = [rk];
    const rootG = new Graph('root', 'directed');
    const ctx = makeCtx(rootG);
    const hasfixed = medians(ctx, g, 0, 1);
    // real has no in/out edges -> loop2 calls flatMval(real) -> no flat
    // edges either -> returns true -> hasfixed becomes true.
    expect(hasfixed).toBe(true);
    expect(real.info.mval).toBe(-1); // loop1 unconditionally reset it
  });
});

// ---------------------------------------------------------------------------
// saveBest — rank-undefined guard, minrank/maxrank defaults, order default
// ---------------------------------------------------------------------------

describe('saveBest: g.info.rank undefined is a no-op', () => {
  it('returns without throwing and leaves rank undefined', () => {
    const g = new Graph('g', 'directed');
    saveBest(g);
    expect(g.info.rank).toBeUndefined();
  });
});

describe('saveBest: minrank/maxrank default to 0 when unset', () => {
  it('still saves the single rank-0 node when minrank/maxrank are undefined', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 7;
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    // g.info.minrank / g.info.maxrank left undefined
    saveBest(g);
    expect(a.info.coord.x).toBe(7);
  });
});

describe('saveBest: order defaults to 0 when unset', () => {
  it('writes coord.x = 0 - vStart for a node with no order', () => {
    const g = new Graph('g', 'directed');
    g.info.minrank = 0;
    g.info.maxrank = 0;
    const a = makeNode(g, 0, 'a'); // order left unset
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    saveBest(g);
    expect(a.info.coord.x).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// restoreRank — order-comparator undefined branch: UNREACHABLE BY DESIGN.
// restoreRank unconditionally assigns rk.v[vs+i].info.order = coord.x + vs
// for every i < rk.n immediately before the sort; the sort comparator's
// slice(vs, vs+rk.n) covers exactly that same index range, so every node the
// comparator sees already has a freshly-assigned numeric order. The `!==
// undefined` false arm on the comparator's two ternaries cannot be reached
// through any call to restoreRank(); it would require a slice node outside
// the just-written range, which the function's own indices preclude.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// restoreBest — rank/rootRank undefined guards + minrank/maxrank defaults
// ---------------------------------------------------------------------------

describe('restoreBest: g.info.rank undefined returns without calling restoreRank', () => {
  it('leaves the root rank untouched', () => {
    const g = new Graph('g', 'directed');
    const rootG = new Graph('root', 'directed');
    const rootRk = makeRankEntry([]);
    rootRk.valid = true;
    rootG.info.rank = [rootRk];
    rootG.info.minrank = 0; rootG.info.maxrank = 0;
    const ctx = makeCtx(rootG);
    restoreBest(ctx, g);
    expect(rootRk.valid).toBe(true);
  });
});

describe('restoreBest: ctx.root.info.rank undefined returns without calling restoreRank', () => {
  it('leaves the subgraph rank untouched', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 3; a.info.coord = { x: 9, y: 0 };
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    g.info.minrank = 0; g.info.maxrank = 0;
    const rootG = new Graph('root', 'directed'); // rootG.info.rank stays undefined
    const ctx = makeCtx(rootG);
    restoreBest(ctx, g);
    expect(a.info.order).toBe(3); // untouched
  });
});

describe('restoreBest: minrank/maxrank default to 0 when unset', () => {
  it('still restores the single rank when minrank/maxrank are undefined', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 1; a.info.coord = { x: 4, y: 0 };
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    const rootRk = makeRankEntry([a]);
    rootRk.valid = true;
    const rootG = new Graph('root', 'directed');
    rootG.info.rank = [rootRk];
    const ctx = makeCtx(rootG);
    // g.info.minrank / maxrank left undefined
    restoreBest(ctx, g);
    expect(a.info.order).toBe(4);
    expect(rootRk.valid).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderFindRp — sawclust `continue` branch (second clustered node after a
// non-returning clustered node is skipped without re-checking left2right)
// ---------------------------------------------------------------------------

describe('reorderFindRp: sawclust + clustered w continues past a second cluster node', () => {
  it('skips w2 (clust set, sawclust already true) and exhausts to ep', () => {
    const g = new Graph('g', 'directed'); // g.info.rank left undefined -> left2right always 0
    const lp = makeNode(g, 0, 'lp');
    const clustA = new Graph('clustA', 'directed');
    const w1 = makeNode(g, 1, 'w1'); w1.info.clust = clustA; // mval unset -> sawclust=true
    const clustB = new Graph('clustB', 'directed');
    const w2 = makeNode(g, 2, 'w2'); w2.info.clust = clustB; // skipped via `continue`
    const result = reorderFindRp(g, [lp, w1, w2], 0, 3);
    expect(result.rp).toBe(3); // ep: loop exhausted, w2 never matched
    expect(result.muststay).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// reorderInner — muststay=true skips the swap block; lp advancing to ep
// breaks before any rp search; a reverse-mode tie (p1===p2) still swaps.
// ---------------------------------------------------------------------------

describe('reorderInner: muststay=true (cluster constraint) skips the swap', () => {
  it('does not report a change when left2right forces muststay', () => {
    const g = new Graph('g', 'directed'); // g.info.rank undefined -> left2right skips to cluster check
    const clustA = new Graph('clustA', 'directed');
    const clustB = new Graph('clustB', 'directed');
    const a = makeNode(g, 0, 'a'); a.info.mval = 1; a.info.clust = clustA;
    const b = makeNode(g, 1, 'b'); b.info.mval = 0; b.info.clust = clustB;
    const changed = reorderInner({} as MincrossContext, g, [a, b], { start: 0, ep: 2 }, false);
    expect(changed).toBe(false);
  });
});

describe('reorderInner: lp advances to ep and breaks without a swap', () => {
  it('returns changed=false for a rank with no comparable node', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a'); // mval left unset -> reorderFindLp skips it to ep
    const changed = reorderInner({} as MincrossContext, g, [a], { start: 0, ep: 1 }, false);
    expect(changed).toBe(false);
  });
});

describe('reorderInner: reverse mode swaps on a tie (p1===p2)', () => {
  it('swaps a,b when mval is equal and reverse=true', () => {
    const g = new Graph('g', 'directed');
    const rootG = new Graph('root', 'directed');
    rootG.info.rank = [makeRankEntry([])];
    const ctx = makeCtx(rootG);
    const a = makeNode(g, 0, 'a'); a.info.rank = 0; a.info.order = 0; a.info.mval = 2;
    const b = makeNode(g, 1, 'b'); b.info.rank = 0; b.info.order = 1; b.info.mval = 2;
    rootG.info.rank[0].v = [a, b];
    const changed = reorderInner(ctx, g, [a, b], { start: 0, ep: 2 }, true);
    expect(changed).toBe(true);
    expect(a.info.order).toBe(1);
    expect(b.info.order).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// reorderInner — m1/m2 undefined defaults: UNREACHABLE BY DESIGN.
// reorderInner only ever reaches the p1/p2 comparison after internally
// calling reorderFindLp (which advances lp past any node whose mval is
// undefined or negative before returning) and reorderFindRp (which only
// returns muststay=false with rp<ep when the candidate's mval is defined
// and >=0). Both invariants are enforced by reorderInner's OWN call sites
// (lines 270, 272 in mincross-order.ts) on every path that reaches the
// comparison, so lpNode.info.mval and rpNode.info.mval are always defined
// there; the `!== undefined` false arm cannot be reached via reorderInner.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// reorder — rootRank/rk undefined guards, real swap (r>0 propagation),
// hasfixed=true (skip ep--), and vStart-defined window.
// ---------------------------------------------------------------------------

describe('reorder: ctx.root.info.rank undefined returns without reordering', () => {
  it('leaves node order untouched', () => {
    const rootG = new Graph('root', 'directed'); // rootG.info.rank left undefined
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 0;
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    const ctx = makeCtx(rootG);
    reorder(ctx, g, 0, false, false);
    expect(a.info.order).toBe(0);
  });
});

describe('reorder: g.info.rank undefined returns without reordering', () => {
  it('leaves the root rank entry untouched', () => {
    const rootG = new Graph('root', 'directed');
    const rootRk = makeRankEntry([]);
    rootRk.valid = true;
    rootG.info.rank = [rootRk];
    const g = new Graph('g', 'directed'); // g.info.rank left undefined
    const ctx = makeCtx(rootG);
    reorder(ctx, g, 0, false, false);
    expect(rootRk.valid).toBe(true);
  });
});

describe('reorder: real swap invalidates rootRank[r] and rootRank[r-1] (r>0)', () => {
  it('swaps a,b by mval and marks both adjacent ranks invalid', () => {
    const g = new Graph('g', 'directed'); // g === ctx.root (single component)
    const a = makeNode(g, 0, 'a'); a.info.rank = 1; a.info.order = 0; a.info.mval = 3;
    const b = makeNode(g, 1, 'b'); b.info.rank = 1; b.info.order = 1; b.info.mval = 1;
    const rk0 = makeRankEntry([]);
    rk0.valid = true;
    const rk1 = makeRankEntry([a, b]);
    g.info.rank = [rk0, rk1];
    const ctx = makeCtx(g);
    reorder(ctx, g, 1, false, false);
    expect(rk1.valid).toBe(false);
    expect(rk0.valid).toBe(false); // r>0 propagation
    expect(rk1.v[0]).toBe(b); // swapped: lower mval now first
    expect(rk1.v[1]).toBe(a);
  });
});

describe('reorder: hasfixed=true still completes and invalidates the rank', () => {
  it('reaches the same observable outcome via the hasfixed branch', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a'); a.info.rank = 0; a.info.order = 0; a.info.mval = 5;
    const b = makeNode(g, 1, 'b'); b.info.rank = 0; b.info.order = 1; b.info.mval = 2;
    const rk0 = makeRankEntry([a, b]);
    g.info.rank = [rk0];
    const ctx = makeCtx(g);
    reorder(ctx, g, 0, false, true);
    expect(rk0.valid).toBe(false);
    expect(rk0.v[0]).toBe(b);
  });
});

describe('reorder: honors a non-zero vStart window', () => {
  it('reorders only the windowed slice, leaving index 0 untouched', () => {
    const g = new Graph('g', 'directed');
    const placeholder = makeNode(g, 9, 'placeholder');
    const a = makeNode(g, 0, 'a'); a.info.rank = 0; a.info.order = 1; a.info.mval = 4;
    const b = makeNode(g, 1, 'b'); b.info.rank = 0; b.info.order = 2; b.info.mval = 1;
    const rk0 = makeRankEntry([placeholder, a, b]);
    rk0.vStart = 1;
    rk0.n = 2;
    g.info.rank = [rk0];
    const ctx = makeCtx(g);
    reorder(ctx, g, 0, false, false);
    expect(rk0.v[0]).toBe(placeholder); // outside the window, untouched
    expect(rk0.v[1]).toBe(b);
    expect(rk0.v[2]).toBe(a);
  });
});

// ---------------------------------------------------------------------------
// mincrossStepBounds — minrank/maxrank/rootMinRank/rootMaxRank all default
// to 0 when unset
// ---------------------------------------------------------------------------

describe('mincrossStepBounds: all four rank fields default to 0 when unset', () => {
  it('computes bounds from defaults for an even pass', () => {
    const root = new Graph('root', 'directed'); // minrank/maxrank left unset
    const g = new Graph('g', 'directed'); // minrank/maxrank left unset
    const ctx = makeCtx(root);
    const b = mincrossStepBounds(ctx, g, 0);
    // mn=0===rootMn=0 -> first=mn+1=1; last=mx=0; dir=1.
    expect(b.first).toBe(1);
    expect(b.last).toBe(0);
    expect(b.dir).toBe(1);
  });
});

describe('mincrossStepBounds: odd pass, mx<rootMx uses g.maxrank directly', () => {
  it('sets first=mx (not rootMx-1) when the subgraph ends before the root', () => {
    const root = new Graph('root', 'directed');
    root.info.minrank = 0; root.info.maxrank = 5;
    const g = new Graph('g', 'directed');
    g.info.minrank = 0; g.info.maxrank = 3;
    const ctx = makeCtx(root);
    const b = mincrossStepBounds(ctx, g, 1);
    expect(b.first).toBe(3);
    expect(b.dir).toBe(-1);
  });
});

// ---------------------------------------------------------------------------
// mincrossStep — direct call over a real two-rank, one-edge graph
// ---------------------------------------------------------------------------

function makeTwoRankChain(): { g: Graph; a: Node; b: Node; ctx: MincrossContext } {
  const g = new Graph('g', 'directed');
  const a = makeNode(g, 0, 'a');
  const b = makeNode(g, 1, 'b');
  a.info.rank = 0; b.info.rank = 1;
  a.info.order = 0; b.info.order = 0;
  const e = new Edge(a, b, '');
  fastEdge(e);
  g.info.minrank = 0; g.info.maxrank = 1;
  const rk0 = makeRankEntry([a]);
  const rk1 = makeRankEntry([b]);
  g.info.rank = [rk0, rk1];
  const ctx = makeCtx(g);
  return { g, a, b, ctx };
}

describe('mincrossStep: runs medians+reorder over the bounds then transposes', () => {
  it('completes without throwing on a real two-rank chain', () => {
    const { g, ctx, a } = makeTwoRankChain();
    mincrossStep(ctx, g, 0);
    // Single-node ranks: nothing to reorder, but medians must have run for
    // rank 1's node against rank 0 (loop1 always resets mval, per medians()).
    expect(a.info.mval).toBeUndefined(); // rank 0 not visited on an even pass
  });
});

// ---------------------------------------------------------------------------
// mincrossIter — trace hook (setMincrossTrace) + cur===0 immediate break
// ---------------------------------------------------------------------------

describe('mincrossIter: invokes the trace hook and stops at minQuit=0', () => {
  afterEach(() => setMincrossTrace(null));
  it('calls the trace function with the formatted iteration line', () => {
    const lines: string[] = [];
    setMincrossTrace((line) => lines.push(line));
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    ctx.minQuit = 0; // trying++ (0) >= 0 -> break right after the trace call
    const state = { cur: 5, best: 5 };
    mincrossIter(ctx, g, 4, state, 1);
    expect(lines).toHaveLength(1);
    expect(lines[0]).toBe('mincross: pass 1 iter 0 trying 0 cur_cross 5 best_cross 5');
  });
});

describe('mincrossIter: state.cur===0 breaks before calling mincrossStep', () => {
  it('leaves state.best untouched (mincrossStep never runs)', () => {
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    const state = { cur: 0, best: 999 };
    mincrossIter(ctx, g, 4, state, 0);
    expect(state.best).toBe(999);
    expect(state.cur).toBe(0);
  });
});

describe('mincrossIter: cur!==0 proceeds; cur>best skips saveBest', () => {
  it('recomputes cur via mincrossStep but leaves best unchanged', () => {
    const { g, ctx } = makeTwoRankChain();
    const state = { cur: 5, best: -1 }; // best artificially below any real ncross
    mincrossIter(ctx, g, 1, state, 0);
    expect(state.cur).toBe(0); // real ncross of the non-crossing chain
    expect(state.best).toBe(-1); // 0<=-1 is false -> saveBest skipped
  });
});

describe('mincrossIter: cur<=best saves but cur>=CONVERGENCE*best skips trying reset', () => {
  it('updates best to the new cur without resetting trying', () => {
    const { g, ctx, a } = makeTwoRankChain();
    a.info.coord.x = 77; // sentinel: saveBest overwrites this with the order
    const state = { cur: 5, best: 0 };
    mincrossIter(ctx, g, 1, state, 0);
    expect(state.best).toBe(0); // cur(0)<=best(0) -> saved
    expect(a.info.coord.x).toBe(0); // saveBest ran, overwriting the sentinel
  });
});

describe('mincrossIter: cur<CONVERGENCE*best resets trying', () => {
  it('saves the improved best from a much larger prior best', () => {
    const { g, ctx } = makeTwoRankChain();
    const state = { cur: 5, best: 1_000_000 };
    mincrossIter(ctx, g, 1, state, 0);
    expect(state.best).toBe(0); // 0 < 0.995*1_000_000 -> trying reset, best saved
  });
});

// ---------------------------------------------------------------------------
// mincrossPassSetup — buildRanks failure/success (pass<=1) and
// restoreBest gating (pass>1)
// ---------------------------------------------------------------------------

describe('mincrossPassSetup: pass<=1, buildRanks fails (g.info.rank undefined)', () => {
  it('returns -1 without running flatBreakcycles/flatReorder', () => {
    const g = new Graph('g', 'directed'); // g === g.root -> g===dotRoot(g); rank unset
    const ctx = makeCtx(g);
    const state = { cur: 10, best: 10 };
    const result = mincrossPassSetup(ctx, g, 0, state);
    expect(result).toBe(-1);
  });
});

describe('mincrossPassSetup: pass<=1, buildRanks succeeds on a single-node graph', () => {
  it('returns min(4, maxIter) and saves the initial crossing count', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.rank = 0;
    g.info.minrank = 0; g.info.maxrank = 0;
    g.info.nlist = a;
    allocateRanks(g);
    const ctx = makeCtx(g);
    const state = { cur: 999, best: 999 };
    const result = mincrossPassSetup(ctx, g, 0, state);
    expect(result).toBe(4); // min(4, ctx.maxIter=24)
    expect(state.best).toBe(0); // ncross of a single-node graph is 0
    expect(a.info.coord.x).toBe(0); // saveBest ran (cur<=best)
  });
});

describe('mincrossPassSetup: pass<=1, pass=1 skips flatBreakcycles', () => {
  it('still succeeds and saves the initial crossing count', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.rank = 0;
    g.info.minrank = 0; g.info.maxrank = 0;
    g.info.nlist = a;
    allocateRanks(g);
    const ctx = makeCtx(g);
    const state = { cur: 999, best: 999 };
    const result = mincrossPassSetup(ctx, g, 1, state);
    expect(result).toBe(4);
    expect(state.best).toBe(0);
  });
});

describe('mincrossPassSetup: pass<=1, cur>best skips saveBest', () => {
  it('leaves the sentinel coord.x untouched', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.rank = 0;
    a.info.coord.x = 42; // sentinel: saveBest would overwrite this to 0
    g.info.minrank = 0; g.info.maxrank = 0;
    g.info.nlist = a;
    allocateRanks(g);
    const ctx = makeCtx(g);
    const state = { cur: -100, best: -100 }; // ncross(0) > best(-100) -> skip save
    mincrossPassSetup(ctx, g, 0, state);
    expect(a.info.coord.x).toBe(42);
  });
});

describe('mincrossPassSetup: pass>1, cur>best triggers restoreBest', () => {
  it('restores from the saved best and invalidates the rank', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 5; a.info.coord = { x: 2, y: 0 };
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    g.info.minrank = 0; g.info.maxrank = 0;
    const rootRk = makeRankEntry([a]);
    rootRk.valid = true;
    g.info.rank = [rk]; // g is its own root
    const ctx = makeCtx(g);
    const state = { cur: 50, best: 10 };
    const result = mincrossPassSetup(ctx, g, 2, state);
    expect(result).toBe(ctx.maxIter);
    expect(state.cur).toBe(10); // set to state.best
    expect(a.info.order).toBe(2); // restoreBest ran (order <- coord.x)
  });
});

describe('mincrossPassSetup: pass>1, cur<=best skips restoreBest', () => {
  it('leaves node order untouched', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    a.info.order = 5; a.info.coord = { x: 2, y: 0 };
    const rk = makeRankEntry([a]);
    g.info.rank = [rk];
    g.info.minrank = 0; g.info.maxrank = 0;
    const ctx = makeCtx(g);
    const state = { cur: 5, best: 10 };
    const result = mincrossPassSetup(ctx, g, 2, state);
    expect(result).toBe(ctx.maxIter);
    expect(state.cur).toBe(10); // still set to state.best unconditionally
    expect(a.info.order).toBe(5); // restoreBest did NOT run
  });
});

// ---------------------------------------------------------------------------
// mincrossMain — buildRanks failure propagation (maxthispass<0) and a full
// successful run on a trivial two-node chain
// ---------------------------------------------------------------------------

describe('mincrossMain: propagates -1 when the first pass cannot build ranks', () => {
  it('returns -1 immediately (g.info.rank left undefined)', () => {
    const g = new Graph('g', 'directed');
    const ctx = makeCtx(g);
    expect(mincrossMain(ctx, g, 0)).toBe(-1);
  });
});

describe('mincrossMain: startpass>1 computes initCross via ncross and saves it', () => {
  it('takes the startpass>1 branch (real ncross + unconditional saveBest)', () => {
    const { g, ctx } = makeTwoRankChain();
    const result = mincrossMain(ctx, g, 2);
    expect(result).toBe(0); // no crossings possible on a 1-node-per-rank chain
  });
});

describe('mincrossMain: full successful run on a two-node one-edge chain', () => {
  it('returns 0 crossings for a trivially non-crossing chain', () => {
    const g = new Graph('g', 'directed');
    const a = makeNode(g, 0, 'a');
    const b = makeNode(g, 1, 'b');
    a.info.rank = 0; b.info.rank = 1;
    a.info.next = b; b.info.prev = a;
    const e = new Edge(a, b, '');
    fastEdge(e);
    g.info.minrank = 0; g.info.maxrank = 1;
    g.info.nlist = a;
    allocateRanks(g);
    const ctx = makeCtx(g);
    ctx.minQuit = 1; // finish quickly
    const result = mincrossMain(ctx, g, 0);
    expect(result).toBe(0);
  });
});
