// SPDX-License-Identifier: EPL-2.0
//
// T2e (coverage-90, batch-2): direct unit tests for layout/circo/blockpath.ts
// exported pure functions, targeting branch paths that are impractical to
// reach through a full circoLayoutFull pipeline run (tie-break fallbacks,
// early-return short-circuits, the C-bug-preserving crossing-count inflation,
// findPairEdges' three-way diff/withoutPair-length split). Every scenario
// below was verified against the actual runtime behaviour before being
// pinned as an assertion (D1: concrete-value assertions only).
// @see lib/circogen/blockpath.c

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { makeCData, FLAGS_ONPATH, FLAGS_ISPARENT } from './blocks.js';
import type { DerivedNode, DerivedEdge } from './blocks.js';
import {
  derivedOf, countCrossings, insertNode, reducePass, reduceEdgeCrossings,
  spanIncident, dfsSpan, buildSpanTree, measureDist, pathToNode, leafDegree,
  findCommon, findLongestPath, largestNodesize, neighborSet, isNeighbor,
  placeNodeBetweenTwo, placeNodeAfterAny, placeNode, placeResiduals,
  realignToParent, assignPositions, findPairEdges, removePairEdges,
} from './blockpath.js';
import type { SpanNode } from './blockpath.js';

// ---------------------------------------------------------------------------
// Shared factories (local to this file -- not shared test/helpers)
// ---------------------------------------------------------------------------

const G = new Graph('t2e-blockpath', 'undirected');
let idc = 0;

/** Wires info.alg = dn.cdata, matching production (circo.test.ts / init.ts). */
function mkD(name: string): DerivedNode {
  const orig = new Node(idc++, name, G);
  const dn = { name, orig, pos: [0, 0], cdata: undefined, lw: 0, rw: 0, ht: 0 } as unknown as DerivedNode;
  dn.cdata = makeCData(dn);
  orig.info.alg = dn.cdata;
  return dn;
}
function mkE(t: DerivedNode, h: DerivedNode): DerivedEdge {
  return { tail: t, head: h, order: 0, origEdge: null };
}
function mkSpan(dn: DerivedNode): SpanNode {
  return { dn, tparent: null, visited: false, distone: 0, disttwo: 0, leafone: null, leaftwo: null, onpath: false };
}

// ---------------------------------------------------------------------------
// derivedOf (L43): optional-chain short-circuit vs nullish-fallback vs value
// ---------------------------------------------------------------------------

describe('derivedOf', () => {
  it('returns null when info.alg is unset (optional-chain short-circuit)', () => {
    const orig = new Node(idc++, 'bare', G);
    expect(derivedOf(orig)).toBeNull();
  });
  it('returns null when info.alg is set but has no derivedNode (nullish fallback)', () => {
    const orig = new Node(idc++, 'foreign-alg', G);
    orig.info.alg = { notDerived: true } as unknown as typeof orig.info.alg;
    expect(derivedOf(orig)).toBeNull();
  });
  it('returns the wired DerivedNode when info.alg.derivedNode is set', () => {
    const dn = mkD('wired');
    expect(derivedOf(dn.orig)).toBe(dn);
  });
});

// ---------------------------------------------------------------------------
// countCrossings (L79): skip list entries with no derived node
// ---------------------------------------------------------------------------

