// SPDX-License-Identifier: EPL-2.0
/**
 * T4a — branch-coverage tests for layout/dot/conc.ts (edge concentration).
 *
 * Mixed mode (D1): every function here is a small pure/near-pure helper, so
 * each is unit-tested directly against hand-built Graph/Node/Edge fixtures
 * (mirroring rank.branch.test.ts / ns.branch.test.ts). renderSvg-driven
 * integration coverage of this module already lives in conc.test.ts and
 * concentrate-trunk.test.ts — this file does not duplicate those scenarios.
 *
 * @see lib/dotgen/conc.c
 */

import { describe, it, expect, vi } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { makePort } from '../../model/edgeInfo.js';
import type { Port } from '../../model/geom.js';
import type { RankEntry } from '../../model/rankEntry.js';
import { VIRTUAL, NORMAL, fastNode, fastEdge } from './fastgr.js';
import {
  portcmp, downcandidate, upcandidate, findNormalEdge, sameDir,
  bothdowncandidates, bothupcandidates,
  resolveDownRep, drainIntoDown, mergeOneOutEdge,
  resolveUpRep, drainIntoUp, mergeOneInEdge,
  absorbNodeDown, absorbNodeUp, mergeVirtual,
  infuse, infuseEdgeChain, virtNodeInGraph, computeMaxi,
  fillRankVlist, infuseAllNodes, fillAllRankVlists,
  rebuildClusterVlists, rebuildVlists,
  concentrateOneRankDown, concentrateOneRankUp,
  runDownPass, runUpPass, dotConcentrate,
} from './conc.js';

// ---------------------------------------------------------------------------
// Fixture helpers
// ---------------------------------------------------------------------------

function mkRankEntry(v: Node[] = []): RankEntry {
  return {
    n: v.length, v, an: v.length, av: v,
    ht1: 0, ht2: 0, pht1: 0, pht2: 0,
    candidate: false, valid: true, cache_nc: 0,
  };
}

// ---------------------------------------------------------------------------
// portcmp  @see lib/dotgen/dotsplines.c:portcmp
// ---------------------------------------------------------------------------

describe('portcmp', () => {
  const P = (defined: boolean, x = 0, y = 0): Port => ({ ...makePort(), defined, p: { x, y } });
  it('both undefined -> 0', () => expect(portcmp(P(false), P(false))).toBe(0));
  it('p1 undefined, p0 defined -> 1', () => expect(portcmp(P(true), P(false))).toBe(1));
  it('p1 defined, p0 undefined -> -1', () => expect(portcmp(P(false), P(true))).toBe(-1));
  it('p0.x < p1.x -> -1', () => expect(portcmp(P(true, 0, 0), P(true, 1, 0))).toBe(-1));
  it('p0.x > p1.x -> 1', () => expect(portcmp(P(true, 1, 0), P(true, 0, 0))).toBe(1));
  it('equal x, p0.y < p1.y -> -1', () => expect(portcmp(P(true, 0, 0), P(true, 0, 1))).toBe(-1));
  it('equal x, p0.y > p1.y -> 1', () => expect(portcmp(P(true, 0, 1), P(true, 0, 0))).toBe(1));
  it('equal x and y -> 0', () => expect(portcmp(P(true, 1, 1), P(true, 1, 1))).toBe(0));
});

// ---------------------------------------------------------------------------
// downcandidate / upcandidate  @see lib/dotgen/conc.c
// ---------------------------------------------------------------------------

describe('downcandidate', () => {
  it('is false when node_type is not VIRTUAL (unset -> 0 fallback)', () => {
    expect(downcandidate({ info: {} } as unknown as Node)).toBe(false);
  });
  it('is false when in.size !== 1 (unset in -> 0 fallback, or wrong size)', () => {
    expect(downcandidate({ info: { node_type: VIRTUAL } } as unknown as Node)).toBe(false);
    expect(downcandidate({
      info: { node_type: VIRTUAL, in: { list: [], size: 2 } },
    } as unknown as Node)).toBe(false);
  });
  it('is false when out.size !== 1 (unset out -> 0 fallback, or wrong size)', () => {
    const base = { node_type: VIRTUAL, in: { list: [], size: 1 } };
    expect(downcandidate({ info: base } as unknown as Node)).toBe(false);
    expect(downcandidate({
      info: { ...base, out: { list: [], size: 2 } },
    } as unknown as Node)).toBe(false);
  });
  it('is false when label is defined', () => {
    expect(downcandidate({
      info: { node_type: VIRTUAL, in: { list: [], size: 1 }, out: { list: [], size: 1 }, label: {} },
    } as unknown as Node)).toBe(false);
  });
  it('is true when all four conditions hold', () => {
    expect(downcandidate({
      info: { node_type: VIRTUAL, in: { list: [], size: 1 }, out: { list: [], size: 1 } },
    } as unknown as Node)).toBe(true);
  });
});

