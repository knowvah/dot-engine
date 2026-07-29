// SPDX-License-Identifier: EPL-2.0

/**
 * T4b — branch coverage for layout/dot/flat-utils.ts.
 *
 * Trivial `!== undefined` accessors; each has a defined-value branch
 * (mostly already exercised through the full pipeline, hence the file's
 * partial starting coverage) and an undefined-fallback-to-0 branch. This
 * file drives both outcomes of every accessor directly.
 *
 * @see lib/dotgen/flat.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { makeNodeInfo } from '../../model/nodeInfo.js';
import type { RankEntry } from '../../model/rankEntry.js';
import {
  nodeOrder, nodeRank, graphNodesep, graphMaxrank, graphMinrank, graphNCluster,
  getOrd,
} from './flat-utils.js';

function makeNode(g: Graph): Node {
  const n = new Node(0, 'n', g);
  n.info = makeNodeInfo();
  return n;
}

describe('nodeOrder', () => {
  it('returns the set order', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    n.info.order = 7;
    expect(nodeOrder(n)).toBe(7);
  });
  it('defaults to 0 when order is unset', () => {
    const g = new Graph('g', 'directed');
    expect(nodeOrder(makeNode(g))).toBe(0);
  });
});

describe('nodeRank', () => {
  it('returns the set rank', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    n.info.rank = 3;
    expect(nodeRank(n)).toBe(3);
  });
  it('defaults to 0 when rank is unset', () => {
    const g = new Graph('g', 'directed');
    expect(nodeRank(makeNode(g))).toBe(0);
  });
});

describe('graphNodesep', () => {
  it('returns the set nodesep', () => {
    const g = new Graph('g', 'directed');
    g.info.nodesep = 18;
    expect(graphNodesep(g)).toBe(18);
  });
  it('defaults to 0 when nodesep is unset', () => {
    expect(graphNodesep(new Graph('g', 'directed'))).toBe(0);
  });
});

describe('graphMaxrank', () => {
  it('returns the set maxrank', () => {
    const g = new Graph('g', 'directed');
    g.info.maxrank = 4;
    expect(graphMaxrank(g)).toBe(4);
  });
  it('defaults to 0 when maxrank is unset', () => {
    expect(graphMaxrank(new Graph('g', 'directed'))).toBe(0);
  });
});

describe('graphMinrank', () => {
  it('returns the set minrank', () => {
    const g = new Graph('g', 'directed');
    g.info.minrank = 1;
    expect(graphMinrank(g)).toBe(1);
  });
  it('defaults to 0 when minrank is unset', () => {
    expect(graphMinrank(new Graph('g', 'directed'))).toBe(0);
  });
});

describe('graphNCluster', () => {
  it('returns the set n_cluster', () => {
    const g = new Graph('g', 'directed');
    g.info.n_cluster = 2;
    expect(graphNCluster(g)).toBe(2);
  });
  it('defaults to 0 when n_cluster is unset', () => {
    expect(graphNCluster(new Graph('g', 'directed'))).toBe(0);
  });
});

describe('getOrd', () => {
  function makeRankEntry(nodes: Node[]): RankEntry {
    return {
      n: nodes.length, v: [...nodes], an: 0, av: [],
      ht1: 20, ht2: 20, pht1: 20, pht2: 20,
      candidate: false, valid: false, cache_nc: 0,
    };
  }

  it('returns the set order at index i', () => {
    const g = new Graph('g', 'directed');
    const n = makeNode(g);
    n.info.order = 9;
    expect(getOrd(makeRankEntry([n]), 0)).toBe(9);
  });
  it('defaults to 0 when the node at index i has no order', () => {
    const g = new Graph('g', 'directed');
    expect(getOrd(makeRankEntry([makeNode(g)]), 0)).toBe(0);
  });
});
