// SPDX-License-Identifier: EPL-2.0
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { HIER_GRAPHS } from '../../../test/helpers/hier-graphs.js';
import { parse } from '../../index.js';
import { acyclic, dfsCycle, makeGraphDataC } from './make-graph-data.js';
import { assignNodeIds, MODE_HIER, MODE_IPSEP } from './init.js';
import type { DirectedVtxData } from './opt-arrangement.js';

const PROBE = 'digraph{mode=hier;a->b->c->d->e->f;a->d;b->e;c->f}';
const C1554 = readFileSync(new URL('./__fixtures__/hier/c1554.gv', import.meta.url), 'utf8');

function build(src: string, haveLen: boolean, mode = MODE_HIER): DirectedVtxData[] {
  const g = parse(src);
  return makeGraphDataC(g, assignNodeIds(g), haveLen, true, mode);
}

const rowsOf = (v: DirectedVtxData[]) => v.map((r) => ({
  edges: r.edges, edists: Array.from(r.edists as ArrayLike<number>),
}));

describe('makeGraphDataC edists (neatoinit.c:makeGraphData)', () => {
  it('equals the native vtx_data of the probe graph (edges and edists)', () => {
    const expected = HIER_GRAPHS.probe.rows.map((r) => ({ edges: r.edges, edists: r.edists }));
    expect(rowsOf(build(PROBE, false))).toEqual(expected);
  });

  it('marks tail -1 and head +1 on first-seen edges', () => {
    const v = build('digraph{a->b; b->c; c->d}', false);
    expect(rowsOf(v).map((r) => r.edists)).toEqual([[0, -1], [0, -1, 1], [0, -1, 1], [0, 1]]);
  });

  it('treats dir=none as direction 0, which acyclic() then orients by DFS order', () => {
    // b->a [dir=none]: the DFS from a reaches b, whose 0-edge back to a is a back
    // edge, so it is reversed: a keeps -1, b becomes +1 (as if the edge were a->b)
    const v = build('digraph{a; b; b->a [dir=none]}', false);
    expect(rowsOf(v).map((r) => r.edists)).toEqual([[0, -1], [0, 1]]);
    // dir values are matched by prefix: "nonesuch" is also none
    const w = build('digraph{a; b; b->a [dir=nonesuch]}', false);
    expect(rowsOf(w).map((r) => r.edists)).toEqual([[0, -1], [0, 1]]);
    // any other value is an ordinary edge: b stays the tail
    const x = build('digraph{a; b; b->a [dir=back]}', false);
    expect(rowsOf(x).map((r) => r.edists)).toEqual([[0, 1], [0, -1]]);
  });

  it('is absent (C NULL) when haveDir is off', () => {
    const g = parse('digraph{a->b}');
    expect(makeGraphDataC(g, assignNodeIds(g), false, false)[0]!.edists).toBeUndefined();
  });

  it('keeps the direction of the first of several multi-edges', () => {
    const v = build('digraph{a->b; b->a}', false);
    expect(v[0]!.edists).toEqual([0, -1]);
    expect(v[1]!.edists).toEqual([0, 1]);
  });
});

describe('acyclic / dfsCycle', () => {
  it('reverses the back edge of a directed cycle at both ends', () => {
    const v = build('digraph{a->b->c->a}', false);
    // a->b, b->c stay; c->a is the back edge found from c, reversed to an in-edge at c
    expect(v[0]!.edists).toEqual([0, -1, -1]);
    expect(v[1]!.edists).toEqual([0, -1, 1]);
    expect(v[2]!.edists).toEqual([0, 1, 1]);
  });

  it('IPSEP mode makes the back edge an in-edge at both ends', () => {
    const v = build('digraph{a->b->c->a}', false, MODE_IPSEP);
    expect(v[2]!.edists).toEqual([0, -1, 1]); // c->a stays -1 at c ...
    expect(v[0]!.edists).toEqual([0, -1, -1]); // ... and a's entry for c becomes -1 too
  });

  it('equals the native vtx_data of the 1554 graph after acyclic()', () => {
    const expected = HIER_GRAPHS.c1554.rows.map((r) => ({ edges: r.edges, edists: r.edists }));
    expect(rowsOf(build(C1554, true))).toEqual(expected);
  });

  it('does not overflow the stack on a long path', () => {
    const n = 20000;
    const graph: DirectedVtxData[] = Array.from({ length: n }, (_, i) => {
      const edges = [i, ...(i + 1 < n ? [i + 1] : []), ...(i > 0 ? [i - 1] : [])];
      const edists = [0, ...(i + 1 < n ? [-1] : []), ...(i > 0 ? [1] : [])];
      return { nedges: edges.length, edges, ewgts: edges.map(() => 1), edists };
    });
    acyclic(graph, n, MODE_HIER);
    expect(graph[n - 2]!.edists).toEqual([0, -1, 1]);
  });

  it('throws when a back edge has no reverse entry', () => {
    const broken: DirectedVtxData[] = [
      { nedges: 2, edges: [0, 1], ewgts: [0, 1], edists: [0, -1] },
      { nedges: 2, edges: [1, 2], ewgts: [0, 1], edists: [0, -1] },
      { nedges: 2, edges: [2, 0], ewgts: [0, 1], edists: [0, -1] }, // 2->0 closes the cycle; 0 lacks 2
    ];
    const st = { mode: MODE_HIER, mark: new Uint8Array(3), onstack: new Uint8Array(3) };
    expect(() => dfsCycle(broken, 0, st)).toThrow(/no reverse entry/);
  });
});