describe('upcandidate', () => {
  it('is false when node_type is not VIRTUAL', () => {
    expect(upcandidate({ info: {} } as unknown as Node)).toBe(false);
  });
  it('is false when out.size !== 1', () => {
    expect(upcandidate({ info: { node_type: VIRTUAL } } as unknown as Node)).toBe(false);
  });
  it('is false when in.size !== 1', () => {
    expect(upcandidate({
      info: { node_type: VIRTUAL, out: { list: [], size: 1 } },
    } as unknown as Node)).toBe(false);
  });
  it('is false when label is defined', () => {
    expect(upcandidate({
      info: { node_type: VIRTUAL, out: { list: [], size: 1 }, in: { list: [], size: 1 }, label: {} },
    } as unknown as Node)).toBe(false);
  });
  it('is true when all four conditions hold', () => {
    expect(upcandidate({
      info: { node_type: VIRTUAL, out: { list: [], size: 1 }, in: { list: [], size: 1 } },
    } as unknown as Node)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// findNormalEdge / sameDir  @see lib/dotgen/conc.c:samedir
// ---------------------------------------------------------------------------

describe('findNormalEdge', () => {
  it('returns e immediately when edge_type is already NORMAL (or unset)', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const e = new Edge(t, h, '');
    expect(findNormalEdge(e)).toBe(e);
  });
  it('walks to_orig until a NORMAL edge is found', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const orig = new Edge(t, h, ''); orig.info.edge_type = NORMAL;
    const virt = new Edge(t, h, ''); virt.info.edge_type = VIRTUAL; virt.info.to_orig = orig;
    expect(findNormalEdge(virt)).toBe(orig);
  });
  it('returns undefined when the to_orig chain terminates without a NORMAL edge', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const virt = new Edge(t, h, ''); virt.info.edge_type = VIRTUAL;
    expect(findNormalEdge(virt)).toBeUndefined();
  });
});

describe('sameDir', () => {
  it('returns false when e has no NORMAL edge in its chain', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const eBad = new Edge(t, h, ''); eBad.info.edge_type = VIRTUAL;
    const f = new Edge(t, h, '');
    expect(sameDir(eBad, f)).toBe(false);
  });
  it('returns false when f has no NORMAL edge in its chain', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const e = new Edge(t, h, '');
    const fBad = new Edge(t, h, ''); fBad.info.edge_type = VIRTUAL;
    expect(sameDir(e, fBad)).toBe(false);
  });
  it('returns false when e0.conc_opp_flag is set', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const e = new Edge(t, h, ''); e.info.conc_opp_flag = true;
    const f = new Edge(t, h, '');
    expect(sameDir(e, f)).toBe(false);
  });
  it('returns false when only f0.conc_opp_flag is set', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    const e = new Edge(t, h, '');
    const f = new Edge(t, h, ''); f.info.conc_opp_flag = true;
    expect(sameDir(e, f)).toBe(false);
  });
  it('returns true when tail/head rank diffs share the same sign', () => {
    const g = new Graph('g', 'directed');
    const et = new Node(0, 'et', g); et.info.rank = 3;
    const eh = new Node(1, 'eh', g); eh.info.rank = 0;
    const e = new Edge(et, eh, '');
    const ft = new Node(2, 'ft', g); ft.info.rank = 5;
    const fh = new Node(3, 'fh', g); fh.info.rank = 1;
    const f = new Edge(ft, fh, '');
    expect(sameDir(e, f)).toBe(true);
  });
  it('returns false when the diffs have opposite signs', () => {
    const g = new Graph('g', 'directed');
    const et = new Node(0, 'et', g); et.info.rank = 0;
    const eh = new Node(1, 'eh', g); eh.info.rank = 3;
    const e = new Edge(et, eh, '');
    const ft = new Node(2, 'ft', g); ft.info.rank = 5;
    const fh = new Node(3, 'fh', g); fh.info.rank = 1;
    const f = new Edge(ft, fh, '');
    expect(sameDir(e, f)).toBe(false);
  });
  it('defaults unset ranks to 0 on both endpoints (product is 0, not >0)', () => {
    const g = new Graph('g', 'directed');
    const et = new Node(0, 'et', g); const eh = new Node(1, 'eh', g);
    const e = new Edge(et, eh, '');
    const ft = new Node(2, 'ft', g); const fh = new Node(3, 'fh', g);
    const f = new Edge(ft, fh, '');
    expect(sameDir(e, f)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// bothdowncandidates / bothupcandidates  @see lib/dotgen/conc.c
// ---------------------------------------------------------------------------

describe('bothdowncandidates', () => {
  it('returns false when u has no in-edge', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    expect(bothdowncandidates(u, v)).toBe(false);
  });
  it('returns false when v has no in-edge', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    const p = new Node(2, 'p', g);
    const eu = new Edge(p, u, ''); u.info.in = { list: [eu], size: 1 };
    expect(bothdowncandidates(u, v)).toBe(false);
  });
  it('returns false when v is not a downcandidate', () => {
    const g = new Graph('g', 'directed');
    const p = new Node(0, 'p', g);
    const u = new Node(1, 'u', g); const eu = new Edge(p, u, ''); u.info.in = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); const ev = new Edge(p, v, ''); v.info.in = { list: [ev], size: 1 };
    expect(bothdowncandidates(u, v)).toBe(false);
  });
  it('returns false when e.tail !== f.tail', () => {
    const g = new Graph('g', 'directed');
    const p1 = new Node(0, 'p1', g); const p2 = new Node(1, 'p2', g);
    const u = new Node(2, 'u', g); const eu = new Edge(p1, u, ''); u.info.in = { list: [eu], size: 1 };
    const v = new Node(3, 'v', g); v.info.node_type = VIRTUAL;
    const ev = new Edge(p2, v, ''); v.info.in = { list: [ev], size: 1 };
    v.info.out = { list: [new Edge(v, new Node(4, 'q', g), '')], size: 1 };
    expect(bothdowncandidates(u, v)).toBe(false);
  });
  it('returns false when portcmp(tail_port) !== 0 despite matching tail and sameDir', () => {
    const g = new Graph('g', 'directed');
    const p = new Node(0, 'p', g); p.info.rank = 5;
    const u = new Node(1, 'u', g); u.info.rank = 0;
    const eu = new Edge(p, u, '');
    eu.info.tail_port.defined = true; eu.info.tail_port.p = { x: 1, y: 0 };
    u.info.in = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); v.info.node_type = VIRTUAL; v.info.rank = 1;
    const ev = new Edge(p, v, '');
    ev.info.tail_port.defined = true; ev.info.tail_port.p = { x: 2, y: 0 };
    v.info.in = { list: [ev], size: 1 };
    v.info.out = { list: [new Edge(v, new Node(3, 'q', g), '')], size: 1 };
    expect(bothdowncandidates(u, v)).toBe(false);
  });
  it('returns true when everything aligns', () => {
    const g = new Graph('g', 'directed');
    const p = new Node(0, 'p', g); p.info.rank = 5;
    const u = new Node(1, 'u', g); u.info.rank = 0;
    const eu = new Edge(p, u, ''); u.info.in = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); v.info.node_type = VIRTUAL; v.info.rank = 1;
    const ev = new Edge(p, v, ''); v.info.in = { list: [ev], size: 1 };
    v.info.out = { list: [new Edge(v, new Node(3, 'q', g), '')], size: 1 };
    expect(bothdowncandidates(u, v)).toBe(true);
  });
});

