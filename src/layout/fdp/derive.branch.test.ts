// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for derived-graph construction (deriveGraph and its
 * helpers: chkPos/scanCoords "coords" attribute parsing, cluster-node
 * pinning, the non-comparable-clusters error, real-node pinning, and
 * boundary-port derivation).
 *
 * @see lib/fdpgen/layout.c:deriveGraph (15.0.0)
 *
 * Residual branches (branch coverage in the high 90s after adding the
 * cluster-edge-proxy case below):
 *  - chkPos's `g !== infop.rootg` false branch and the nested
 *    `g.parent !== null` false branch (derive.ts): chkPos's only call
 *    site (deriveClusterNodes) always passes an actual cluster subgraph
 *    (`g.info.clust[i]`), which by construction is never the root and
 *    always has a non-null `.parent`. Both appear unreachable via the
 *    current call graph.
 *  - deriveRealNodes' `n.info.clustnode` true branch IS reachable —
 *    cluster-edges.ts's `clustNode()` (invoked by fdpInitGraph via
 *    processClusterEdges) sets it on the invisible proxy node that
 *    stands in for a `node -- clusterX`-style edge endpoint; covered
 *    below (an initial grep for this missed cluster-edges.ts due to an
 *    unrelated tool quirk — re-verified by direct grep -a and fixed).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { deriveGraph, type LayoutInfo } from './derive.js';
import { fdpInitGraph } from './index.js';
import { initInfo } from './layout.js';
import { expandCluster } from './ports.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { dndata, gdata, setDnode, setParent } from './fdp-model.js';

function freshInfo(g: ReturnType<typeof parse>): LayoutInfo {
  return initInfo(g);
}

describe('deriveGraph — copyAttr (overlap/sep/K)', () => {
  it('copies overlap/sep/K attribute values onto the derived graph when set', () => {
    const g = parse(`graph G { overlap="scale"; sep="+8"; K="0.6"; A -- B; }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    expect(dg.attrs.get('overlap')).toBe('scale');
    expect(dg.attrs.get('sep')).toBe('+8');
    expect(dg.attrs.get('K')).toBe('0.6');
  });

  it('leaves the derived graph without overlap/sep/K when unset on the source', () => {
    const g = parse(`graph G { A -- B; }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    expect(dg.attrs.has('overlap')).toBe(false);
    expect(dg.attrs.has('sep')).toBe(false);
    expect(dg.attrs.has('K')).toBe(false);
  });
});

describe('deriveGraph — cluster "coords" attribute (chkPos/scanCoords)', () => {
  it('is a no-op when the root has "coords" but the cluster does not set it', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeFalsy();
  });

  it('is a no-op when the cluster sets "coords" to the empty string', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { coords=""; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeFalsy();
  });

  it('is a no-op when the cluster explicitly repeats its parent\'s unchanged "coords" value', () => {
    // chkPos reads `.attrs.get('coords')` (non-inheriting) on both g and
    // g.parent; only an EXPLICIT identical re-declaration on the cluster
    // reaches the p === pp skip (relying on inheritance alone leaves the
    // cluster's own raw value undefined, hitting the earlier `p === undefined`
    // no-op instead).
    const g = parse(`graph G {
      coords="0,0,10,10";
      subgraph cluster_0 { coords="0,0,10,10"; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeFalsy();
  });

  it('warns and no-ops on a malformed "coords" string (scanCoords returns null)', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { coords="not four numbers"; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeFalsy();
  });

  it('parses a bare "coords" (no trailing marker) as P_SET and positions the cluster node', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { coords="0,0,10,20"; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeTruthy();
    expect(cn.info.pos).toEqual([5, 10]); // center of (0,0)-(10,20)
  });

  it('parses a "!"-suffixed "coords" as P_PIN', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { coords="0,0,10,20!"; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeTruthy();
    expect(cn.info.pos).toEqual([5, 10]);
  });

  it('parses a "?"-suffixed "coords" as P_FIX', () => {
    const g = parse(`graph G {
      coords="1";
      subgraph cluster_0 { coords="0,0,10,20?"; A -- B; }
    }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).pinned).toBeTruthy();
    expect(cn.info.pos).toEqual([5, 10]);
  });
});

describe('deriveGraph — cluster-edge proxy nodes are skipped', () => {
  it('does not create a derived node for a processClusterEdges invisible proxy', () => {
    // fdpInitGraph runs processClusterEdges, which replaces the visible
    // "clusterX"-named node with an invisible proxy carrying
    // info.clustnode = true; deriveRealNodes' `continue` on clustnode
    // must skip creating a second derived node for it (its real
    // representation is the cluster's own derived node).
    const g = parse(`graph G {
      n0
      subgraph clusterX { a -- b }
      n0 -- clusterX
    }`);
    fdpInitGraph(g);
    const proxy = [...g.nodes.values()].find((n) => n.info.clustnode)!;
    expect(proxy).toBeDefined();
    const dg = deriveGraph(g, freshInfo(g))!;
    expect(dg).not.toBeNull();
    // no derived node carries the proxy's synthetic name
    expect([...dg.nodes.values()].some((n) => n.name === proxy.name)).toBe(false);
  });
});