describe('countCrossings', () => {
  it('skips a list entry that has no derived node without crashing', () => {
    const a = mkD('cc-a'), b = mkD('cc-b');
    const stray = new Node(idc++, 'cc-stray', G); // info.alg unset -> derivedOf(stray) === null
    const edges = [mkE(a, b)];
    const list = [a.orig, stray, b.orig];
    expect(countCrossings(list, edges)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// insertNode (L96-100): cn present/absent x neighbor present/absent
// ---------------------------------------------------------------------------

describe('insertNode', () => {
  it('removes cn from its current position when already in the list', () => {
    const a = mkD('in-a'), b = mkD('in-b'), c = mkD('in-c');
    const list = [a.orig, b.orig, c.orig];
    insertNode(list, b.orig, a.orig, 1);
    expect(list.map((n) => n.name)).toEqual(['in-a', 'in-b', 'in-c']);
  });
  it('leaves the list untouched when cn is not present (indexOf === -1)', () => {
    const a = mkD('in2-a'), b = mkD('in2-b'), c = mkD('in2-c');
    const list = [a.orig, b.orig];
    insertNode(list, c.orig, a.orig, 1);
    // pos=1 inserts AFTER neighbor a (index 0 + 1); the branch under test
    // is `i === -1` (cn absent, no splice-out) -- the pos=0 path is covered
    // separately below.
    expect(list.map((n) => n.name)).toEqual(['in2-a', 'in2-c', 'in2-b']);
  });
  it('pushes cn to the end when neighbor is not on the list (ni === -1)', () => {
    const a = mkD('in3-a'), b = mkD('in3-b'), missing = mkD('in3-missing');
    const list = [a.orig];
    insertNode(list, b.orig, missing.orig, 0);
    expect(list.map((n) => n.name)).toEqual(['in3-a', 'in3-b']);
  });
  it('inserts cn before neighbor when pos === 0', () => {
    const a = mkD('in4-a'), b = mkD('in4-b');
    const list = [a.orig];
    insertNode(list, b.orig, a.orig, 0);
    expect(list.map((n) => n.name)).toEqual(['in4-b', 'in4-a']);
  });
});

// ---------------------------------------------------------------------------
// reducePass / reduceEdgeCrossings (L125, L141): converge-to-zero (early
// return) vs improve-without-reaching-zero-then-stall (loop continuation)
// ---------------------------------------------------------------------------

describe('reduceEdgeCrossings', () => {
  it('converges to 0 crossings within a single pass (early-return branch)', () => {
    const a = mkD('rz-a'), b = mkD('rz-b'), c = mkD('rz-c'), d = mkD('rz-d');
    const edges = [mkE(a, b), mkE(c, d)];
    // a,c,b,d has a-b / c-d interleaved -> 1 crossing; one swap fixes it.
    const list = [a.orig, c.orig, b.orig, d.orig];
    expect(countCrossings(list, edges)).toBe(1);
    const result = reduceEdgeCrossings(list, edges, [a, b, c, d]);
    expect(countCrossings(result, edges)).toBe(0);
  });

  it('runs a second pass when the first improves crossings without zeroing them', () => {
    // Verified numerically: crossings trace 25 -> 6 -> 6 (stall on pass 2).
    // Exercises reduceEdgeCrossings' `if (prev === cnt.v) break` FALSE path
    // on pass 1 (25 !== 6, loop continues) and TRUE path on pass 2.
    const names = Array.from({ length: 12 }, (_, i) => `wc-n${i}`);
    const dns = names.map(mkD);
    const byName = Object.fromEntries(dns.map((d) => [d.name, d]));
    const pairs: [string, string][] = [
      ['wc-n5', 'wc-n8'], ['wc-n1', 'wc-n0'], ['wc-n4', 'wc-n11'], ['wc-n6', 'wc-n1'],
      ['wc-n3', 'wc-n8'], ['wc-n7', 'wc-n3'], ['wc-n3', 'wc-n11'], ['wc-n6', 'wc-n8'],
      ['wc-n6', 'wc-n3'], ['wc-n2', 'wc-n6'], ['wc-n10', 'wc-n1'],
    ];
    const edges = pairs.map(([t, h]) => mkE(byName[t]!, byName[h]!));
    const order = ['wc-n1', 'wc-n3', 'wc-n11', 'wc-n10', 'wc-n7', 'wc-n9', 'wc-n8', 'wc-n4', 'wc-n6', 'wc-n0', 'wc-n5', 'wc-n2'];
    const list = order.map((n) => byName[n]!.orig);
    expect(countCrossings(list, edges)).toBe(25);

    const cnt = { v: countCrossings(list, edges) };
    reducePass(list, edges, cnt, dns);
    expect(cnt.v).toBe(6); // pass 1: improves 25 -> 6, does not reach 0
    const prev = cnt.v;
    reducePass(list, edges, cnt, dns);
    expect(cnt.v).toBe(6); // pass 2: stalls -> reduceEdgeCrossings would break
    expect(prev).toBe(cnt.v);
  });

  it('leaves the list unchanged when no move improves crossings (revert branch)', () => {
    const a = mkD('rv-a'), b = mkD('rv-b');
    const edges: DerivedEdge[] = []; // no edges -> nothing can ever improve
    const list = [a.orig, b.orig];
    const cnt = { v: 0 };
    reducePass(list, edges, cnt, [a, b]);
    expect(cnt.v).toBe(0);
    expect(list.map((n) => n.name)).toEqual(['rv-a', 'rv-b']);
  });
});

// ---------------------------------------------------------------------------
// spanIncident (L161, L163): ord/seq `?? 0` fallbacks + `||` tie-break
// ---------------------------------------------------------------------------

describe('spanIncident', () => {
  it('falls back to seq order when two out-edges tie on head order', () => {
    const dn = mkD('si-dn'), h1 = mkD('si-h1');
    const eA = mkE(dn, h1), eB = mkE(dn, h1); // parallel out-edges -> ord tie
    const ord = new Map<DerivedNode, number>([[dn, 0], [h1, 1]]);
    const seq = new Map<DerivedEdge, number>([[eA, 5], [eB, 2]]);
    const result = spanIncident(dn, [eA, eB], ord, seq);
    // seq tie-break: eB (seq=2) sorts before eA (seq=5).
    expect(result).toEqual([eB, eA]);
  });

  it('falls back to seq order when two in-edges tie on tail order', () => {
    const dn = mkD('si2-dn'), t1 = mkD('si2-t1');
    const eA = mkE(t1, dn), eB = mkE(t1, dn); // parallel in-edges -> ord tie
    const ord = new Map<DerivedNode, number>([[dn, 0], [t1, 1]]);
    const seq = new Map<DerivedEdge, number>([[eA, 7], [eB, 3]]);
    const result = spanIncident(dn, [eA, eB], ord, seq);
    expect(result).toEqual([eB, eA]);
  });

  it('treats a node missing from the ord map as order 0 (?? fallback)', () => {
    const dn = mkD('si3-dn'), known = mkD('si3-known'), unknown = mkD('si3-unknown');
    const eKnown = mkE(dn, known); // ord.get(known) = 5
    const eUnknown = mkE(dn, unknown); // ord.get(unknown) undefined -> falls back to 0
    const ord = new Map<DerivedNode, number>([[dn, 0], [known, 5]]);
    const seq = new Map<DerivedEdge, number>([[eKnown, 0], [eUnknown, 1]]);
    const result = spanIncident(dn, [eKnown, eUnknown], ord, seq);
    // unknown's fallback order (0) sorts before known's order (5).
    expect(result).toEqual([eUnknown, eKnown]);
  });

  it('treats an edge missing from the seq map as seq 0 when ord ties', () => {
    const dn = mkD('si4-dn'), h1 = mkD('si4-h1');
    const eA = mkE(dn, h1), eB = mkE(dn, h1); // ord tie forces seq comparison
    const ord = new Map<DerivedNode, number>([[dn, 0], [h1, 1]]);
    const seq = new Map<DerivedEdge, number>([[eA, 9]]); // eB missing -> falls back to 0
    const result = spanIncident(dn, [eA, eB], ord, seq);
    expect(result).toEqual([eB, eA]);
  });

  it('OUT-direction, argument order swapped: covers the `a.head` fallback (the sibling `b.head` fallback is covered above)', () => {
    const dn = mkD('si3b-dn'), known = mkD('si3b-known'), unknown = mkD('si3b-unknown');
    const eKnown = mkE(dn, known), eUnknown = mkE(dn, unknown);
    const ord = new Map<DerivedNode, number>([[dn, 0], [known, 5]]);
    const seq = new Map<DerivedEdge, number>([[eKnown, 0], [eUnknown, 1]]);
    // eUnknown passed FIRST: the sort comparator's `a` parameter is bound to
    // it, so `ord.get(a.head) ?? 0` (not `ord.get(b.head) ?? 0`) is the one
    // that falls back this time.
    const result = spanIncident(dn, [eUnknown, eKnown], ord, seq);
    expect(result).toEqual([eUnknown, eKnown]);
  });

  it('treats the OTHER edge missing from the seq map as seq 0 when ord ties (sibling fallback)', () => {
    // Complementary to the eB-missing case above: V8's sort comparator
    // argument binding for a 2-element tie is not guaranteed to mirror the
    // input array position, so covering both edges-missing combinations is
    // needed to exercise both `seq.get(a) ?? 0` and `seq.get(b) ?? 0`.
    const dn = mkD('si4b-dn'), h1 = mkD('si4b-h1');
    const eA = mkE(dn, h1), eB = mkE(dn, h1);
    const ord = new Map<DerivedNode, number>([[dn, 0], [h1, 1]]);
    const seq = new Map<DerivedEdge, number>([[eB, 4]]); // eA missing -> falls back to 0
    const result = spanIncident(dn, [eA, eB], ord, seq);
    expect(result).toEqual([eA, eB]);
  });

  it('IN-direction: treats a tail missing from the ord map as order 0', () => {
    const dn = mkD('si5-dn'), known = mkD('si5-known'), unknown = mkD('si5-unknown');
    const eKnown = mkE(known, dn), eUnknown = mkE(unknown, dn); // dn is HEAD
    const ord = new Map<DerivedNode, number>([[dn, 0], [known, 5]]);
    const seq = new Map<DerivedEdge, number>([[eKnown, 0], [eUnknown, 1]]);
    const result = spanIncident(dn, [eKnown, eUnknown], ord, seq);
    expect(result).toEqual([eUnknown, eKnown]);
  });

  it('IN-direction, argument order swapped: covers the sibling `a.head`/`a`-side fallback', () => {
    const dn = mkD('si5b-dn'), known = mkD('si5b-known'), unknown = mkD('si5b-unknown');
    const eKnown = mkE(known, dn), eUnknown = mkE(unknown, dn);
    const ord = new Map<DerivedNode, number>([[dn, 0], [known, 5]]);
    const seq = new Map<DerivedEdge, number>([[eKnown, 0], [eUnknown, 1]]);
    const result = spanIncident(dn, [eUnknown, eKnown], ord, seq);
    expect(result).toEqual([eUnknown, eKnown]);
  });

  it('IN-direction: falls back to seq 0 for both sides when two in-edges tie and neither has a seq entry', () => {
    const dn = mkD('si6-dn'), known = mkD('si6-known');
    const eA = mkE(known, dn), eB = mkE(known, dn); // parallel in-edges -> tail-order tie
    const ord = new Map<DerivedNode, number>([[dn, 0], [known, 1]]);
    const seq = new Map<DerivedEdge, number>(); // both missing -> both fall back to 0 (stable no-op)
    const result = spanIncident(dn, [eA, eB], ord, seq);
    expect(result).toEqual([eA, eB]); // comparator returns 0 -> stable, input order preserved
  });
});

// ---------------------------------------------------------------------------
// dfsSpan / buildSpanTree: forest with two disconnected components exercises
// the "already visited" skip and the per-component root reset.
// ---------------------------------------------------------------------------

describe('buildSpanTree', () => {
  it('assigns null tparent to the root of each disconnected component', () => {
    const a = mkD('bt-a'), b = mkD('bt-b'), c = mkD('bt-c'), d = mkD('bt-d');
    const edges = [mkE(a, b), mkE(c, d)]; // two disjoint components
    const map = buildSpanTree([a, b, c, d], edges);
    expect(map.get(a)!.tparent).toBeNull();
    expect(map.get(b)!.tparent!.dn).toBe(a);
    expect(map.get(c)!.tparent).toBeNull();
    expect(map.get(d)!.tparent!.dn).toBe(c);
  });

  it('does not revisit an already-visited node (dfsSpan visited guard)', () => {
    const a = mkD('bt2-a'), b = mkD('bt2-b'), c = mkD('bt2-c');
    // Triangle: dfs from a visits b then c; the edge c-a and b-c closing the
    // cycle must be skipped because both endpoints are already visited.
    const edges = [mkE(a, b), mkE(b, c), mkE(c, a)];
    const map = buildSpanTree([a, b, c], edges);
    let visitedCount = 0;
    for (const sn of map.values()) if (sn.visited) visitedCount++;
    expect(visitedCount).toBe(3);
    // Exactly 2 tree edges recorded via tparent (a triangle's spanning tree).
    const withParent = [...map.values()].filter((sn) => sn.tparent !== null);
    expect(withParent.length).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// measureDist (L203-216): every branch of the distone/disttwo update chain
// ---------------------------------------------------------------------------

describe('measureDist', () => {
  it('sets distone on first visit, disttwo on a tying/second visit, and the terminal else-return on a third non-improving visit', () => {
    const root = mkSpan(mkD('md-root'));
    const p = mkSpan(mkD('md-p'));
    const leafA = mkSpan(mkD('md-leafA'));
    const leafB = mkSpan(mkD('md-leafB'));
    const leafC = mkSpan(mkD('md-leafC'));
    p.tparent = root;
    leafA.tparent = p; leafB.tparent = p; leafC.tparent = p;

    measureDist(leafA, leafA, 0, null); // p.distone === 0 -> true branch
    expect(p.distone).toBe(1);
    expect(p.leafone).toBe(leafA);
    expect(root.distone).toBe(2); // recursion propagates to root
    expect(root.leafone).toBe(leafA);

    measureDist(leafB, leafB, 0, null); // d(1) > disttwo(0) -> sets disttwo, returns (no further recursion)
    expect(p.disttwo).toBe(1);
    expect(p.leaftwo).toBe(leafB);
    expect(root.distone).toBe(2); // unchanged: measureDist returned before recursing

    measureDist(leafC, leafC, 0, null); // d(1) > distone(1) false, d(1) > disttwo(1) false -> terminal else return
    expect(p.distone).toBe(1);
    expect(p.disttwo).toBe(1);
    expect(p.leafone).toBe(leafA);
    expect(p.leaftwo).toBe(leafB);
  });

  it('displaces leafone into leaftwo on a longer path, propagating `change` up the chain (leafone===change skip branch)', () => {
    const root = mkSpan(mkD('md2-root'));
    const p = mkSpan(mkD('md2-p'));
    const mid = mkSpan(mkD('md2-mid'));
    const leafA = mkSpan(mkD('md2-leafA'));
    const leafB = mkSpan(mkD('md2-leafB'));
    const leafD = mkSpan(mkD('md2-leafD'));
    p.tparent = root; mid.tparent = p;
    leafA.tparent = p; leafB.tparent = p; leafD.tparent = mid;

    measureDist(leafA, leafA, 0, null); // p.distone=1 leafone=leafA; root.distone=2 leafone=leafA
    measureDist(leafB, leafB, 0, null); // p.disttwo=1 leaftwo=leafB (returns, no recursion to root)

    // leafD is two hops below p (via mid) -> displaces p's leafone at d=2.
    measureDist(leafD, leafD, 0, null);
    expect(p.distone).toBe(2);
    expect(p.leafone).toBe(leafD);
    expect(p.disttwo).toBe(1); // displaced: old leafone (leafA) becomes leaftwo
    expect(p.leaftwo).toBe(leafA);

    // At root: d=3 > root.distone(2) is a displace event too, but this time
    // root.leafone (leafA) === change (leafA) -- the `change`-guard SKIPS the
    // leaftwo/disttwo update (blockpath.c's asymmetric displacement rule).
    expect(root.distone).toBe(3);
    expect(root.leafone).toBe(leafD);
    expect(root.disttwo).toBe(0); // untouched: the inner if was skipped
    expect(root.leaftwo).toBeNull();
  });

  it('short-circuits the `!p.disttwo || leaftwo !== change` guard when disttwo is still 0', () => {
    const q = mkSpan(mkD('md3-q'));
    const r = mkSpan(mkD('md3-r'));
    const leaf1 = mkSpan(mkD('md3-leaf1'));
    const leaf2 = mkSpan(mkD('md3-leaf2'));
    leaf1.tparent = q; r.tparent = q; leaf2.tparent = r;

    measureDist(leaf1, leaf1, 0, null); // q.distone=1 leafone=leaf1
    // leaf2 is two hops below q (via r); at q, d=2 > distone(1) displaces
    // while q.disttwo is still 0 -> `!p.disttwo` short-circuits the `||`.
    measureDist(leaf2, leaf2, 0, null);
    expect(q.distone).toBe(2);
    expect(q.leafone).toBe(leaf2);
    expect(q.disttwo).toBe(1);
    expect(q.leaftwo).toBe(leaf1);
  });

  it('returns immediately when the ancestor has no tparent (root of the recursion)', () => {
    const root = mkSpan(mkD('md4-root'));
    const before = { ...root };
    measureDist(root, root, 0, null); // anc.tparent === null -> return, no mutation
    expect(root.distone).toBe(before.distone);
    expect(root.leafone).toBe(before.leafone);
  });

  it('does not reassign `change` when leaftwo already equals it, but still overwrites leaftwo/disttwo unconditionally', () => {
    // `!p.disttwo || p.leaftwo !== change` both operands false: disttwo is
    // already set (truthy) AND leaftwo already equals the incoming change.
    const root = mkSpan(mkD('md5-root'));
    const p = mkSpan(mkD('md5-p'));
    const proxy = mkSpan(mkD('md5-proxy')); // stand-in ancestor: proxy.tparent === p
    const A = mkSpan(mkD('md5-A'));
    const B = mkSpan(mkD('md5-B'));
    const C = mkSpan(mkD('md5-C'));
    p.tparent = root; proxy.tparent = p; A.tparent = p; B.tparent = p;

    measureDist(A, A, 0, null); // p.distone=1 leafone=A
    measureDist(B, B, 0, null); // p.disttwo=1 leaftwo=B (returns, no recursion to root)
    expect(p.leafone).toBe(A);
    expect(p.leaftwo).toBe(B);

    // Simulate a grandchild call arriving at p (via proxy) with change
    // already equal to p.leaftwo (B): leafone(A) !== change(B) is TRUE
    // (enters the inner if), but !disttwo is false and leaftwo===change is
    // false too -> the OR is fully evaluated and false (no reassignment).
    measureDist(C, proxy, 1, B);
    expect(p.distone).toBe(2);
    expect(p.leafone).toBe(C);
    expect(p.disttwo).toBe(1); // unconditional overwrite: old distone (1)
    expect(p.leaftwo).toBe(A); // unconditional overwrite: old leafone (A)
  });
});

// ---------------------------------------------------------------------------
// pathToNode / leafDegree / findCommon / findLongestPath
// ---------------------------------------------------------------------------

describe('pathToNode / leafDegree / findCommon', () => {
  it('walks from a leaf up to (excluding) stop, marking onpath', () => {
    const root = mkSpan(mkD('pt-root'));
    const mid = mkSpan(mkD('pt-mid'));
    const leaf = mkSpan(mkD('pt-leaf'));
    mid.tparent = root; leaf.tparent = mid;
    const path = pathToNode(leaf, root);
    expect(path).toEqual([leaf, mid]);
    expect(leaf.onpath).toBe(true);
    expect(mid.onpath).toBe(true);
    expect(root.onpath).toBe(false);
  });

  it('counts leaf degree via tparent links in both directions', () => {
    const p = mkSpan(mkD('ld-p'));
    const c1 = mkSpan(mkD('ld-c1'));
    const c2 = mkSpan(mkD('ld-c2'));
    c1.tparent = p; c2.tparent = p;
    const all = [p, c1, c2];
    expect(leafDegree(p, all)).toBe(2); // p is tparent of c1, c2
    expect(leafDegree(c1, all)).toBe(1); // c1.tparent === p
  });

  it('returns null when every node has distone+disttwo === 0', () => {
    const a = mkSpan(mkD('fc-a'));
    const b = mkSpan(mkD('fc-b'));
    expect(findCommon([a, b])).toBeNull();
  });
});

describe('findLongestPath defensive fallback (common.leafone ?? common)', () => {
  it('uses common itself as the walk start when the chosen common node has no leafone set', () => {
    // Hand-crafted SpanNode with distone > 0 (so it wins findCommon's
    // max-length scan) but leafone left null -- a state measureDist never
    // legitimately produces (distone and leafone are always set together),
    // but findLongestPath's `common.leafone ?? common` guard exists to avoid
    // an immediate-cycle walk (`pathToNode(null, common)` would otherwise
    // start from a non-existent node). Exercised directly since it is only
    // reachable via a malformed SpanNode, never through buildSpanTree.
    const other = mkSpan(mkD('flp-other'));
    const pathological: SpanNode = {
      dn: mkD('flp-patho'), tparent: null, visited: false,
      distone: 5, disttwo: 0, leafone: null, leaftwo: null, onpath: false,
    };
    const result = findLongestPath([other, pathological]);
    expect(result).toEqual([pathological]);
    expect(pathological.onpath).toBe(true);
  });
});

describe('findLongestPath', () => {
  it('returns a single-node onpath path for a 1-node span set', () => {
    const only = mkSpan(mkD('flp-only'));
    const path = findLongestPath([only]);
    expect(path).toEqual([only]);
    expect(only.onpath).toBe(true);
  });

  it('returns an empty path when findCommon finds no common node', () => {
    // Two isolated SpanNodes, no tparent links between them: leafDegree is 0
    // for both (never 1), so measureDist is never invoked and distone stays 0.
    const a = mkSpan(mkD('flp2-a'));
    const b = mkSpan(mkD('flp2-b'));
    expect(findLongestPath([a, b])).toEqual([]);
  });

  it('builds a path through both branches when disttwo > 0', () => {
    const p = mkSpan(mkD('flp3-p'));
    const leafA = mkSpan(mkD('flp3-leafA'));
    const leafB = mkSpan(mkD('flp3-leafB'));
    leafA.tparent = p; leafB.tparent = p;
    const path = findLongestPath([p, leafA, leafB]);
    // p has leafDegree 2 (both leaves point to it), so it's never measured as
    // a degree-1 leaf itself; leafA/leafB each have leafDegree 1 and seed p's
    // distone/disttwo. The common node (p, dist 1+1=2) anchors both branches.
    expect(path.length).toBe(3);
    expect(path).toContain(p);
    expect(path).toContain(leafA);
    expect(path).toContain(leafB);
  });
});

// ---------------------------------------------------------------------------
// largestNodesize / neighborSet / isNeighbor / placeNode family
// ---------------------------------------------------------------------------

describe('assignPositions', () => {
  it('reuses an existing pos array in place and skips nodes/entries with no alg record', () => {
    const a = mkD('ap-a'), b = mkD('ap-b');
    const existingPos = [9, 9];
    a.orig.info.pos = existingPos; // pre-existing array -> `?? [0, 0]` fallback skipped
    const bare = new Node(idc++, 'ap-bare', G); // info.alg unset -> `if (a)` false branch
    assignPositions([a.orig, bare, b.orig], 3);
    expect(a.orig.info.pos).toBe(existingPos); // same array reference: reused, not replaced
    expect(bare.info.alg).toBeUndefined(); // untouched: placement loop skipped it
    expect(b.cdata.pos).toBe(2); // wired alg record: `if (a)` true branch ran
    expect(b.cdata.psi).toBe(0);
  });
});

describe('largestNodesize', () => {
  it('returns the max of width/height across the list', () => {
    const a = mkD('ls-a'), b = mkD('ls-b');
    a.orig.info.width = 2; a.orig.info.height = 1;
    b.orig.info.width = 1; b.orig.info.height = 5;
    expect(largestNodesize([a.orig, b.orig])).toBe(5);
  });
  it('returns 0 for an empty list', () => {
    expect(largestNodesize([])).toBe(0);
  });
});

describe('neighborSet / isNeighbor', () => {
  it('collects both tail-side and head-side neighbours', () => {
    const a = mkD('ns-a'), b = mkD('ns-b'), c = mkD('ns-c');
    const edges = [mkE(a, b), mkE(c, a)];
    const nbrs = neighborSet(a, edges);
    expect(nbrs.size).toBe(2);
    expect(nbrs.has(b)).toBe(true);
    expect(nbrs.has(c)).toBe(true);
    expect(isNeighbor(b.orig, nbrs)).toBe(true);
    expect(isNeighbor(mkD('ns-outsider').orig, nbrs)).toBe(false);
  });
  it('isNeighbor returns false for a node with no derived counterpart', () => {
    const stray = new Node(idc++, 'ns-stray', G);
    expect(isNeighbor(stray, new Set())).toBe(false);
  });
});

describe('placeNodeBetweenTwo / placeNodeAfterAny / placeNode', () => {
  it('places between two consecutive neighbours when both are adjacent on the list', () => {
    const a = mkD('pb-a'), b = mkD('pb-b'), x = mkD('pb-x');
    const list = [a.orig, b.orig];
    const nbrs = new Set([a, b]);
    const placed = placeNodeBetweenTwo(list, x, nbrs);
    expect(placed).toBe(true);
    expect(list.map((n) => n.name)).toEqual(['pb-a', 'pb-x', 'pb-b']);
  });

  it('placeNodeBetweenTwo returns false when no two consecutive list entries are both neighbours', () => {
    const a = mkD('pb2-a'), b = mkD('pb2-b'), c = mkD('pb2-c'), x = mkD('pb2-x');
    const list = [a.orig, b.orig, c.orig];
    const nbrs = new Set([a]); // only one neighbour on the list
    expect(placeNodeBetweenTwo(list, x, nbrs)).toBe(false);
  });

  it('placeNodeAfterAny places right after the first matching neighbour', () => {
    const a = mkD('pa-a'), b = mkD('pa-b'), x = mkD('pa-x');
    const list = [a.orig, b.orig];
    const placed = placeNodeAfterAny(list, x, new Set([b]));
    expect(placed).toBe(true);
    expect(list.map((n) => n.name)).toEqual(['pa-a', 'pa-b', 'pa-x']);
  });

  it('placeNodeAfterAny returns false when no list entry is a neighbour', () => {
    const a = mkD('pa2-a'), x = mkD('pa2-x'), other = mkD('pa2-other');
    const list = [a.orig];
    expect(placeNodeAfterAny(list, x, new Set([other]))).toBe(false);
  });

  it('placeNode falls back to push when there are no neighbours at all', () => {
    const a = mkD('pn-a'), x = mkD('pn-x');
    const list = [a.orig];
    placeNode(x, [], list);
    expect(list.map((n) => n.name)).toEqual(['pn-a', 'pn-x']);
  });

  it('placeNode uses placeNodeAfterAny when nbrs.size is exactly 1 (below the >=2 threshold)', () => {
    const a = mkD('pn2-a'), b = mkD('pn2-b'), x = mkD('pn2-x');
    const edges = [mkE(x, a)]; // x has exactly one neighbour: a
    const list = [a.orig, b.orig];
    placeNode(x, edges, list);
    expect(list.map((n) => n.name)).toEqual(['pn2-a', 'pn2-x', 'pn2-b']);
  });
});

describe('placeResiduals', () => {
  it('places every node lacking FLAGS_ONPATH and skips those that have it', () => {
    const onPath = mkD('pr-onpath');
    const residual = mkD('pr-residual');
    onPath.cdata.flags |= FLAGS_ONPATH;
    const edges = [mkE(residual, onPath)];
    const list = [onPath.orig];
    const block = { subGraph: { name: 'b', nodes: [onPath, residual], edges: [], parent: undefined } } as unknown as Parameters<typeof placeResiduals>[0];
    placeResiduals(block, edges, list);
    expect(list.map((n) => n.name)).toEqual(['pr-onpath', 'pr-residual']);
  });
});

// ---------------------------------------------------------------------------
// realignToParent (L312-313): found-parent-flag break vs never-found
// ---------------------------------------------------------------------------

describe('realignToParent', () => {
  it('rotates the list so the FLAGS_ISPARENT node leads', () => {
    const a = mkD('rt-a'), b = mkD('rt-b'), c = mkD('rt-c');
    b.cdata.flags |= FLAGS_ISPARENT;
    const list = [a.orig, b.orig, c.orig];
    realignToParent(list);
    expect(list.map((n) => n.name)).toEqual(['rt-b', 'rt-c', 'rt-a']);
  });

  it('leaves the list untouched when no node carries FLAGS_ISPARENT', () => {
    const a = mkD('rt2-a'), b = mkD('rt2-b');
    const list = [a.orig, b.orig];
    realignToParent(list);
    expect(list.map((n) => n.name)).toEqual(['rt2-a', 'rt2-b']);
  });

  it('treats a node with no alg record as flags 0 (?? 0 fallback)', () => {
    const stray = new Node(idc++, 'rt3-stray', G); // info.alg unset
    const b = mkD('rt3-b');
    b.cdata.flags |= FLAGS_ISPARENT;
    const list = [stray, b.orig];
    realignToParent(list);
    expect(list.map((n) => n.name)).toEqual(['rt3-b', 'rt3-stray']);
  });
});

// ---------------------------------------------------------------------------
// findPairEdges (L400-459): the three-way diff/withoutPair.length split.
// XNode/XEdge/PairCtx are unexported internals; their shapes are recovered
// via Parameters<> against the exported function signature.
// ---------------------------------------------------------------------------

type XNode = Parameters<typeof findPairEdges>[0];
type PairCtx = Parameters<typeof findPairEdges>[1];

function mkX(dn: DerivedNode, idx: number): XNode {
  return { dn, idx, degree: 0, out: [], in: [], alive: true } as unknown as XNode;
}
function xconnect(a: XNode, b: XNode, seq: number): void {
  const av = a as unknown as { out: unknown[]; degree: number };
  const bv = b as unknown as { in: unknown[]; degree: number };
  const e = { tail: a, head: b, orige: null, seq, alive: true };
  av.out.push(e);
  bv.in.push(e);
  av.degree++;
  bv.degree++;
}

describe('findPairEdges', () => {
  it('diff < withoutPair.length: pairs adjacent unpaired neighbours, then fans out from the first', () => {
    const n = mkX(mkD('fp1-n'), 0);
    const nbrs = ['fp1-x1', 'fp1-x2', 'fp1-x3', 'fp1-x4', 'fp1-x5'].map((nm, i) => mkX(mkD(nm), i + 1));
    for (const nb of nbrs) xconnect(n, nb, (nb as unknown as { idx: number }).idx);
    const ctx: PairCtx = { pruned: new Set(), nextSeq: { v: 100 } };
    findPairEdges(n, ctx);
    // Verified: nodeDegree=5, edgeCnt=0, diff=4 < withoutPair.length=5.
    // First loop pairs (x1,x2),(x3,x4); second loop pairs (x1,x3),(x1,x4).
    const degrees = nbrs.map((x) => (x as unknown as { degree: number }).degree);
    expect(degrees).toEqual([4, 2, 3, 3, 1]);
    expect((n as unknown as { degree: number }).degree).toBe(5); // n itself untouched
  });

  it('diff === withoutPair.length: pairs the single withPair node against every unpaired one', () => {
    const n = mkX(mkD('fp2-n'), 0);
    const n1 = mkX(mkD('fp2-n1'), 1);
    const n2 = mkX(mkD('fp2-n2'), 2);
    const n3 = mkX(mkD('fp2-n3'), 3);
    xconnect(n, n1, 10); xconnect(n, n2, 11); xconnect(n, n3, 12);
    xconnect(n1, n2, 13); // n1,n2 have a pair edge; n3 does not
    const ctx: PairCtx = { pruned: new Set(), nextSeq: { v: 100 } };
    findPairEdges(n, ctx);
    // Verified: nodeDegree=3, edgeCnt=1, diff=1 === withoutPair.length=1.
    // tp = withPair[0] = n1 (non-null branch); n1-n3 edge added.
    expect((n1 as unknown as { degree: number }).degree).toBe(3);
    expect((n2 as unknown as { degree: number }).degree).toBe(2);
    expect((n3 as unknown as { degree: number }).degree).toBe(2);
  });

  it('diff > withoutPair.length: neither branch fires, degrees stay at their pre-scan values', () => {
    const n = mkX(mkD('fp3-n'), 0);
    const n1 = mkX(mkD('fp3-n1'), 1);
    const n2 = mkX(mkD('fp3-n2'), 2);
    const n3 = mkX(mkD('fp3-n3'), 3);
    const n4 = mkX(mkD('fp3-n4'), 4);
    const n5 = mkX(mkD('fp3-n5'), 5);
    const n6 = mkX(mkD('fp3-n6'), 6);
    xconnect(n, n1, 10); xconnect(n, n2, 11); xconnect(n, n3, 12); xconnect(n, n4, 13);
    xconnect(n, n5, 14); xconnect(n, n6, 15);
    xconnect(n1, n2, 16); xconnect(n3, n4, 17); // two disjoint pairs among the 4 withPair nodes
    const ctx: PairCtx = { pruned: new Set(), nextSeq: { v: 100 } };
    findPairEdges(n, ctx);
    // Verified: nodeDegree=6, edgeCnt=2, diff=3 > withoutPair.length=2 ->
    // neither `if` nor `else if` fires; no xAddEdge calls at all.
    const degrees = [n1, n2, n3, n4, n5, n6].map((x) => (x as unknown as { degree: number }).degree);
    expect(degrees).toEqual([2, 2, 2, 2, 1, 1]);
    expect((n as unknown as { degree: number }).degree).toBe(6);
  });

  it('prunes the paired original edge exactly once (orige !== null branch)', () => {
    const n = mkX(mkD('fp4-n'), 0);
    const n1 = mkX(mkD('fp4-n1'), 1);
    const n2 = mkX(mkD('fp4-n2'), 2);
    xconnect(n, n1, 0);
    xconnect(n, n2, 1);
    const dn1 = (n1 as unknown as { dn: DerivedNode }).dn;
    const dn2 = (n2 as unknown as { dn: DerivedNode }).dn;
    const origEdge = mkE(dn1, dn2);
    const pairEdge = { tail: n1, head: n2, orige: origEdge, seq: 2, alive: true };
    (n1 as unknown as { out: unknown[] }).out.push(pairEdge);
    (n2 as unknown as { in: unknown[] }).in.push(pairEdge);
    (n1 as unknown as { degree: number }).degree++;
    (n2 as unknown as { degree: number }).degree++;
    const ctx: PairCtx = { pruned: new Set(), nextSeq: { v: 100 } };
    findPairEdges(n, ctx);
    expect(ctx.pruned.has(origEdge)).toBe(true);
    expect(ctx.pruned.size).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// removePairEdges (L484): a dangling edge head outside `nodes` is skipped.
// ---------------------------------------------------------------------------

describe('removePairEdges', () => {
  it('skips an edge whose head has no clone node without crashing', () => {
    const a = mkD('rpe-a'), b = mkD('rpe-b'), c = mkD('rpe-c'), d = mkD('rpe-d');
    const outsider = mkD('rpe-outsider'); // deliberately excluded from `nodes`
    const edges = [mkE(a, b), mkE(b, c), mkE(c, d), mkE(d, a), mkE(a, outsider)];
    const result = removePairEdges([a, b, c, d], edges);
    // The dangling edge is untouched by pruning (never even cloned) and
    // survives in the returned (edges - pruned) set.
    expect(result).toContain(edges[4]);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tolerates a duplicate adjacency entry from a parallel edge (dl.indexOf misses on the second occurrence)', () => {
    // 'a' carries a parallel edge to 'b'; xIncident(a) yields TWO entries for
    // 'b', so the dl-removal loop's `dl.indexOf(a)` finds 'b' once and misses
    // (-1) on the second occurrence -- exercises both branches of that guard.
    // The 7-node spread ensures 'a' (the highest-degree node) is eventually
    // popped as currnode within the loop's (nodeCount-3) iterations, rather
    // than being left in the final untouched 3.
    const names = ['pe-a', 'pe-b', 'pe-c', 'pe-d', 'pe-e', 'pe-f', 'pe-g'];
    const [a, b, c, d, e, f, h] = names.map(mkD);
    const edges = [
      mkE(a, b), mkE(a, b), // parallel
      mkE(a, c), mkE(a, d),
      mkE(b, e), mkE(b, f),
      mkE(c, d), mkE(e, f),
      mkE(c, h), mkE(d, h),
    ];
    const result = removePairEdges([a, b, c, d, e, f, h], edges);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });

  it('tolerates a duplicate adjacency entry on the HEAD side of a parallel edge (xIncident in-sort tie)', () => {
    // Arranges for 'w1' -- the shared HEAD of the two parallel w0--w1
    // edges -- to be popped as currnode within the min-degree-first greedy
    // order (getList/gvQsort processes the lowest-degree node first): w1's
    // degree (2, from the parallel pair alone) ties it with a filler
    // triangle's vertices, one of which is the same tier the greedy pop
    // reaches before the "final 3 unprocessed" cutoff.
    const names = ['pe2-w0', 'pe2-w1', 'pe2-t1', 'pe2-t2', 'pe2-t3'];
    const [w0, w1, t1, t2, t3] = names.map(mkD);
    const edges = [
      mkE(w0, w1), mkE(w0, w1), // parallel: w0=tail, w1=head
      mkE(w0, t1),
      mkE(t1, t2), mkE(t2, t3), mkE(t3, t1),
    ];
    const nodes = [w0, w1, t1, t2, t3];
    const result = removePairEdges(nodes, edges);
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeGreaterThan(0);
  });
});