describe('bothupcandidates', () => {
  it('returns false when u has no out-edge', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const v = new Node(1, 'v', g);
    expect(bothupcandidates(u, v)).toBe(false);
  });
  it('returns false when v has no out-edge', () => {
    const g = new Graph('g', 'directed');
    const u = new Node(0, 'u', g); const h = new Node(1, 'h', g);
    const eu = new Edge(u, h, ''); u.info.out = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g);
    expect(bothupcandidates(u, v)).toBe(false);
  });
  it('returns false when v is not an upcandidate', () => {
    const g = new Graph('g', 'directed');
    const h = new Node(0, 'h', g);
    const u = new Node(1, 'u', g); const eu = new Edge(u, h, ''); u.info.out = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); const ev = new Edge(v, h, ''); v.info.out = { list: [ev], size: 1 };
    expect(bothupcandidates(u, v)).toBe(false);
  });
  it('returns false when e.head !== f.head', () => {
    const g = new Graph('g', 'directed');
    const h1 = new Node(0, 'h1', g); const h2 = new Node(1, 'h2', g);
    const u = new Node(2, 'u', g); const eu = new Edge(u, h1, ''); u.info.out = { list: [eu], size: 1 };
    const v = new Node(3, 'v', g); v.info.node_type = VIRTUAL;
    const ev = new Edge(v, h2, ''); v.info.out = { list: [ev], size: 1 };
    v.info.in = { list: [new Edge(new Node(4, 'p', g), v, '')], size: 1 };
    expect(bothupcandidates(u, v)).toBe(false);
  });
  it('returns false when portcmp(head_port) !== 0 despite sameDir', () => {
    const g = new Graph('g', 'directed');
    const h = new Node(0, 'h', g); h.info.rank = 5;
    const u = new Node(1, 'u', g); u.info.rank = 0;
    const eu = new Edge(u, h, '');
    eu.info.head_port.defined = true; eu.info.head_port.p = { x: 1, y: 0 };
    u.info.out = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); v.info.node_type = VIRTUAL; v.info.rank = 1;
    const ev = new Edge(v, h, '');
    ev.info.head_port.defined = true; ev.info.head_port.p = { x: 2, y: 0 };
    v.info.out = { list: [ev], size: 1 };
    v.info.in = { list: [new Edge(new Node(3, 'p', g), v, '')], size: 1 };
    expect(bothupcandidates(u, v)).toBe(false);
  });
  it('returns true when everything aligns', () => {
    const g = new Graph('g', 'directed');
    const h = new Node(0, 'h', g); h.info.rank = 5;
    const u = new Node(1, 'u', g); u.info.rank = 0;
    const eu = new Edge(u, h, ''); u.info.out = { list: [eu], size: 1 };
    const v = new Node(2, 'v', g); v.info.node_type = VIRTUAL; v.info.rank = 1;
    const ev = new Edge(v, h, ''); v.info.out = { list: [ev], size: 1 };
    v.info.in = { list: [new Edge(new Node(3, 'p', g), v, '')], size: 1 };
    expect(bothupcandidates(u, v)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// resolveDownRep / drainIntoDown / mergeOneOutEdge  @see lib/dotgen/conc.c:mergevirtual
// ---------------------------------------------------------------------------

describe('resolveDownRep', () => {
  it('creates a virtual edge when left has no out-list at all', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const head = new Node(1, 'head', g);
    const orig = new Edge(new Node(2, 'x', g), head, '');
    const e = resolveDownRep(left, head, orig);
    expect(e.tail).toBe(left);
    expect(e.head).toBe(head);
    expect(e.info.edge_type).toBe(VIRTUAL);
    expect(left.info.out?.size).toBe(1);
  });
  it('creates a virtual edge when left has an out-list but none match head', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const otherHead = new Node(1, 'otherHead', g);
    const existing = new Edge(left, otherHead, ''); fastEdge(existing);
    const head = new Node(2, 'head', g);
    const orig = new Edge(new Node(3, 'x', g), head, '');
    const e = resolveDownRep(left, head, orig);
    expect(e.head).toBe(head);
    expect(left.info.out?.size).toBe(2);
  });
  it('returns the existing out-edge to head when found', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const head = new Node(1, 'head', g);
    const existing = new Edge(left, head, ''); fastEdge(existing);
    const orig = new Edge(new Node(2, 'x', g), head, '');
    const e = resolveDownRep(left, head, orig);
    expect(e).toBe(existing);
    expect(left.info.out?.size).toBe(1);
  });
});

describe('drainIntoDown', () => {
  it('deletes e without draining when right has no in-edges (undefined)', () => {
    const g = new Graph('g', 'directed');
    const right = new Node(0, 'right', g);
    const head = new Node(1, 'head', g);
    const f = new Edge(new Node(2, 'left', g), head, '');
    const e = new Edge(right, head, ''); fastEdge(e);
    drainIntoDown(right, f, e);
    expect(right.info.out?.size).toBe(0);
  });
  it('merges every in-edge of right onto f, then deletes e', () => {
    const g = new Graph('g', 'directed');
    const right = new Node(0, 'right', g);
    const head = new Node(1, 'head', g);
    const pred = new Node(2, 'pred', g);
    const inEdge = new Edge(pred, right, ''); fastEdge(inEdge);
    const f = new Edge(new Node(3, 'left', g), head, '');
    const e = new Edge(right, head, ''); fastEdge(e);
    drainIntoDown(right, f, e);
    expect(inEdge.info.to_virt).toBe(f);
    expect(right.info.in?.size).toBe(0);
    expect(right.info.out?.size).toBe(0);
    expect(f.info.count).toBe(2);
  });
});

