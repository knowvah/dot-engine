// SPDX-License-Identifier: EPL-2.0

/**
 * T4f — branch-coverage tests for layout/patchwork/index.ts.
 *
 * patchwork.test.ts only exercises the high-level patchworkLayout/treeMap/
 * layoutTreeMargin/PATCHWORK_LAYOUT_ENGINE surface. This file drives the
 * individual tree-construction, area-computation, cluster-detection, and
 * finishNodes helpers directly against hand-built Graph/Node fixtures.
 *
 * @see lib/patchwork/patchwork.c
 * @see lib/patchwork/patchworkinit.c
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import {
  getArea, getInset, fullArea,
  makeGraphTreeNode, makeNodeTreeNode,
  accumAppend, appendClusterChildren, appendNodeChildren, finaliseTreeNode,
  mkTree, layoutTreeMargin, collectSortedChildren, computeFillRect, assignRecs,
  recurseGraphChildren, placeLayoutRecs, layoutTree,
  applyGraphRect, applyLeafRect, walkTree,
  isCluster, collectClusters, mkClusters,
  patchworkLayout, finishNodes, patchworkEngineLayout, patchworkEngineCleanup,
  type TreeNode, type ChildAccum,
} from './index.js';

function makeGraph(name = 'G'): Graph {
  return new Graph(name, 'directed');
}

function makeNode(g: Graph, name: string): Node {
  const n = new Node(g.nodes.size, name, g);
  g.nodes.set(name, n);
  return n;
}

describe('getArea', () => {
  it('returns DFLT_SZ*SCALE (1000) when the attr is absent', () => {
    expect(getArea(new Map())).toBe(1000);
  });

  it('parses a numeric area attr and scales by 1000', () => {
    expect(getArea(new Map([['area', '2.5']]))).toBe(2500);
  });

  it('falls back to DFLT_SZ when the parsed value is not finite (NaN)', () => {
    expect(getArea(new Map([['area', 'not-a-number']]))).toBe(1000);
  });

  it('falls back to DFLT_SZ when the parsed value is exactly 0', () => {
    expect(getArea(new Map([['area', '0']]))).toBe(1000);
  });
});

describe('getInset', () => {
  it('returns 0 when the attr is absent', () => {
    expect(getInset(new Map())).toBe(0);
  });

  it('parses a numeric inset attr', () => {
    expect(getInset(new Map([['inset', '4.5']]))).toBe(4.5);
  });

  it('returns 0 when the parsed value is not finite (NaN)', () => {
    expect(getInset(new Map([['inset', 'nope']]))).toBe(0);
  });
});

describe('fullArea', () => {
  it('computes (2*inset + sqrt(childArea))^2', () => {
    // inset=1, childArea=9 -> (2+3)^2 = 25
    expect(fullArea(9, 1)).toBe(25);
  });
});

describe('makeGraphTreeNode / makeNodeTreeNode', () => {
  it('makeGraphTreeNode builds a blank graph-kind node', () => {
    const g = makeGraph();
    const tn = makeGraphTreeNode(g);
    expect(tn.kind).toBe('graph');
    expect(tn.ref).toBe(g);
    expect(tn.area).toBe(0);
  });

  it('makeNodeTreeNode builds a leaf node-kind node with its area precomputed', () => {
    const g = makeGraph();
    const n = makeNode(g, 'a');
    n.attrs.set('area', '4');
    const tn = makeNodeTreeNode(n);
    expect(tn.kind).toBe('node');
    expect(tn.ref).toBe(n);
    expect(tn.area).toBe(4000);
  });
});

describe('accumAppend', () => {
  it('sets accum.first on the first append and links prev.rightSib on later ones', () => {
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    const g = makeGraph();
    const c1 = makeNodeTreeNode(makeNode(g, 'a'));
    const c2 = makeNodeTreeNode(makeNode(g, 'b'));
    accumAppend(accum, c1);
    expect(accum.first).toBe(c1);
    expect(accum.nChildren).toBe(1);
    accumAppend(accum, c2);
    expect(c1.rightSib).toBe(c2);
    expect(accum.nChildren).toBe(2);
    expect(accum.area).toBe(c1.area + c2.area);
  });
});

describe('appendClusterChildren', () => {
  it('does nothing when g.info.clust is undefined (?? [] branch)', () => {
    const g = makeGraph();
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    appendClusterChildren(g, new Map(), accum);
    expect(accum.nChildren).toBe(0);
  });

  it('recursively builds a TreeNode for each cluster subgraph', () => {
    const g = makeGraph();
    const clusterG = new Graph('cluster0', 'directed');
    clusterG.root = g;
    makeNode(clusterG, 'cn');
    g.info.clust = [clusterG];
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    appendClusterChildren(g, new Map(), accum);
    expect(accum.nChildren).toBe(1);
    expect(accum.first?.kind).toBe('graph');
    expect(accum.first?.ref).toBe(clusterG);
  });
});

describe('appendNodeChildren', () => {
  it('skips nodes already claimed by sparent', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a');
    const b = makeNode(g, 'b');
    const sparent = new Map([[a, g]]);
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    appendNodeChildren(g, sparent, accum);
    expect(accum.nChildren).toBe(1);
    expect(accum.first?.ref).toBe(b);
  });

  it('claims every unclaimed node into sparent', () => {
    const g = makeGraph();
    const a = makeNode(g, 'a');
    const sparent = new Map();
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    appendNodeChildren(g, sparent, accum);
    expect(sparent.get(a)).toBe(g);
  });
});

describe('finaliseTreeNode', () => {
  it('with children: sets childArea/area via fullArea and leftChild', () => {
    const g = makeGraph();
    const p = makeGraphTreeNode(g);
    const child = makeNodeTreeNode(makeNode(g, 'a'));
    const accum: ChildAccum = { first: child, prev: child, area: child.area, nChildren: 1 };
    finaliseTreeNode(p, g, accum);
    expect(p.nChildren).toBe(1);
    expect(p.childArea).toBe(child.area);
    expect(p.leftChild).toBe(child);
  });

  it('with no children: area falls back to getArea(g.attrs)', () => {
    const g = makeGraph();
    g.attrs.set('area', '3');
    const p = makeGraphTreeNode(g);
    const accum: ChildAccum = { first: null, prev: null, area: 0, nChildren: 0 };
    finaliseTreeNode(p, g, accum);
    expect(p.area).toBe(3000);
    expect(p.leftChild).toBeNull();
  });
});

describe('mkTree', () => {
  it('builds a tree combining cluster and node children', () => {
    const g = makeGraph();
    makeNode(g, 'a');
    makeNode(g, 'b');
    const tree = mkTree(g, new Map());
    expect(tree.nChildren).toBe(2);
  });
});

describe('collectSortedChildren / recurseGraphChildren / applyGraphRect / applyLeafRect / walkTree', () => {
  it('collects siblings via the rightSib chain and sorts descending by area', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    const small: TreeNode = { area: 1, childArea: 0, r: { x: [0, 0], size: [0, 0] }, leftChild: null, rightSib: null, kind: 'node', ref: makeNode(g, 'small'), nChildren: 0 };
    const big: TreeNode = { area: 100, childArea: 0, r: { x: [0, 0], size: [0, 0] }, leftChild: null, rightSib: null, kind: 'node', ref: makeNode(g, 'big'), nChildren: 0 };
    small.rightSib = big;
    tree.leftChild = small;
    const sorted = collectSortedChildren(tree);
    expect(sorted.map((n) => n.area)).toEqual([100, 1]);
  });

  it('recurseGraphChildren only recurses into graph-kind children', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    const subG = new Graph('sub', 'directed');
    const graphChild: TreeNode = { area: 4, childArea: 0, r: { x: [0, 0], size: [2, 2] }, leftChild: null, rightSib: null, kind: 'graph', ref: subG, nChildren: 0 };
    const leafChild: TreeNode = { area: 4, childArea: 0, r: { x: [0, 0], size: [2, 2] }, leftChild: null, rightSib: null, kind: 'node', ref: makeNode(g, 'leaf'), nChildren: 0 };
    graphChild.rightSib = leafChild;
    tree.leftChild = graphChild;
    // layoutTree(graphChild) is a no-op since graphChild.nChildren===0, so
    // this just verifies no throw and the leaf is skipped (kind !== 'graph').
    expect(() => recurseGraphChildren(tree)).not.toThrow();
  });

  it('applyGraphRect writes a centered bb from tree.r and recurses into children first', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    tree.r = { x: [10, 20], size: [4, 6] };
    applyGraphRect(tree);
    expect(g.info.bb).toEqual({ ll: { x: 8, y: 17 }, ur: { x: 12, y: 23 } });
  });

  it('applyLeafRect writes coord/width/height/lw/rw/ht from tree.r', () => {
    const g = makeGraph();
    const n = makeNode(g, 'a');
    const tree: TreeNode = { area: 1, childArea: 0, r: { x: [5, 7], size: [8, 4] }, leftChild: null, rightSib: null, kind: 'node', ref: n, nChildren: 0 };
    applyLeafRect(tree);
    expect(n.info.coord).toEqual({ x: 5, y: 7 });
    expect(n.info.ht).toBe(4);
    expect(n.info.lw).toBe(4);
    expect(n.info.rw).toBe(4);
  });

  it('walkTree dispatches to applyGraphRect for kind=graph and applyLeafRect for kind=node', () => {
    const g = makeGraph();
    const graphTn = makeGraphTreeNode(g);
    graphTn.r = { x: [0, 0], size: [2, 2] };
    walkTree(graphTn);
    expect(g.info.bb).toBeDefined();

    const n = makeNode(g, 'leaf');
    const leafTn: TreeNode = { area: 1, childArea: 0, r: { x: [1, 1], size: [2, 2] }, leftChild: null, rightSib: null, kind: 'node', ref: n, nChildren: 0 };
    walkTree(leafTn);
    expect(n.info.coord).toEqual({ x: 1, y: 1 });
  });
});

describe('computeFillRect / assignRecs / placeLayoutRecs / layoutTree', () => {
  it('computeFillRect shrinks the rect by the margin solving (h-m)(w-m)=childArea', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    tree.r = { x: [0, 0], size: [8, 10] };
    tree.childArea = 64;
    const fill = computeFillRect(tree);
    expect(fill.size[0]).toBeCloseTo(8 - layoutTreeMargin(10, 8, 64), 10);
  });

  it('assignRecs maps recs onto nodes by index', () => {
    const g = makeGraph();
    const n1: TreeNode = { area: 1, childArea: 0, r: { x: [0, 0], size: [0, 0] }, leftChild: null, rightSib: null, kind: 'node', ref: makeNode(g, 'a'), nChildren: 0 };
    assignRecs([n1], [{ x: [9, 9], size: [1, 1] }]);
    expect(n1.r).toEqual({ x: [9, 9], size: [1, 1] });
  });

  it('placeLayoutRecs returns early (no throw) when treeMap overflows and returns null', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    // childArea vastly exceeds the fill rect area -> treeMap returns null.
    tree.r = { x: [0, 0], size: [1, 1] };
    tree.childArea = 1e12;
    const child = makeNodeTreeNode(makeNode(g, 'a'));
    child.area = 1e12;
    expect(() => placeLayoutRecs(tree, [child])).not.toThrow();
  });

  it('layoutTree is a no-op when nChildren === 0', () => {
    const g = makeGraph();
    const tree = makeGraphTreeNode(g);
    expect(() => layoutTree(tree)).not.toThrow();
    expect(tree.r).toEqual({ x: [0, 0], size: [0, 0] });
  });
});

describe('isCluster', () => {
  it('the root graph is always a cluster', () => {
    const g = makeGraph();
    expect(isCluster(g)).toBe(true);
  });

  it('a subgraph named "cluster..." (case-insensitive) is a cluster', () => {
    const root = makeGraph();
    const sub = new Graph('Cluster_foo', 'directed');
    sub.root = root;
    expect(isCluster(sub)).toBe(true);
  });

  it('a subgraph with a truthy cluster= attribute is a cluster', () => {
    const root = makeGraph();
    const sub = new Graph('other', 'directed');
    sub.root = root;
    sub.attrs.set('cluster', 'true');
    expect(isCluster(sub)).toBe(true);
  });

  it('a plain subgraph with no cluster markers is not a cluster', () => {
    const root = makeGraph();
    const sub = new Graph('other', 'directed');
    sub.root = root;
    expect(isCluster(sub)).toBe(false);
  });
});

describe('collectClusters / mkClusters', () => {
  it('a cluster subgraph is collected and its own subgraphs are scanned via mkClusters recursion', () => {
    const root = makeGraph();
    const outer = new Graph('cluster_outer', 'directed');
    outer.root = root;
    const inner = new Graph('cluster_inner', 'directed');
    inner.root = root;
    outer.subgraphs.set('cluster_inner', inner);
    root.subgraphs.set('cluster_outer', outer);
    const clusters: Graph[] = [];
    collectClusters(root, clusters);
    expect(clusters).toContain(outer);
    // mkClusters(outer) populates outer.info.clust with its OWN local
    // accumulator (not the caller's `clusters` array) — inner appears there.
    expect(outer.info.clust).toContain(inner);
  });

  it('a non-cluster subgraph is not collected but its children ARE scanned', () => {
    const root = makeGraph();
    const plain = new Graph('plain', 'directed');
    plain.root = root;
    const nestedCluster = new Graph('cluster_nested', 'directed');
    nestedCluster.root = root;
    plain.subgraphs.set('cluster_nested', nestedCluster);
    root.subgraphs.set('plain', plain);
    const clusters: Graph[] = [];
    collectClusters(root, clusters);
    expect(clusters).not.toContain(plain);
    expect(clusters).toContain(nestedCluster);
  });

  it('mkClusters populates g.info.clust and n_cluster', () => {
    const root = makeGraph();
    const c = new Graph('cluster_a', 'directed');
    c.root = root;
    root.subgraphs.set('cluster_a', c);
    mkClusters(root);
    expect(root.info.clust).toEqual([c]);
    expect(root.info.n_cluster).toBe(1);
  });
});

describe('finishNodes', () => {
  it('leaves fontsize untouched when it is not declared anywhere', () => {
    const g = makeGraph();
    const n = makeNode(g, 'a');
    n.info.coord = { x: 0, y: 0 };
    n.info.lw = 5; n.info.rw = 5; n.info.ht = 10;
    finishNodes(g);
    expect(n.attrs.has('fontsize')).toBe(false);
  });

  it('sets fontsize = ht*0.7 when declared on nodeDefaults and unresolved on the node', () => {
    const g = makeGraph();
    g.nodeDefaults.set('fontsize', '');
    const n = makeNode(g, 'a');
    n.info.coord = { x: 0, y: 0 };
    n.info.lw = 5; n.info.rw = 5; n.info.ht = 10;
    finishNodes(g);
    expect(n.attrs.get('fontsize')).toBe('7.000');
  });

  it('finds a declared fontsize via a node attr (breaks the scan loop early)', () => {
    const g = makeGraph();
    const n1 = makeNode(g, 'a');
    n1.attrs.set('fontsize', '12');
    n1.info.coord = { x: 0, y: 0 }; n1.info.lw = 5; n1.info.rw = 5; n1.info.ht = 10;
    const n2 = makeNode(g, 'b');
    n2.info.coord = { x: 0, y: 0 }; n2.info.lw = 5; n2.info.rw = 5; n2.info.ht = 10;
    finishNodes(g);
    // n1 already resolves a fontsize -> untouched; n2 gets the computed default.
    expect(n1.attrs.get('fontsize')).toBe('12');
    expect(n2.attrs.get('fontsize')).toBe('7.000');
  });

  it('preserves lw/rw/ht around commonInitNode (tile geometry survives)', () => {
    const g = makeGraph();
    const n = makeNode(g, 'a');
    n.info.coord = { x: 0, y: 0 };
    n.info.lw = 3; n.info.rw = 3; n.info.ht = 6;
    finishNodes(g);
    expect(n.info.lw).toBe(3);
    expect(n.info.rw).toBe(3);
    expect(n.info.ht).toBe(6);
  });
});

describe('patchworkEngineLayout / patchworkEngineCleanup', () => {
  it('is a no-op for an empty graph with no clusters (early-return guard)', () => {
    const g = makeGraph();
    expect(() => patchworkEngineLayout(g)).not.toThrow();
    // The g.nodes.size===0 && n_cluster===0 guard returns before the
    // shape-default-setting code runs.
    expect(g.nodeDefaults.has('shape')).toBe(false);
  });

  it('lays out a graph with one node', () => {
    const g = makeGraph();
    makeNode(g, 'a');
    patchworkEngineLayout(g);
    expect(g.nodeDefaults.get('shape')).toBe('box');
  });

  it('patchworkEngineCleanup clears clust/n_cluster/alg', () => {
    const g = makeGraph();
    const n = makeNode(g, 'a');
    g.info.clust = [g];
    g.info.n_cluster = 1;
    n.info.alg = { kind: 'patchwork' };
    patchworkEngineCleanup(g);
    expect(g.info.clust).toBeUndefined();
    expect(g.info.n_cluster).toBeUndefined();
    expect(n.info.alg).toBeUndefined();
  });
});

describe('patchworkLayout — direct call', () => {
  it('builds, sizes, and lays out the root tree end to end', () => {
    const g = makeGraph();
    makeNode(g, 'a');
    makeNode(g, 'b');
    expect(() => patchworkLayout(g)).not.toThrow();
  });
});
