// SPDX-License-Identifier: EPL-2.0

/**
 * Three adjacent flat edges, two with compass ports, one `minlen=3` and one
 * labelled (part-11 `harness/T0/w5.gv`, item 128).
 *
 * make_flat_adj_edges lays the group out in an aux graph. cloneEdge copies
 * `minlen=3` onto the aux edge, but setState nulls E_minlen for the aux
 * layout, so dot_init_edge ranks every aux edge with minlen 1: native's aux
 * chain is auxt -> label vnode -> auxh (3 path boxes per edge). The port read
 * the copied attribute, doubled it for the edge label and built a 5-vnode
 * chain whose ranks overlapped; add_box dropped 4 degenerate rank boxes and
 * adjustregularpath read past P.nbox (`reading 'll'` of undefined).
 *
 * @see lib/dotgen/dotsplines.c:setState (E_minlen = NULL)
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges
 * @see lib/dotgen/dotinit.c:dot_init_edge
 */

import { afterEach, describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';
import { agseterrf } from '../../common/agerr.js';

const W5 = 'digraph { {rank=same; a; b} a:n->b:n [minlen=3]; '
  + 'a:s->b:s [weight=0]; a->b [weight=0, label="x"]; }';

// Native 16.1.0 `dot -Tdot w5.gv` (plans/post-16-1-followups-11/harness/T0/
// w5.dot; exit 0, empty stderr, 8 of 8 runs identical).
const NATIVE_W5_DOT = `digraph {
\tgraph [bb="0,0,216,147.25"];
\tnode [label="\\N"];
\t{
\t\tgraph [rank=same];
\t\ta\t[height=0.5,
\t\t\tpos="27,73.624",
\t\t\twidth=0.75];
\t\tb\t[height=0.5,
\t\t\tpos="189,73.624",
\t\t\twidth=0.75];
\t}
\ta:n -> b:n\t[minlen=3,
\t\tpos="e,189,92.945 27,92.945 27,161.01 171.77,164.73 187.6,104.11"];
\ta:s -> b:s\t[pos="e,189,54.304 27,54.304 27,-13.759 171.77,-17.481 187.6,43.137",
\t\tweight=0];
\ta -> b\t[label=x,
\t\tlp="108,82.024",
\t\tpos="e,161.54,73.624 54.421,73.624 80.476,73.624 120.57,73.624 150.03,73.624",
\t\tweight=0];
}
`;

afterEach(() => {
  agseterrf(null);
});

describe('make_flat_adj_edges on w5.gv', () => {
  it('ranks the aux minlen edge as 1 and matches native -Tdot', () => {
    const messages: string[] = [];
    agseterrf((m) => { messages.push(m); });
    expect(render(parse(W5), 'dot')).toBe(NATIVE_W5_DOT);
    expect(messages).toEqual([]);
  });
});