describe('mergeOneOutEdge', () => {
  it("resolves left's rep edge to right's out head and drains right's in-edges into it", () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    const head = new Node(2, 'head', g);
    const pred = new Node(3, 'pred', g);
    const outEdge = new Edge(right, head, ''); fastEdge(outEdge);
    const inEdge = new Edge(pred, right, ''); fastEdge(inEdge);
    mergeOneOutEdge(left, right);
    expect(left.info.out?.size).toBe(1);
    expect(left.info.out?.list[0].head).toBe(head);
    expect(right.info.out?.size).toBe(0);
    expect(right.info.in?.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// resolveUpRep / drainIntoUp / mergeOneInEdge  @see lib/dotgen/conc.c:mergevirtual
// ---------------------------------------------------------------------------

describe('resolveUpRep', () => {
  it('creates a virtual edge when left has no in-list at all', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const tail = new Node(1, 'tail', g);
    const orig = new Edge(tail, new Node(2, 'x', g), '');
    const e = resolveUpRep(left, tail, orig);
    expect(e.tail).toBe(tail);
    expect(e.head).toBe(left);
    expect(left.info.in?.size).toBe(1);
  });
  it('creates a virtual edge when left has an in-list but none match tail', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const otherTail = new Node(1, 'otherTail', g);
    const existing = new Edge(otherTail, left, ''); fastEdge(existing);
    const tail = new Node(2, 'tail', g);
    const orig = new Edge(tail, new Node(3, 'x', g), '');
    const e = resolveUpRep(left, tail, orig);
    expect(e.tail).toBe(tail);
    expect(left.info.in?.size).toBe(2);
  });
  it('returns the existing in-edge from tail when found', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const tail = new Node(1, 'tail', g);
    const existing = new Edge(tail, left, ''); fastEdge(existing);
    const orig = new Edge(tail, new Node(2, 'x', g), '');
    const e = resolveUpRep(left, tail, orig);
    expect(e).toBe(existing);
    expect(left.info.in?.size).toBe(1);
  });
});

describe('drainIntoUp', () => {
  it('deletes e without draining when right has no out-edges (undefined)', () => {
    const g = new Graph('g', 'directed');
    const right = new Node(0, 'right', g);
    const tail = new Node(1, 'tail', g);
    const f = new Edge(tail, new Node(2, 'left', g), '');
    const e = new Edge(tail, right, ''); fastEdge(e);
    drainIntoUp(right, f, e);
    expect(right.info.in?.size).toBe(0);
  });
  it('merges every out-edge of right onto f, then deletes e', () => {
    const g = new Graph('g', 'directed');
    const right = new Node(0, 'right', g);
    const tail = new Node(1, 'tail', g);
    const succ = new Node(2, 'succ', g);
    const outEdge = new Edge(right, succ, ''); fastEdge(outEdge);
    const f = new Edge(tail, new Node(3, 'left', g), '');
    const e = new Edge(tail, right, ''); fastEdge(e);
    drainIntoUp(right, f, e);
    expect(outEdge.info.to_virt).toBe(f);
    expect(right.info.out?.size).toBe(0);
    expect(right.info.in?.size).toBe(0);
  });
});

describe('mergeOneInEdge', () => {
  it("resolves left's rep edge from right's in tail and drains right's out-edges into it", () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    const tail = new Node(2, 'tail', g);
    const succ = new Node(3, 'succ', g);
    const inEdge = new Edge(tail, right, ''); fastEdge(inEdge);
    const outEdge = new Edge(right, succ, ''); fastEdge(outEdge);
    mergeOneInEdge(left, right);
    expect(left.info.in?.size).toBe(1);
    expect(left.info.in?.list[0].tail).toBe(tail);
    expect(right.info.in?.size).toBe(0);
    expect(right.info.out?.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// absorbNodeDown / absorbNodeUp / mergeVirtual  @see lib/dotgen/conc.c:mergevirtual
// ---------------------------------------------------------------------------

describe('absorbNodeDown', () => {
  it('deletes right immediately when it has no out-edges', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    fastNode(g, right); fastNode(g, left);
    absorbNodeDown(left, right, g);
    expect(g.info.nlist).toBe(left);
  });
  it('drains multiple out-edges of right into left before deleting it', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    fastNode(g, right); fastNode(g, left);
    const h1 = new Node(2, 'h1', g);
    const h2 = new Node(3, 'h2', g);
    const e1 = new Edge(right, h1, ''); fastEdge(e1);
    const e2 = new Edge(right, h2, ''); fastEdge(e2);
    absorbNodeDown(left, right, g);
    expect(left.info.out?.size).toBe(2);
    expect(g.info.nlist).toBe(left);
  });
});

describe('absorbNodeUp', () => {
  it('deletes right immediately when it has no in-edges', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    fastNode(g, right); fastNode(g, left);
    absorbNodeUp(left, right, g);
    expect(g.info.nlist).toBe(left);
  });
  it('drains multiple in-edges of right into left before deleting it', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const right = new Node(1, 'right', g);
    fastNode(g, right); fastNode(g, left);
    const p1 = new Node(2, 'p1', g);
    const p2 = new Node(3, 'p2', g);
    const e1 = new Edge(p1, right, ''); fastEdge(e1);
    const e2 = new Edge(p2, right, ''); fastEdge(e2);
    absorbNodeUp(left, right, g);
    expect(left.info.in?.size).toBe(2);
    expect(g.info.nlist).toBe(left);
  });
});

describe('mergeVirtual', () => {
  it('dispatches to absorbNodeDown for dir=DOWN(1) and compacts the rank slice', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const r1 = new Node(1, 'r1', g);
    const r2 = new Node(2, 'r2', g);
    const after = new Node(3, 'after', g);
    [after, r2, r1, left].forEach((n) => fastNode(g, n));
    g.info.rank = [mkRankEntry([left, r1, r2, after])];
    mergeVirtual(g, 0, 0, 2, 1); // DOWN
    expect(g.info.rank[0].n).toBe(2);
    expect(g.info.rank[0].v[0]).toBe(left);
    expect(g.info.rank[0].v[1]).toBe(after);
  });
  it('dispatches to absorbNodeUp for dir=UP(0) and compacts the rank slice', () => {
    const g = new Graph('g', 'directed');
    const left = new Node(0, 'left', g);
    const r1 = new Node(1, 'r1', g);
    const r2 = new Node(2, 'r2', g);
    const after = new Node(3, 'after', g);
    [after, r2, r1, left].forEach((n) => fastNode(g, n));
    g.info.rank = [mkRankEntry([left, r1, r2, after])];
    mergeVirtual(g, 0, 0, 2, 0); // UP
    expect(g.info.rank[0].n).toBe(2);
    expect(g.info.rank[0].v[0]).toBe(left);
    expect(g.info.rank[0].v[1]).toBe(after);
  });
});

// ---------------------------------------------------------------------------
// infuse / infuseEdgeChain  @see lib/dotgen/conc.c:infuse
// ---------------------------------------------------------------------------

