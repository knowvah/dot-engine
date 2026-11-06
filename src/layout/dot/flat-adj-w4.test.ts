// SPDX-License-Identifier: EPL-2.0

/**
 * Three adjacent flat `constraint=false` edges, two with compass ports
 * (part-11 `harness/T0/w4.gv`, item 128).
 *
 * make_flat_adj_edges lays the group out in an aux graph. cloneEdge copies
 * `constraint=false` onto every aux edge, but setState nulls E_constr,
 * E_minlen and N_group for the aux layout, so dot_init_edge ignores them:
 * the aux ranks auxt and auxh apart (native GD_maxrank(auxg) = 1, one aux
 * layout) and the aux edges route as inter-rank edges. The port read the
 * copied attribute, ranked both aux nodes 0, found the edges flat-adjacent
 * again and recursed until the stack overflowed.
 *
 * @see lib/dotgen/dotsplines.c:setState
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges
 * @see lib/dotgen/dotinit.c:dot_init_edge
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { Graph } from '../../model/graph.js';
import { Edge } from '../../model/edge.js';
import { agnode } from '../../model/cgraph-ops.js';
import { dotInitEdge, AUX_INIT_SYMS, CL_CROSS } from './init.js';

const W4 = 'digraph { {rank=same; a; b} a:n->b:n [constraint=false]; '
  + 'a:s->b:s [constraint=false]; a->b [constraint=false]; }';

// Native 16.1.0 `dot -Tdot w4.gv` (plans/post-16-1-followups-11/harness/T0/
// w4.dot; exit 0, empty stderr, 8 of 8 runs identical).
const NATIVE_W4_DOT = `digraph {
\tgraph [bb="0,0,126,87.64"];
\tnode [label="\\N"];
\t{
\t\tgraph [rank=same];
\t\ta\t[height=0.5,
\t\t\tpos="27,43.82",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="99,43.82",
\t\t\twidth=0.75];
\t}
\ta:n -> b:n\t[constraint=false,
\t\tpos="e,99,63.141 27,63.141 27,91.016 81.634,94.609 95.719,73.921"];
\ta:s -> b:s\t[constraint=false,
\t\tpos="e,99,24.5 27,24.5 27,-3.3755 81.634,-6.9688 95.719,13.72"];
\ta -> b\t[constraint=false,
\t\tpos="e,71.963,43.82 54.464,43.82 56.434,43.82 58.442,43.82 60.461,43.82"];
}
`;

describe('make_flat_adj_edges on w4.gv', () => {
  it('renders without recursing and matches native -Tdot', () => {
    expect(render(parse(W4), 'dot')).toBe(NATIVE_W4_DOT);
  });
});

/** An edge a->b in a fresh graph whose nodes both carry group=g1. */
function groupedEdge(attrs: Record<string, string>): Edge {
  const g = new Graph('G', 'directed');
  const a = agnode(g, 'a', true)!;
  const b = agnode(g, 'b', true)!;
  a.attrs.set('group', 'g1');
  b.attrs.set('group', 'g1');
  const e = new Edge(a, b, '');
  for (const [k, v] of Object.entries(attrs)) e.attrs.set(k, v);
  g.edges.push(e);
  return e;
}

describe('dotInitEdge under setState (aux symbols unbound)', () => {
  const attrs = { constraint: 'false', minlen: '3', weight: '7' };

  it('reads constraint, minlen and group with the main symbols bound', () => {
    const e = groupedEdge(attrs);
    dotInitEdge(e);
    expect(e.info.constraint).toBe(false);
    expect(e.info.weight).toBe(0);
    expect(e.info.xpenalty).toBe(0);
    expect(e.info.minlen).toBe(3);
  });

  it('ignores constraint, minlen and group as E_constr/E_minlen/N_group = NULL', () => {
    const e = groupedEdge(attrs);
    dotInitEdge(e, AUX_INIT_SYMS);
    expect(e.info.constraint).toBeUndefined();
    expect(e.info.weight).toBe(7);
    expect(e.info.xpenalty).toBe(1);
    expect(e.info.minlen).toBe(1);
  });

  it('applies the group penalty only with N_group bound', () => {
    const bound = groupedEdge({ weight: '7' });
    dotInitEdge(bound);
    expect(bound.info.xpenalty).toBe(CL_CROSS);
    expect(bound.info.weight).toBe(700);
    const aux = groupedEdge({ weight: '7' });
    dotInitEdge(aux, AUX_INIT_SYMS);
    expect(aux.info.xpenalty).toBe(1);
    expect(aux.info.weight).toBe(7);
  });
});
