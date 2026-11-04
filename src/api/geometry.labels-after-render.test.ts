// SPDX-License-Identifier: EPL-2.0
//
// `getLayout` is documented to work after `render`, and `render` frees at its
// end, so every label position must survive that free (plantuml-ts issue 40).
// The expected values are the attributes the same render wrote.
// @see src/gvc/layout-reset.ts
import { describe, expect, it } from 'vitest';
import { getLayout } from './geometry.js';
import { parse } from '../parser/index.js';
import { render } from '../index.js';
import type { Graph } from '../model/graph.js';

const ENGINES = ['dot', 'neato', 'fdp', 'sfdp', 'circo', 'twopi', 'osage', 'patchwork'] as const;
const NESTED_CLUSTERS = ['cluster_x', 'cluster_y'];
/** Native neato draws only top-level clusters: its `cluster_y` gets no `bb`. */
const CLUSTERS_BY_ENGINE = [
  ['dot', NESTED_CLUSTERS], ['neato', ['cluster_x']], ['fdp', NESTED_CLUSTERS], ['osage', NESTED_CLUSTERS],
] as const;
const EDGE_SRC = 'digraph { a -> b [label=x, taillabel=t, headlabel=h, xlabel=y]; }';
const CLUSTER_SRC = 'digraph { subgraph cluster_x { label=L; subgraph cluster_y { label=M; a; } } b; }';

/** Attribute name in `dot` output -> field on the published edge geometry. */
const EDGE_LABELS = [
  ['lp', 'label'], ['xlp', 'xlabel'], ['tail_lp', 'tailLabel'], ['head_lp', 'headLabel'],
] as const;

function point(value: string): { x: number; y: number } {
  const [x, y] = value.split(',').map(Number);
  return { x: x!, y: y! };
}

function subgraphNamed(g: Graph, name: string): Graph {
  for (const sg of g.subgraphs.values()) {
    if (sg.name === name) return sg;
    if (sg.subgraphs.size > 0) return subgraphNamed(sg, name);
  }
  throw new Error(`no subgraph ${name}`);
}

describe('getLayout after render', () => {
  for (const engine of ENGINES) {
    it(`${engine}: reports every edge label the render placed`, () => {
      const g = parse(EDGE_SRC);
      const out = parse(render(g, 'dot', { engine }));
      const attrs = out.edges[0]!.attrs;
      const edge = getLayout(g, { yAxis: 'up' }).edges[0]!;
      for (const [attr, field] of EDGE_LABELS) {
        const written = attrs.get(attr);
        if (written === undefined) {
          expect(edge[field]).toBeUndefined();
        } else {
          const { x, y } = point(written);
          expect(edge[field]?.x).toBeCloseTo(x, 2);
          expect(edge[field]?.y).toBeCloseTo(y, 2);
        }
      }
    });
  }

  it('dot places all four edge labels on this graph', () => {
    const g = parse(EDGE_SRC);
    render(g, 'dot', { engine: 'dot' });
    const edge = getLayout(g).edges[0]!;
    expect(Object.keys(edge).filter((k) => /label/i.test(k)).sort())
      .toEqual(['headLabel', 'label', 'tailLabel', 'xlabel']);
  });

  for (const [engine, names] of CLUSTERS_BY_ENGINE) {
    it(`${engine}: reports nested cluster labels`, () => {
      const g = parse(CLUSTER_SRC);
      const out = parse(render(g, 'dot', { engine }));
      const clusters = getLayout(g, { yAxis: 'up' }).clusters;
      expect(clusters.map((c) => c.name).sort()).toEqual(names);
      for (const c of clusters) {
        const { x, y } = point(subgraphNamed(out, c.name).attrs.get('lp')!);
        expect(c.label?.x).toBeCloseTo(x, 2);
        expect(c.label?.y).toBeCloseTo(y, 2);
      }
    });
  }

  it('a later layout replaces what the earlier one placed', () => {
    const g = parse('digraph { a -> b [label=first]; }');
    render(g, 'dot', { engine: 'dot' });
    const first = getLayout(g, { yAxis: 'up' }).edges[0]!.label!;
    g.edges[0]!.attrs.set('label', 'a much longer label than the first');
    const out = parse(render(g, 'dot', { engine: 'dot' }));
    const second = getLayout(g, { yAxis: 'up' }).edges[0]!.label!;
    const written = point(out.edges[0]!.attrs.get('lp')!);
    expect(second.x).toBeCloseTo(written.x, 2);
    expect(second.x).toBeGreaterThan(first.x);
  });
});