describe('infuse', () => {
  it('returns early (no-op) when g.info.rankleader is undefined', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    infuse(g, n);
    expect(g.info.rankleader).toBeUndefined();
  });
  it('sets rl[r] when there is no existing leader', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const n = new Node(0, 'n', g); n.info.rank = 2;
    infuse(g, n);
    expect(g.info.rankleader[2]).toBe(n);
  });
  it('replaces the leader when its order is greater than n.order (unset n.order -> 0 fallback)', () => {
    const g = new Graph('g', 'directed');
    const lead = new Node(0, 'lead', g); lead.info.order = 5;
    g.info.rankleader = [lead];
    const n = new Node(1, 'n', g);
    infuse(g, n);
    expect(g.info.rankleader[0]).toBe(n);
  });
  it('keeps the existing leader when its order is <= n.order', () => {
    const g = new Graph('g', 'directed');
    const lead = new Node(0, 'lead', g); lead.info.order = 0;
    g.info.rankleader = [lead];
    const n = new Node(1, 'n', g); n.info.order = 3;
    infuse(g, n);
    expect(g.info.rankleader[0]).toBe(lead);
  });
  it('defaults an unset lead.info.order to 0 (?? 0 fallback on the lead side)', () => {
    const g = new Graph('g', 'directed');
    const lead = new Node(0, 'lead', g); // order unset -> ?? 0
    g.info.rankleader = [lead];
    const n = new Node(1, 'n', g); n.info.order = -1;
    infuse(g, n);
    expect(g.info.rankleader[0]).toBe(n); // 0 > -1
  });
});

describe('infuseEdgeChain', () => {
  it('does nothing when e already reaches the head (0 to_virt hops, rank not below target)', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const t = new Node(0, 't', g);
    const h = new Node(1, 'h', g); h.info.rank = 0;
    const e = new Edge(t, h, '');
    infuseEdgeChain(g, e);
    expect(g.info.rankleader).toEqual([]);
  });
  it('defaults an unset head rank to 0 for both targetRank and the loop check (?? 0 fallback)', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const t = new Node(0, 't', g);
    const h = new Node(1, 'h', g); // rank unset -> both ?? 0 fallbacks trigger
    const e = new Edge(t, h, '');
    infuseEdgeChain(g, e);
    expect(g.info.rankleader).toEqual([]);
  });
  it('follows to_virt to the chain head, then infuses ranks strictly below target', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const t = new Node(0, 't', g);
    const mid = new Node(1, 'mid', g); mid.info.rank = 1; mid.info.order = 0;
    const h = new Node(2, 'h', g); h.info.rank = 2;
    const e2 = new Edge(mid, h, '');
    mid.info.out = { list: [e2], size: 1 };
    const e1 = new Edge(t, mid, '');
    const e = new Edge(t, h, '');
    e.info.to_virt = e1;
    infuseEdgeChain(g, e);
    expect(g.info.rankleader[1]).toBe(mid);
    expect(g.info.rankleader[2]).toBeUndefined();
  });
  it('stops the second loop when the chain ends (rep.head.info.out undefined) before reaching target', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const t = new Node(0, 't', g);
    const mid = new Node(1, 'mid', g); mid.info.rank = 2; mid.info.order = 0;
    const h = new Node(2, 'h', g); h.info.rank = 5;
    const e1 = new Edge(t, mid, '');
    const e = new Edge(t, h, '');
    e.info.to_virt = e1;
    infuseEdgeChain(g, e);
    expect(g.info.rankleader[2]).toBe(mid);
  });
});

// ---------------------------------------------------------------------------
// virtNodeInGraph / computeMaxi  @see lib/dotgen/conc.c:rebuild_vlists
// ---------------------------------------------------------------------------

describe('virtNodeInGraph', () => {
  it('returns false when n has no in-edge', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    expect(virtNodeInGraph(g, n)).toBe(false);
  });
  it('follows a to_orig chain before checking membership', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    g.nodes.set('t', t); g.nodes.set('h', h);
    const orig = new Edge(t, h, '');
    const wrapper = new Edge(t, h, ''); wrapper.info.to_orig = orig;
    const n = new Node(2, 'n', g);
    n.info.in = { list: [wrapper], size: 1 };
    expect(virtNodeInGraph(g, n)).toBe(true);
  });
  it('returns false when the tail is missing from g.nodes (short-circuits head check)', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    g.nodes.set('h', h);
    const orig = new Edge(t, h, '');
    const n = new Node(2, 'n', g);
    n.info.in = { list: [orig], size: 1 };
    expect(virtNodeInGraph(g, n)).toBe(false);
  });
  it('returns false when the head is missing from g.nodes', () => {
    const g = new Graph('g', 'directed');
    const t = new Node(0, 't', g); const h = new Node(1, 'h', g);
    g.nodes.set('t', t);
    const orig = new Edge(t, h, '');
    const n = new Node(2, 'n', g);
    n.info.in = { list: [orig], size: 1 };
    expect(virtNodeInGraph(g, n)).toBe(false);
  });
});

