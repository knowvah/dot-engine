// SPDX-License-Identifier: EPL-2.0
//
// mode=ipsep without constraints: C runs stress_majorization_cola, whose APSP
// is always compute_apsp_packed (bfs over makeGraphData's haveDir ewgts),
// never compute_weighted_apsp_packed.
// @see lib/neatogen/neatoinit.c:makeGraphData
// @see lib/neatogen/constrained_majorization_ipsep.c:stress_majorization_cola

import { describe, it, expect } from 'vitest';
import { parse, render } from '../../index.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { Edge } from '../../model/edge.js';
import { assignNodeIds, makeGraphDataC } from './init.js';

const nodeLines = async (src: string): Promise<string[]> =>
  String(await render(parse(src), 'plain', { engine: 'neato' }))
    .split('\n').filter((l) => l.startsWith('node '))
    .map((l) => l.split(' ').slice(1, 4).join(' '));

const EDGES = 'b--c; d--e; e--f; f--a; a--d';

/** Native 16.1.0 `-Kneato -Tplain` node positions (inches). */
const NATIVE_IPSEP_LEN = [
  'a 1.6811 2.7112', 'b 1.3818 0.42742', 'c 0.375 0.25',
  'd 0.97211 3.5625', 'e 1.7756 4.2987', 'f 2.4856 3.4706',
];
const NATIVE_IPSEP_NOLEN = [
  'a 0.375 1.377', 'b 1.1813 0.32731', 'c 0.44905 0.25',
  'd 1.2812 1.2832', 'e 1.4689 2.3797', 'f 0.42102 2.4925',
];
/** Native mode=major on the len graph: differs from ipsep. */
const NATIVE_MAJOR_LEN = [
  'a 1.8276 2.6008', 'b 1.3478 0.52869', 'c 0.375 0.25',
  'd 1.0483 3.3605', 'e 1.8008 4.1479', 'f 2.5751 3.3837',
];

function twoNodeDup(): { g: Graph; withLen: Edge } {
  const g = new Graph('g', 'undirected');
  const a = new Node(0, 'A', g); const b = new Node(1, 'B', g);
  g.nodes.set('A', a); g.nodes.set('B', b);
  const withLen = new Edge(a, b, 'AB1');
  g.edges.push(withLen, new Edge(a, b, 'AB2'));
  return { g, withLen };
}

describe('makeGraphDataC haveDir (C neatoinit.c:827)', () => {
  it('stores 1.0 per merged neighbour when there is no len', () => {
    const { g } = twoNodeDup();
    const vtx = makeGraphDataC(g, assignNodeIds(g), false, true);
    expect(vtx[0]).toEqual({ nedges: 2, edges: [0, 1], ewgts: [0, 1], edists: [0, -1] });
    expect(vtx[1]).toEqual({ nedges: 2, edges: [1, 0], ewgts: [0, 1], edists: [0, 1] });
  });

  it('with len, a repeated neighbour keeps the max len', () => {
    const { g, withLen } = twoNodeDup();
    withLen.attrs.set('len', '2');
    const vtx = makeGraphDataC(g, assignNodeIds(g), true, true);
    expect(vtx[0]!.ewgts).toEqual([0, 2]);
  });

  it('without haveDir or haveLen, ewgts stay absent', () => {
    const { g } = twoNodeDup();
    expect(makeGraphDataC(g, assignNodeIds(g), false, false)[0]!.ewgts).toEqual([]);
  });
});

describe('mode=ipsep renders as native', () => {
  it('repeated edge with len uses bfs distances, not Dijkstra', async () => {
    const lines = await nodeLines(`graph G { mode=ipsep; a--b [len=2]; a--b; c--d [len=3]; ${EDGES} }`);
    expect(lines).toEqual(NATIVE_IPSEP_LEN);
  });

  it('repeated edge without len', async () => {
    expect(await nodeLines(`graph G { mode=ipsep; a--b; a--b; c--d; ${EDGES} }`))
      .toEqual(NATIVE_IPSEP_NOLEN);
  });

  it('mode=major on the len graph keeps the weighted APSP', async () => {
    expect(await nodeLines(`graph G { a--b [len=2]; a--b; c--d [len=3]; ${EDGES} }`))
      .toEqual(NATIVE_MAJOR_LEN);
  });
});
