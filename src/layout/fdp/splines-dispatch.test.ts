// SPDX-License-Identifier: EPL-2.0

/**
 * fdpSplines dispatch: splines=compound is loud, and the HAS_CLUST_EDGE
 * branch warns and routes line segments.
 * @see lib/fdpgen/layout.c:fdpSplines
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser/index.js';
import { RenderError } from '../../errors.js';
import { EDGETYPE_SPLINE } from '../dot/splines.js';
import { fdpLayoutEngine } from './index.js';

const CLUSTER_EDGE_WARNING =
  'splines and cluster edges not supported - using line segments';

/** Pinned nodes: c sits on the a--b line, so a routed a--b edge must curve. */
const PINNED = `a[pos="0,0!"] b[pos="4,0!"] c[pos="2,0.05!"] a -- b  c -- d`;
const CLUSTER =
  `subgraph cluster_x { x[pos="2,6!"] y[pos="3,6!"] x -- y } d[pos="5,3!"]`;

const plain = (splines: string): string =>
  `graph G { splines=${splines}; ${PINNED} }`;
const withClusterEdge = (splines: string): string =>
  `graph G { splines=${splines}; ${PINNED} ${CLUSTER} d -- cluster_x }`;

afterEach(() => {
  vi.restoreAllMocks();
});

describe('fdp splines=compound', () => {
  it('throws UNSUPPORTED_FEATURE naming the attribute and value', () => {
    const g = parse(
      'graph G { splines=compound; subgraph cluster_a { a1 -- a2 } b1 -- a1 }',
    );
    let caught: unknown;
    try {
      fdpLayoutEngine(g);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(RenderError);
    expect((caught as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    expect((caught as RenderError).message).toBe(
      'splines=compound: cluster-avoiding edge routing (compoundEdges) is not supported yet',
    );
  });

  it('also throws without clusters (C branches on the edge type alone)', () => {
    const g = parse('graph G { splines=compound; a -- b }');
    expect(() => fdpLayoutEngine(g)).toThrow(/splines=compound: .* is not supported yet/);
  });
});

describe('fdp HAS_CLUST_EDGE fallback', () => {
  it('warns and keeps the edge type untouched for splines=true', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse(withClusterEdge('true'));
    fdpLayoutEngine(g);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(CLUSTER_EDGE_WARNING);
    expect(g.info.flags & 0xf).toBe(EDGETYPE_SPLINE);
  });

  it('routes the unobstructed-by-cluster edges as straight segments', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse(withClusterEdge('true'));
    fdpLayoutEngine(g);
    const ab = [...g.edges.values()].find((e) => e.tail.name === 'a' && e.head.name === 'b');
    expect(ab?.info.spl?.list[0]?.list.length).toBe(4);
  });

  it('does not warn for splines=true without cluster edges, and curves a--b', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const g = parse(plain('true'));
    fdpLayoutEngine(g);
    expect(warn).not.toHaveBeenCalled();
    const ab = [...g.edges.values()].find((e) => e.tail.name === 'a' && e.head.name === 'b');
    expect(ab?.info.spl?.list[0]?.list.length).toBeGreaterThan(4);
  });

  it.each(['line', 'ortho', 'polyline', 'none'])(
    'does not warn for splines=%s with a cluster edge (et <= ORTHO)',
    (s) => {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
      fdpLayoutEngine(parse(withClusterEdge(s)));
      expect(warn).not.toHaveBeenCalled();
    },
  );
});