describe('computeMaxi', () => {
  it('breaks immediately when rankGet returns undefined (n exceeds v.length)', () => {
    const g = new Graph('g', 'directed');
    g.info.rank = [{ n: 1, v: [], an: 0, av: [], ht1: 0, ht2: 0, pht1: 0, pht2: 0, candidate: false, valid: true, cache_nc: 0 }];
    expect(computeMaxi(g, 0)).toBe(-1);
  });
  it('advances maxi for NORMAL nodes present in g.nodes, breaks on the first absent one', () => {
    const g = new Graph('g', 'directed');
    const a = new Node(0, 'a', g); a.info.node_type = NORMAL;
    const b = new Node(1, 'b', g); b.info.node_type = NORMAL;
    g.nodes.set('a', a);
    g.info.rank = [mkRankEntry([a, b])];
    expect(computeMaxi(g, 0)).toBe(0);
  });
  it('advances maxi for an in-graph VIRTUAL node, continues (no break) past one not in-graph', () => {
    const g = new Graph('g', 'directed');
    const t1 = new Node(0, 't1', g); const h1 = new Node(1, 'h1', g);
    g.nodes.set('t1', t1); g.nodes.set('h1', h1);
    const orig1 = new Edge(t1, h1, '');
    const v1 = new Node(2, 'v1', g); v1.info.node_type = VIRTUAL;
    v1.info.in = { list: [orig1], size: 1 };

    const t2 = new Node(3, 't2', g);
    const h2 = new Node(4, 'h2', g); g.nodes.set('h2', h2);
    const orig2 = new Edge(t2, h2, '');
    const v2 = new Node(5, 'v2', g); v2.info.node_type = VIRTUAL;
    v2.info.in = { list: [orig2], size: 1 };

    const c = new Node(6, 'c', g); c.info.node_type = NORMAL;
    g.nodes.set('c', c);

    g.info.rank = [mkRankEntry([v1, v2, c])];
    expect(computeMaxi(g, 0)).toBe(2);
  });
  it('treats an unset node_type as NORMAL via the ?? NORMAL fallback', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g); // node_type unset -> ?? NORMAL
    g.nodes.set('n', n);
    g.info.rank = [mkRankEntry([n])];
    expect(computeMaxi(g, 0)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// fillRankVlist  @see lib/dotgen/conc.c:rebuild_vlists
// ---------------------------------------------------------------------------

describe('fillRankVlist', () => {
  it('errors and returns -1 when the rankleader for r is null/undefined', () => {
    const g = new Graph('g', 'directed');
    g.info.rank = [mkRankEntry()];
    g.info.rankleader = [undefined as unknown as Node];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillRankVlist(g, 0, g)).toBe(-1);
    expect(spy).toHaveBeenCalledWith('Error: rebuild_vlists: lead is null for rank 0');
    spy.mockRestore();
  });

  it('errors and returns -1 when the root rank does not have the lead at its recorded order', () => {
    const root = new Graph('root', 'directed');
    const other = new Node(0, 'other', root);
    root.info.rank = [mkRankEntry([other])];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    const lead = new Node(1, 'lead', root);
    lead.info.order = 0;
    g.info.rank = [mkRankEntry()];
    g.info.rankleader = [lead];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillRankVlist(g, 0, root)).toBe(-1);
    expect(spy).toHaveBeenCalledWith(
      'Error: rebuild_vlists: rank lead lead not in order 0 of rank 0',
    );
    spy.mockRestore();
  });

  it('defaults an unset lead.info.order to 0 in the order-lookup and error message (?? 0 fallback)', () => {
    const root = new Graph('root', 'directed');
    const decoy = new Node(0, 'decoy', root);
    root.info.rank = [mkRankEntry([decoy])];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    const lead = new Node(1, 'lead2', root); // order unset -> ?? 0
    g.info.rank = [mkRankEntry()];
    g.info.rankleader = [lead];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillRankVlist(g, 0, root)).toBe(-1);
    expect(spy).toHaveBeenCalledWith(
      'Error: rebuild_vlists: rank lead lead2 not in order 0 of rank 0',
    );
    spy.mockRestore();
  });

  it('warns "degenerate concentrated rank" and returns 0 when computeMaxi finds nothing valid', () => {
    const root = new Graph('root', 'directed');
    const lead = new Node(0, 'lead', root);
    lead.info.order = 0;
    lead.info.node_type = NORMAL;
    root.info.rank = [mkRankEntry([lead])];
    const g = new Graph('cluster', 'directed');
    g.root = root; // lead NOT added to g.nodes -> computeMaxi breaks at i=0, maxi stays -1
    // computeMaxi's scan bound is the PRE-EXISTING rank.n (conc.c:170), not
    // v.length after aliasing -- seed n=1 via a placeholder-length array so
    // the loop actually runs and reaches the "not in g.nodes -> break" path.
    g.info.rank = [mkRankEntry([lead])];
    g.info.rankleader = [lead];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillRankVlist(g, 0, root)).toBe(0);
    expect(spy).toHaveBeenCalledWith('Warning: degenerate concentrated rank cluster,0');
    expect(g.info.rank[0].n).toBe(0);
    spy.mockRestore();
  });

  it('fills v/vStart/n on success with no warning', () => {
    const root = new Graph('root', 'directed');
    const lead = new Node(0, 'lead', root);
    lead.info.order = 0;
    lead.info.node_type = NORMAL;
    root.info.rank = [mkRankEntry([lead])];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    g.nodes.set('lead', lead);
    g.info.rank = [mkRankEntry([lead])]; // seeds n=1 so computeMaxi's scan runs
    g.info.rankleader = [lead];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillRankVlist(g, 0, root)).toBe(0);
    expect(spy).not.toHaveBeenCalled();
    expect(g.info.rank[0].v).toBe(root.info.rank[0].v);
    expect(g.info.rank[0].vStart).toBe(0);
    expect(g.info.rank[0].n).toBe(1);
    spy.mockRestore();
  });

  it('defaults an unset lead.info.order to 0 on the success path (order match + vStart)', () => {
    const root = new Graph('root', 'directed');
    const lead = new Node(0, 'lead', root); // order unset -> ?? 0 on both sites
    lead.info.node_type = NORMAL;
    root.info.rank = [mkRankEntry([lead])];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    g.nodes.set('lead', lead);
    g.info.rank = [mkRankEntry([lead])];
    g.info.rankleader = [lead];
    expect(fillRankVlist(g, 0, root)).toBe(0);
    expect(g.info.rank[0].vStart).toBe(0);
    expect(g.info.rank[0].n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// infuseAllNodes / fillAllRankVlists / rebuildClusterVlists / rebuildVlists
// @see lib/dotgen/conc.c:rebuild_vlists
// ---------------------------------------------------------------------------

describe('infuseAllNodes', () => {
  it('infuses each node and walks out-edge chains only for nodes that have one', () => {
    const g = new Graph('g', 'directed');
    g.info.rankleader = [];
    const a = new Node(0, 'a', g); a.info.rank = 0;
    const b = new Node(1, 'b', g); b.info.rank = 1;
    const iso = new Node(2, 'iso', g); iso.info.rank = 2;
    g.nodes.set('a', a); g.nodes.set('b', b); g.nodes.set('iso', iso);
    g.edges.push(new Edge(a, b, ''));
    infuseAllNodes(g);
    expect(g.info.rankleader[0]).toBe(a);
    expect(g.info.rankleader[1]).toBe(b);
    expect(g.info.rankleader[2]).toBe(iso);
  });
});

describe('fillAllRankVlists', () => {
  it('returns 0 and fills every rank on success', () => {
    const root = new Graph('root', 'directed');
    const lead = new Node(0, 'lead', root); lead.info.order = 0; lead.info.node_type = NORMAL;
    root.info.rank = [mkRankEntry([lead])];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    g.nodes.set('lead', lead);
    g.info.rank = [mkRankEntry([lead])]; // seeds n=1 so computeMaxi's scan runs
    g.info.rankleader = [lead];
    g.info.minrank = 0; g.info.maxrank = 0;
    expect(fillAllRankVlists(g)).toBe(0);
    expect(g.info.rank[0].n).toBe(1);
  });
  it('returns the error code early from fillRankVlist without processing later ranks', () => {
    const root = new Graph('root', 'directed');
    root.info.rank = [mkRankEntry(), mkRankEntry()];
    const g = new Graph('cluster', 'directed');
    g.root = root;
    g.info.rank = [mkRankEntry(), mkRankEntry()];
    g.info.rankleader = [undefined as unknown as Node, undefined as unknown as Node];
    g.info.minrank = 0; g.info.maxrank = 1;
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(fillAllRankVlists(g)).toBe(-1);
    spy.mockRestore();
  });
});

describe('rebuildClusterVlists', () => {
  it('returns 0 immediately when n_cluster is 0/unset', () => {
    const g = new Graph('g', 'directed');
    expect(rebuildClusterVlists(g)).toBe(0);
  });
  it('propagates the first non-zero rebuildVlists error and stops', () => {
    const root = new Graph('root', 'directed');
    const decoy = new Node(0, 'decoy', root);
    root.info.rank = [mkRankEntry([decoy])];
    const badClust = new Graph('bad', 'directed');
    badClust.root = root;
    const n = new Node(1, 'n', badClust); n.info.rank = 0; n.info.order = 0; n.info.node_type = NORMAL;
    badClust.nodes.set('n', n);
    fastNode(badClust, n);
    badClust.info.rank = [mkRankEntry()];
    root.info.n_cluster = 1;
    root.info.clust = [badClust];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(rebuildClusterVlists(root)).toBe(-1);
    spy.mockRestore();
  });
});

describe('rebuildVlists', () => {
  it('initializes rankleader when unset, fills successfully with no clusters', () => {
    const root = new Graph('root', 'directed');
    const n = new Node(0, 'n', root); n.info.rank = 0; n.info.order = 0; n.info.node_type = NORMAL;
    root.nodes.set('n', n);
    fastNode(root, n);
    root.info.rank = [mkRankEntry([n])];
    expect(root.info.rankleader).toBeUndefined();
    expect(rebuildVlists(root)).toBe(0);
    expect(root.info.rankleader?.[0]).toBe(n);
    expect(root.info.rank[0].n).toBe(1);
  });
  it('propagates a fillRankVlist "lead not in order" failure', () => {
    const root = new Graph('root', 'directed');
    const decoy = new Node(0, 'decoy', root);
    root.info.rank = [mkRankEntry([decoy])];
    const badClust = new Graph('bad', 'directed');
    badClust.root = root;
    const n = new Node(1, 'n', badClust); n.info.rank = 0; n.info.order = 0; n.info.node_type = NORMAL;
    badClust.nodes.set('n', n);
    fastNode(badClust, n);
    badClust.info.rank = [mkRankEntry()];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(rebuildVlists(badClust)).toBe(-1);
    expect(spy).toHaveBeenCalledWith(
      'Error: rebuild_vlists: rank lead n not in order 0 of rank 0',
    );
    spy.mockRestore();
  });
  it('recurses into rebuildClusterVlists for nested clusters on success', () => {
    const root = new Graph('root', 'directed');
    const n = new Node(0, 'n', root); n.info.rank = 0; n.info.order = 0; n.info.node_type = NORMAL;
    root.nodes.set('n', n);
    fastNode(root, n);
    root.info.rank = [mkRankEntry([n])];
    const child = new Graph('child', 'directed');
    child.root = root;
    child.nodes.set('n', n);
    child.info.rank = [mkRankEntry([n])]; // seeds n=1 so computeMaxi's scan runs
    root.info.n_cluster = 1;
    root.info.clust = [child];
    expect(rebuildVlists(root)).toBe(0);
    expect(child.info.rank[0].n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// concentrateOneRankDown / concentrateOneRankUp  @see lib/dotgen/conc.c:dot_concentrate
// ---------------------------------------------------------------------------

describe('concentrateOneRankDown', () => {
  function mkDownCandidate(g: Graph, id: number, name: string, tail: Node, outHead: Node): Node {
    const v = new Node(id, name, g);
    v.info.node_type = VIRTUAL;
    const inE = new Edge(tail, v, '');
    v.info.in = { list: [inE], size: 1 };
    const outE = new Edge(v, outHead, '');
    v.info.out = { list: [outE], size: 1 };
    return v;
  }

  it('skips a non-downcandidate left node (continue)', () => {
    const g = new Graph('g', 'directed');
    const normal = new Node(0, 'normal', g); normal.info.node_type = NORMAL;
    g.info.rank = [mkRankEntry([normal])];
    concentrateOneRankDown(g, 0);
    expect(g.info.rank[0].n).toBe(1);
  });

  it('merges a run of matching downcandidates sharing a tail', () => {
    const g = new Graph('g', 'directed');
    const p = new Node(0, 'p', g); p.info.rank = 0;
    const normal = new Node(1, 'normal', g); normal.info.node_type = NORMAL;
    const other1 = new Node(2, 'other1', g);
    const other2 = new Node(3, 'other2', g);
    const v1 = mkDownCandidate(g, 4, 'v1', p, other1); v1.info.rank = 1;
    const v2 = mkDownCandidate(g, 5, 'v2', p, other2); v2.info.rank = 1;
    g.info.rank = [mkRankEntry([normal, v1, v2])];
    concentrateOneRankDown(g, 0);
    expect(g.info.rank[0].n).toBe(2);
    expect(g.info.rank[0].v[0]).toBe(normal);
    expect(g.info.rank[0].v[1]).toBe(v1);
  });

  it('does not merge a single unmatched downcandidate (different tails)', () => {
    const g = new Graph('g', 'directed');
    const p1 = new Node(0, 'p1', g);
    const p2 = new Node(1, 'p2', g);
    const other = new Node(2, 'other', g);
    const v1 = mkDownCandidate(g, 3, 'v1', p1, other);
    const v2 = mkDownCandidate(g, 4, 'v2', p2, other);
    g.info.rank = [mkRankEntry([v1, v2])];
    concentrateOneRankDown(g, 0);
    expect(g.info.rank[0].n).toBe(2);
  });
});

describe('concentrateOneRankUp', () => {
  function mkUpCandidate(g: Graph, id: number, name: string, inTail: Node, head: Node): Node {
    const v = new Node(id, name, g);
    v.info.node_type = VIRTUAL;
    const outE = new Edge(v, head, '');
    v.info.out = { list: [outE], size: 1 };
    const inE = new Edge(inTail, v, '');
    v.info.in = { list: [inE], size: 1 };
    return v;
  }

  it('skips a non-upcandidate left node (continue)', () => {
    const g = new Graph('g', 'directed');
    const normal = new Node(0, 'normal', g); normal.info.node_type = NORMAL;
    g.info.rank = [mkRankEntry([normal])];
    concentrateOneRankUp(g, 0);
    expect(g.info.rank[0].n).toBe(1);
  });

  it('merges a run of matching upcandidates sharing a head', () => {
    const g = new Graph('g', 'directed');
    const h = new Node(0, 'h', g); h.info.rank = 5;
    const normal = new Node(1, 'normal', g); normal.info.node_type = NORMAL;
    const in1 = new Node(2, 'in1', g);
    const in2 = new Node(3, 'in2', g);
    const v1 = mkUpCandidate(g, 4, 'v1', in1, h); v1.info.rank = 4;
    const v2 = mkUpCandidate(g, 5, 'v2', in2, h); v2.info.rank = 4;
    g.info.rank = [mkRankEntry([normal, v1, v2])];
    concentrateOneRankUp(g, 0);
    expect(g.info.rank[0].n).toBe(2);
    expect(g.info.rank[0].v[1]).toBe(v1);
  });

  it('does not merge a single unmatched upcandidate (different heads)', () => {
    const g = new Graph('g', 'directed');
    const h1 = new Node(0, 'h1', g);
    const h2 = new Node(1, 'h2', g);
    const inN = new Node(2, 'inN', g);
    const v1 = mkUpCandidate(g, 3, 'v1', inN, h1);
    const v2 = mkUpCandidate(g, 4, 'v2', inN, h2);
    g.info.rank = [mkRankEntry([v1, v2])];
    concentrateOneRankUp(g, 0);
    expect(g.info.rank[0].n).toBe(2);
  });
});

// ---------------------------------------------------------------------------
// runDownPass / runUpPass  @see lib/dotgen/conc.c:dot_concentrate
// ---------------------------------------------------------------------------

describe('runDownPass', () => {
  it('stops immediately when rankArr[r+1] is undefined (array shorter than expected)', () => {
    const g = new Graph('g', 'directed');
    const n0 = new Node(0, 'n0', g);
    g.info.rank = [mkRankEntry([n0])];
    g.info.minrank = 0; g.info.maxrank = 5;
    expect(runDownPass(g)).toBe(1);
  });
  it('stops immediately when the next rank exists but is empty (n=0)', () => {
    const g = new Graph('g', 'directed');
    g.info.rank = [mkRankEntry(), mkRankEntry(), mkRankEntry()];
    g.info.minrank = 0; g.info.maxrank = 5;
    expect(runDownPass(g)).toBe(1);
  });
  it('executes the body for intermediate ranks before stopping at the array bound', () => {
    const g = new Graph('g', 'directed');
    const nodes = [0, 1, 2].map((i) => new Node(i, `n${i}`, g));
    g.info.rank = nodes.map((n) => mkRankEntry([n]));
    g.info.minrank = 0; g.info.maxrank = 2;
    expect(runDownPass(g)).toBe(2);
  });
});

describe('runUpPass', () => {
  it('does nothing when startR is 0 (loop condition r>0 false immediately)', () => {
    const g = new Graph('g', 'directed');
    const n = new Node(0, 'n', g);
    g.info.rank = [mkRankEntry([n])];
    runUpPass(g, 0);
    expect(g.info.rank[0].n).toBe(1);
  });
  it('walks down from startR to 1, calling concentrateOneRankUp each time', () => {
    const g = new Graph('g', 'directed');
    const nodes = [0, 1, 2].map((i) => new Node(i, `n${i}`, g));
    g.info.rank = nodes.map((n) => mkRankEntry([n]));
    runUpPass(g, 2);
    expect(g.info.rank[1].n).toBe(1);
    expect(g.info.rank[2].n).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// dotConcentrate  @see lib/dotgen/conc.c:dot_concentrate
// ---------------------------------------------------------------------------

describe('dotConcentrate', () => {
  it('returns 0 immediately when the rank span is <= 1', () => {
    const g = new Graph('g', 'directed');
    g.info.minrank = 0; g.info.maxrank = 1;
    expect(dotConcentrate(g)).toBe(0);
  });
  it('returns 0 with no clusters to process after the down/up passes', () => {
    const g = new Graph('g', 'directed');
    const nodes = [0, 1, 2, 3].map((i) => new Node(i, `n${i}`, g));
    g.info.rank = nodes.map((n) => mkRankEntry([n]));
    g.info.minrank = 0; g.info.maxrank = 3;
    expect(dotConcentrate(g)).toBe(0);
  });
  it('reports the continuation warning and returns -1 when a cluster fails rebuild_vlists', () => {
    const g = new Graph('g', 'directed');
    const nodes = [0, 1, 2, 3].map((i) => new Node(i, `n${i}`, g));
    g.info.rank = nodes.map((n) => mkRankEntry([n]));
    g.info.minrank = 0; g.info.maxrank = 3;
    const decoy = new Node(4, 'decoy', g);
    g.info.rank[0] = mkRankEntry([decoy]);
    const badClust = new Graph('bad', 'directed');
    badClust.root = g;
    const cn = new Node(5, 'cn', badClust); cn.info.rank = 0; cn.info.order = 0; cn.info.node_type = NORMAL;
    badClust.nodes.set('cn', cn);
    fastNode(badClust, cn);
    badClust.info.rank = [mkRankEntry()];
    g.info.n_cluster = 1;
    g.info.clust = [badClust];
    const spy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(dotConcentrate(g)).toBe(-1);
    expect(spy).toHaveBeenCalledWith('concentrate=true may not work correctly.');
    spy.mockRestore();
  });
});
