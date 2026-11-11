// SPDX-License-Identifier: EPL-2.0

/**
 * The order make_flat_adj_edges clones a flat-adjacent group in (issues #170
 * and #172).
 *
 * dot_splines_ sorts its edge list with edgecmp and hands make_flat_edge the
 * run of one main edge; make_flat_adj_edges clones the aux edges in that
 * order (`e = edges[i]`). The aux edges' AGSEQ is therefore the edgecmp order
 * of the run: for `a:n -> b:n; a:s -> b:s` portcmp puts the `s` edge first
 * (equal p.x, lower p.y), and a port-less edge compares through its main
 * edge's ports, so it follows the `n` edge by AGSEQ. The port rebuilt the
 * group from the graph's edge list in creation order.
 *
 * Where the aux layout reads that order the result differed from native:
 * do_ordering_node chains auxt's out-edges by AGSEQ, so a node `ordering`
 * fixed the two label vnodes the other way round (#170), and under
 * `rankdir=LR`, or with `e`/`w` ports, mincross keeps the install order (#172).
 *
 * @see lib/dotgen/dotsplines.c:dot_splines_ (LIST_SORT, make_flat_edge call)
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (clone loop)
 * @see lib/dotgen/dotsplines.c:edgecmp, portcmp
 * @see lib/dotgen/mincross.c:do_ordering_node
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Graph } from '../../model/graph.js';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

const seen = vi.hoisted(() => ({ auxEdges: [] as string[][] }));

vi.mock('./splines-clone.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./splines-clone.js')>();
  return {
    ...actual,
    cleanupCloneGraph: (auxg: Graph): void => {
      seen.auxEdges.push(auxg.edges.map(
        (e) => `${e.tail.name}:${e.attrs.get('tailport') ?? ''}->${e.head.name}:${e.attrs.get('headport') ?? ''}`,
      ));
      actual.cleanupCloneGraph(auxg);
    },
  };
});

beforeEach(() => { seen.auxEdges.length = 0; });

interface Probe { name: string; src: string; native: string }

// Native 16.1.0 `dot -Tplain` (plans/issue-170-aux-ordering-mincross/harness/
// native/*.plain; exit 0, empty stderr).
const ORDERING_PROBES: readonly Probe[] = [
  {
    name: 'node-out.gv: a node `ordering=out` on the tail',
    src: 'digraph { a [ordering=out]; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; }',
    native: `graph 1 2 1.3318
node a 0.375 0.36971 0.75 0.5 a solid ellipse black lightgrey
node b 1.625 0.36971 0.75 0.5 b solid ellipse black lightgrey
edge a b 4 0.375 0.63805 0.375 0.74765 1.1533 0.77076 1.4816 0.7074 x 1 0.85889 solid black
edge a b 16 0.375 0.10137 0.375 -0.065414 0.62253 0.0077091 0.75 0.11526 1.0841 0.39716 0.61209 0.80238 0.95139 1.078 0.98493 1.1053 1.0151 1.1053 1.0486 1.078 1.3879 0.80238 0.91586 0.39716 1.25 0.11526 1.3177 0.058121 1.4193 0.010703 1.4997 0.003807 y 1 1.2151 solid black
stop
`,
  },
  {
    name: 'node-out-plain-edge.gv: the same with a port-less edge in the group',
    src: 'digraph { a [ordering=out]; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; a -> b; }',
    native: `graph 1 2 1.3318
node a 0.375 0.36971 0.75 0.5 a solid ellipse black lightgrey
node b 1.625 0.36971 0.75 0.5 b solid ellipse black lightgrey
edge a b 4 0.375 0.63805 0.375 0.74765 1.1533 0.77076 1.4816 0.7074 x 1 0.85889 solid black
edge a b 16 0.375 0.10137 0.375 -0.065414 0.62253 0.0077091 0.75 0.11526 1.0841 0.39716 0.61209 0.80238 0.95139 1.078 0.98493 1.1053 1.0151 1.1053 1.0486 1.078 1.3879 0.80238 0.91586 0.39716 1.25 0.11526 1.3177 0.058121 1.4193 0.010703 1.4997 0.003807 y 1 1.2151 solid black
edge a b 4 0.7556 0.36971 0.85953 0.36971 0.97476 0.36971 1.0861 0.36971 solid black
stop
`,
  },
  {
    name: 'node-in-plain-edge.gv: a node `ordering=in` on the head, port-less edge in the group',
    src: 'digraph { b [ordering=in]; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; a -> b; }',
    native: `graph 1 2 1.3318
node b 1.625 0.36971 0.75 0.5 b solid ellipse black lightgrey
node a 0.375 0.36971 0.75 0.5 a solid ellipse black lightgrey
edge a b 4 0.375 0.63805 0.375 0.74765 1.1533 0.77076 1.4816 0.7074 x 1 0.85889 solid black
edge a b 16 0.375 0.10137 0.375 -0.065414 0.62253 0.0077091 0.75 0.11526 1.0841 0.39716 0.61209 0.80238 0.95139 1.078 0.98493 1.1053 1.0151 1.1053 1.0486 1.078 1.3879 0.80238 0.91586 0.39716 1.25 0.11526 1.3177 0.058121 1.4193 0.010703 1.4997 0.003807 y 1 1.2151 solid black
edge a b 4 0.7556 0.36971 0.85953 0.36971 0.97476 0.36971 1.0861 0.36971 solid black
stop
`,
  },
  {
    name: "node-default-out.gv: a `node [ordering=out]` default (#169's aux-flat-adj.gv)",
    src: 'digraph { node [ordering=out]; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s [label=y]; }',
    native: `graph 1 2 1.3318
node a 0.375 0.36971 0.75 0.5 a solid ellipse black lightgrey
node b 1.625 0.36971 0.75 0.5 b solid ellipse black lightgrey
edge a b 4 0.375 0.63805 0.375 0.74765 1.1533 0.77076 1.4816 0.7074 x 1 0.85889 solid black
edge a b 16 0.375 0.10137 0.375 -0.065414 0.62253 0.0077091 0.75 0.11526 1.0841 0.39716 0.61209 0.80238 0.95139 1.078 0.98493 1.1053 1.0151 1.1053 1.0486 1.078 1.3879 0.80238 0.91586 0.39716 1.25 0.11526 1.3177 0.058121 1.4193 0.010703 1.4997 0.003807 y 1 1.2151 solid black
stop
`,
  },
];

// Native 16.1.0 `dot -Tdot` on issue #172's three inputs (exit 0, empty
// stderr): no `ordering`, the same clone order read by the aux mincross.
const INSTALL_ORDER_PROBES: readonly Probe[] = [
  {
    name: 'rankdir=LR, two port edges and a labelled port-less edge',
    src: 'digraph { rankdir=LR; {rank=same; a; b} a:n -> b:n; a:s -> b:s; a -> b [label=x]; }',
    native: `digraph {
\tgraph [bb="0,0,82.847,113.94",
\t\trankdir=LR
\t];
\tnode [label="\\N"];
\t{
\t\tgraph [rank=same];
\t\ta\t[height=0.5,
\t\t\tpos="47.627,92.828",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="47.627,20.828",
\t\t\twidth=0.75];
\t}
\ta:n -> b:n\t[pos="s,47.627,38.828 37.617,44.281 34.155,44.518 30.641,45.154 28.627,48.428 24.715,54.788 23.918,59.434 28.627,65.228 41.801,81.435 \\
61.454,58.622 74.627,74.828 84.809,87.355 85.829,99.525 74.627,111.15 72.544,113.31 47.627,115.15 47.627,112.15"];
\ta:s -> b:s\t[pos="s,47.627,1.5075 58.833,0 65.746,0.27033 73.505,1.3422 74.627,2.5075 85.829,14.131 85.25,26.673 74.627,38.828 53.674,62.806 24.581,\\
24.451 3.6275,48.428 -1.2858,54.051 -1.0558,59.413 3.6275,65.228 16.182,80.817 47.627,54.813 47.627,74.828"];
\ta -> b\t[label=x,
\t\tlp="51.127,56.828",
\t\tpos="s,47.627,38.933 47.627,50.364 47.627,58.555 47.627,67.235 47.627,74.525"];
}
`,
  },
  {
    name: 'rankdir=LR, a labelled port edge and a plain port edge',
    src: 'digraph { rankdir=LR; {rank=same; a; b} a:n -> b:n [label=x]; a:s -> b:s; }',
    native: `digraph {
\tgraph [bb="0,0,79.817,113.94",
\t\trankdir=LR
\t];
\tnode [label="\\N"];
\t{
\t\tgraph [rank=same];
\t\ta\t[height=0.5,
\t\t\tpos="44.608,92.828",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="44.608,20.828",
\t\t\twidth=0.75];
\t}
\ta:n -> b:n\t[label=x,
\t\tlp="29.108,56.828",
\t\tpos="s,44.608,38.828 34.597,44.281 31.135,44.518 27.622,45.154 25.608,48.428 21.696,54.788 20.899,59.434 25.608,65.228 38.781,81.435 \\
58.435,58.622 71.608,74.828 81.79,87.355 82.809,99.525 71.608,111.15 69.525,113.31 44.608,115.15 44.608,112.15"];
\ta:s -> b:s\t[pos="s,44.608,1.5075 55.814,0 62.727,0.27033 70.485,1.3422 71.608,2.5075 82.809,14.131 82.195,26.642 71.608,38.828 51.591,61.87 23.625,\\
25.387 3.6082,48.428 -1.2887,54.065 -1.0309,59.378 3.6082,65.228 15.236,79.893 44.608,56.113 44.608,74.828"];
}
`,
  },
  {
    name: 'e/w ports and a labelled port-less edge',
    src: 'digraph { {rank=same; a; b} a:e -> b:e; a:w -> b:w; a -> b [label=x]; }',
    native: `digraph {
\tgraph [bb="0,0,150.51,70.67"];
\tnode [label="\\N"];
\t{
\t\tgraph [rank=same];
\t\ta\t[height=0.5,
\t\t\tpos="30.603,18",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="120.6,18",
\t\t\twidth=0.75];
\t}
\ta:e -> b:e\t[pos="e,148.86,18 57.603,18 67.876,18 62.837,31.566 72.103,36 102.47,50.533 123.4,59.137 147.86,36 148.95,34.968 149.92,32.178 150.51,\\
29.095"];
\ta:w -> b:w\t[pos="e,93.603,18 2.3502,18 -1.656,18 0.9617,32.784 3.3502,36 24.488,64.464 50.305,81.68 79.103,61 90.622,52.728 83.14,34.83 84.693,24.932"];
\ta -> b\t[label=x,
\t\tlp="75.603,23.6",
\t\tpos="e,93.481,15.582 57.733,15.928 62.51,15.624 67.454,15.361 72.103,15.2 75.354,15.088 78.728,15.076 82.112,15.137"];
}
`,
  },
];

describe('make_flat_adj_edges clone order with a node ordering (#170)', () => {
  it.each(ORDERING_PROBES)('$name equals native -Tplain', ({ src, native }) => {
    expect(render(parse(src), 'plain', { engine: 'dot' })).toBe(native);
  });
});

describe('make_flat_adj_edges clone order without an ordering (#172)', () => {
  it.each(INSTALL_ORDER_PROBES)('$name equals native -Tdot', ({ src, native }) => {
    expect(render(parse(src), 'dot', { engine: 'dot' })).toBe(native);
  });
});

describe('the aux edges are cloned in the edgecmp order of the run', () => {
  it('clones the s edge before the n edge, then the synthetic heavy edge', () => {
    render(parse(ORDERING_PROBES[0]!.src), 'plain', { engine: 'dot' });
    expect(seen.auxEdges).toEqual([['a:s->b:s', 'a:n->b:n', 'a:->b:']]);
  });

  it('clones a port-less member after the n edge whose ports it compares by', () => {
    render(parse(ORDERING_PROBES[1]!.src), 'plain', { engine: 'dot' });
    expect(seen.auxEdges).toEqual([['a:s->b:s', 'a:n->b:n', 'a:->b:']]);
  });

  it('keeps creation order where edgecmp agrees with it', () => {
    render(parse('digraph { {rank=same; a; b} a:s -> b:s; a:n -> b:n; }'), 'plain', { engine: 'dot' });
    expect(seen.auxEdges).toEqual([['a:s->b:s', 'a:n->b:n', 'a:->b:']]);
  });
});