describe('deriveGraph — non-comparable clusters error', () => {
  // PARENT(n) (getParent/setParent) tracks, across the *sequence* of
  // recursive deriveGraph calls made by layout() while expanding nested
  // clusters, which graph last claimed a node as a "remaining real node".
  // Two SIBLING clusters at the same nesting level don't trigger this —
  // deriveClusterNodes blindly last-writes DNODE for shared members with
  // no conflict check (matches C: the cluster loop has no such guard,
  // only the *remaining-nodes* loop does). Reproducing the real trigger
  // needs two non-ancestor-related deriveGraph calls in the recursive
  // layout() pipeline; setParent is exported and used here to establish
  // that same pre-condition directly, without standing up the full
  // multi-level cluster recursion.
  it('returns null when a node\'s tracked parent is a different, non-comparable graph', () => {
    const g = parse(`graph G { A -- B; }`);
    fdpInitGraph(g);
    const other = new Graph('other', 'undirected');
    setParent(g.nodes.get('A')!, other);
    const dg = deriveGraph(g, freshInfo(g));
    expect(dg).toBeNull();
  });
});

describe('deriveGraph — real-node pinning', () => {
  it('copies a pinned real node\'s position onto its derived node', () => {
    const g = parse(`graph G { A [pos="3,4!"]; A -- B; }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const da = [...dg.nodes.values()].find((n) => n.name === 'A')!;
    expect(da.info.pos).toEqual([3, 4]);
    expect(dndata(da).pinned).toBeTruthy();
  });

  it('leaves an unpinned real node at the default [0,0] derived position', () => {
    const g = parse(`graph G { A -- B; }`);
    fdpInitGraph(g);
    const dg = deriveGraph(g, freshInfo(g))!;
    const da = [...dg.nodes.values()].find((n) => n.name === 'A')!;
    expect(da.info.pos).toEqual([0, 0]);
    expect(dndata(da).pinned).toBeFalsy();
  });
});

describe('deriveGraph — n_cluster missing (?? fallback)', () => {
  it('treats a graph whose n_cluster was never set as having zero clusters', () => {
    const g = parse(`graph G { A -- B; }`);
    // Deliberately skip fdpInitGraph (which calls mkClusters and sets
    // g.info.n_cluster) so g.info.n_cluster stays undefined.
    expect(g.info.n_cluster).toBeUndefined();
    const dg = deriveGraph(g, freshInfo(g));
    expect(dg).not.toBeNull();
    expect(dg!.nodes.size).toBe(2);
  });
});

describe('deriveGraph — boundary ports (derivePorts / derivePort)', () => {
  it('derives a port node for a cluster edge that crosses the cluster boundary', () => {
    const g = parse(`graph G {
      subgraph cluster_0 { A; B; A -- B; }
      C;
      A -- C;
    }`);
    fdpInitGraph(g);
    const infop = freshInfo(g);
    const dg = deriveGraph(g, infop)!;

    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    expect(dndata(cn).wdeg).toBeGreaterThan(0);
    const sg = expandCluster(cn, dg);
    expect(gdata(sg).ports).not.toBeNull();
    expect(gdata(sg).nports).toBe(1);

    // Recurse into the cluster's own derive pass, as layout() does:
    // reset dnode pointers for the cluster's own nodes first.
    for (const n of sg.nodes.values()) setDnode(n, null);
    const dg2 = deriveGraph(sg, infop)!;
    expect(dg2).not.toBeNull();
    // one port-node was created (named _port_...), connected to A's image
    const portNode = [...dg2.nodes.values()].find((n) => n.name.startsWith('_port_'));
    expect(portNode).toBeDefined();
    expect(dg2.edges.length).toBe(2); // A--B plus A--portNode
  });

  it('skips a port whose associated node has no derived image in the recursed cluster (m === null)', () => {
    // Two boundary edges from cluster_0: A--C (A stays mapped, port kept)
    // and B--D, but B's dnode pointer is deliberately left un-reset before
    // recursing — derivePorts' `m = getDnode(port.n)` still finds SOME
    // dnode for B (the outer one), so to force `m === null` we instead
    // reset every node EXCEPT deleting B from the cluster's own node map
    // entirely so getDnode(port.n) astray of the recursed dg2's ports
    // never matches — simpler and direct: point the port's `n` at a node
    // that was never a dnode target at all.
    const g = parse(`graph G {
      subgraph cluster_0 { A; A -- A; }
      C;
      A -- C;
    }`);
    fdpInitGraph(g);
    const infop = freshInfo(g);
    const dg = deriveGraph(g, infop)!;
    const cn = [...dg.nodes.values()].find((n) => dndata(n).clust !== null)!;
    const sg = expandCluster(cn, dg);
    const ports = gdata(sg).ports!;
    expect(ports.length).toBe(1);
    // Point the port at a freshly-constructed node that was never given a
    // derived image (its fdp alg data was never touched) -> getDnode(m)
    // returns null, unlike any node actually processed by deriveGraph.
    const orphan = new Node(9999, 'orphan', g);
    ports[0]!.n = orphan;
    for (const n of sg.nodes.values()) setDnode(n, null);
    const dg2 = deriveGraph(sg, infop)!;
    // the orphaned port contributes nothing: only A's own edge (self-loop
    // A--A) is present, no port node was created.
    expect([...dg2.nodes.values()].some((n) => n.name.startsWith('_port_'))).toBe(false);
  });
});
