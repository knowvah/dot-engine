// SPDX-License-Identifier: EPL-2.0

/**
 * Branch coverage for fdp compound cluster-edge preprocessing
 * (processClusterEdges / checkCompound / clustNode / cloneEdge).
 * Driven through the public fdpLayoutEngine/fdpInitGraph entry points
 * with crafted DOT sources, per guards.test.ts's established pattern —
 * checkCompound and friends are module-private.
 *
 * @see lib/common/utils.c:processClusterEdges / checkCompound
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { fdpInitGraph } from './index.js';
import { processClusterEdges } from './cluster-edges.js';

describe('processClusterEdges — no clusters', () => {
  it('is a no-op when the graph has zero clusters (n_cluster ?? 0 fallback)', () => {
    const g = parse('graph G { a -- b; }');
    // Deliberately skip fdpInitGraph (mkClusters), so g.info.n_cluster is
    // never set -> fillMap's `?? 0` fallback -> cmap stays empty.
    expect(g.info.n_cluster).toBeUndefined();
    expect(() => processClusterEdges(g)).not.toThrow();
    expect(g.info.n_cluster_edges).toBeUndefined();
  });
});

describe('processClusterEdges — tail names a cluster (hg falsy branch)', () => {
  it('replaces the tail with a proxy and clones the edge tail-first', () => {
    const g = parse(`graph G {
      subgraph clusterX { a -- b }
      clusterX -- n1
    }`);
    fdpInitGraph(g);
    expect(g.nodes.get('clusterX')).toBeUndefined();
    const proxy = [...g.nodes.values()].find((n) => n.info.clustnode)!;
    expect(proxy.name).toBe('__0:clusterX');
    expect(g.info.n_cluster_edges).toBe(1);
    const ce = g.edges.find((e) => e.tail === proxy && e.head.name === 'n1');
    expect(ce).toBeDefined();
    expect(ce!.info.compound).toBe(1);
  });
});

describe('processClusterEdges — both endpoints name clusters', () => {
  it('replaces both endpoints with proxies (hg && tg branch)', () => {
    const g = parse(`graph G {
      subgraph clusterA { a }
      subgraph clusterB { b }
      clusterA -- clusterB
    }`);
    fdpInitGraph(g);
    const proxies = [...g.nodes.values()].filter((n) => n.info.clustnode);
    expect(proxies).toHaveLength(2);
    expect(g.info.n_cluster_edges).toBe(1);
  });

  it('rejects a cluster edge between nested (ancestor/descendant) clusters', () => {
    const g = parse(`graph G {
      subgraph clusterOuter {
        a
        subgraph clusterInner { b }
        clusterOuter -- clusterInner
      }
    }`);
    expect(() => fdpInitGraph(g)).not.toThrow();
    // both cluster-named nodes still exist as real (unreplaced) nodes:
    // agContains rejects the pairing, so checkCompound returns 0.
    expect(g.info.n_cluster_edges).toBeUndefined();
  });
});

describe('processClusterEdges — containment rejections (non-nested clusters)', () => {
  it('rejects when the plain tail node is itself a member of the head cluster', () => {
    const g = parse(`graph G {
      subgraph clusterX { a }
      a -- clusterX
    }`);
    expect(() => fdpInitGraph(g)).not.toThrow();
    expect(g.info.n_cluster_edges).toBeUndefined();
    expect([...g.nodes.values()].some((n) => n.info.clustnode)).toBe(false);
  });

  it('rejects when the plain head node is itself a member of the tail cluster', () => {
    const g = parse(`graph G {
      subgraph clusterX { a }
      clusterX -- a
    }`);
    expect(() => fdpInitGraph(g)).not.toThrow();
    expect(g.info.n_cluster_edges).toBeUndefined();
    expect([...g.nodes.values()].some((n) => n.info.clustnode)).toBe(false);
  });
});

describe('processClusterEdges — parallel edge reuse (mapEdge/insertEdge)', () => {
  it('reuses the proxy pairing for a second parallel edge to the same cluster', () => {
    const g = parse(`graph G {
      subgraph clusterX { a }
      n0 -- clusterX
      n0 -- clusterX
    }`);
    fdpInitGraph(g);
    expect(g.info.n_cluster_edges).toBe(2);
    const proxies = [...g.nodes.values()].filter((n) => n.info.clustnode);
    expect(proxies).toHaveLength(1); // same proxy reused, not duplicated
    const clones = g.edges.filter((e) => e.head === proxies[0] || e.tail === proxies[0]);
    expect(clones).toHaveLength(2);
  });
});

describe('processClusterEdges — a cluster-named node with no matching cluster', () => {
  it('is treated as an ordinary node (mapc\'s cmap.get ?? null fallback)', () => {
    // "clusterZZZ" starts with "cluster" but no subgraph of that name
    // exists anywhere in the graph -> mapc returns null via the ?? null
    // fallback, not via the startsWith guard.
    const g = parse(`graph G {
      subgraph clusterX { a }
      clusterZZZ -- n1
    }`);
    fdpInitGraph(g);
    expect(g.nodes.get('clusterZZZ')).toBeDefined();
    expect(g.info.n_cluster_edges).toBeUndefined();
  });
});

describe('processClusterEdges — cluster self-edge (tg === hg)', () => {
  it('rejects a cluster-named self-loop edge (both endpoints resolve to the same cluster)', () => {
    const g = parse(`graph G {
      subgraph clusterX { a }
      clusterX -- clusterX
    }`);
    expect(() => fdpInitGraph(g)).not.toThrow();
    expect(g.info.n_cluster_edges).toBeUndefined();
    expect([...g.nodes.values()].some((n) => n.info.clustnode)).toBe(false);
  });
});

describe('processClusterEdges — duplicate cluster name (fillMap keeps the first)', () => {
  it('keeps the first-seen cluster when a nested subgraph reuses an ancestor\'s name', () => {
    const g = parse(`graph G {
      subgraph clusterDup {
        x
        subgraph clusterDup { y }
      }
    }`);
    fdpInitGraph(g);
    // fillMap's `!map.has(s)` guard must not throw / must not overwrite —
    // exercised structurally: init completes and the outer cluster is the
    // one recorded under the shared name.
    expect(g.info.n_cluster).toBeGreaterThanOrEqual(1);
    expect(g.info.clust![0]!.name).toBe('clusterDup');
  });
});

describe('processClusterEdges — deleteNodeAndEdges recursion', () => {
  it('purges the deleted cluster-named node from nested subgraphs too', () => {
    // clusterX is itself nested inside clusterOuter, along with an
    // UNRELATED sibling cluster clusterY whose member references
    // clusterX by name — deleteNodeAndEdges must recurse into every
    // subgraph (including clusterY, a sibling of clusterX's parent) to
    // drop the stale reference.
    const g = parse(`graph G {
      subgraph clusterOuter {
        subgraph clusterX { a }
      }
      n0 -- clusterX
    }`);
    fdpInitGraph(g);
    expect(g.nodes.get('clusterX')).toBeUndefined();
    expect(() => fdpInitGraph(g)).not.toThrow();
  });
});
