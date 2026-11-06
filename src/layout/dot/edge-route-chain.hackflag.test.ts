// SPDX-License-Identifier: EPL-2.0

/**
 * Oracle-pinned routes for a multi-rank edge merged into another edge's
 * virtual chain (class2 `merge_chain`) whose ports split it into its own
 * dot_splines group. C routes it through make_regular_edge's hackflag views:
 * beginpath on `fwdedgea` (to_orig = the merged edge) clears that edge's own
 * tail clip, and endpath on `fwdedgeb` (a struct copy, NORMAL) clears only
 * the copy's, so the merged edge's head stays clipped. Routing it on the
 * owner's chain segments cleared the owner's flags instead, and the merged
 * edge was clipped at both ends (plantuml-ts issue 41).
 *
 * Expected `pos` values are native graphviz 16.1.0 `-Tdot`
 * (`~/git/graphviz/build/cmd/dot/dot`, `GVBINDIR=/tmp/ghl`), 2026-11-06.
 *
 * @see lib/dotgen/dotsplines.c:make_regular_edge (hackflag)
 * @see lib/common/splines.c:beginpath, endpath (side-port clip = false)
 */

import { describe, it, expect } from 'vitest';
import { parse, render } from '../../index.js';

const PORT_NODES = [
  'sh0006 [shape=plaintext,label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">'
    + '<TR><TD FIXEDSIZE="TRUE" WIDTH="49.575" HEIGHT="18"></TD></TR>'
    + '<TR><TD FIXEDSIZE="TRUE" WIDTH="49.575" HEIGHT="18" PORT="p"></TD></TR></TABLE>>];',
  'sh0007 [shape=plaintext,label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0">'
    + '<TR><TD FIXEDSIZE="TRUE" WIDTH="49.575" HEIGHT="18"></TD></TR>'
    + '<TR><TD FIXEDSIZE="TRUE" WIDTH="49.575" HEIGHT="18" PORT="q"></TD></TR></TABLE>>];',
].join('\n');

const GRAPH_ATTRS = 'nodesep=0.486111;\nranksep=0.833333;\nremincross=true;\nsearchsize=500;';
const NO_ARROWS = 'arrowtail=none,arrowhead=none,minlen=1';

const graphOf = (edges: string[]): string =>
  `digraph unix {\n${GRAPH_ATTRS}\n${PORT_NODES}\n${edges.join('\n')}\n}\n`;

/** Each edge's `pos` attribute, in output order. */
function edgePositions(dotOut: string): string[] {
  const flat = dotOut.replace(/[\n\t]/g, '');
  const out: string[] = [];
  for (const m of flat.matchAll(/->[^[]*\[[^\]]*?pos="([^"]*)"/g)) out.push(m[1]);
  return out;
}

const layout = (src: string): string[] => edgePositions(render(parse(src), 'dot'));

describe('merged multi-rank edge routed through hackflag views (plantuml-ts 41)', () => {
  it('second of five parallel port edges takes native\'s own route', () => {
    const src = graphOf([
      `sh0006:p->sh0007:q[${NO_ARROWS}];`,
      `sh0006:p->sh0007:q[${NO_ARROWS}];`,
      `sh0006:p->sh0007:q[${NO_ARROWS},label="x"];`,
      `sh0007:q->sh0006[${NO_ARROWS}];`,
      `sh0006->sh0007:q[${NO_ARROWS}];`,
    ]);
    expect(layout(src)).toEqual([
      '40.267,133.8 -13.422,133.8 -13.422,13 40.267,13',
      '40.267,133.8 12.574,133.8 7.6767,97.22 22.767,74 40.656,46.473 71.936,71.235 '
        + '90.267,44 97.904,32.653 104.94,13.305 91.586,13.004',
      '65.767,123.8 65.767,101.63 61.351,94.897 68.767,74 74.253,58.541 84.997,59.534 '
        + '90.267,44 94.695,30.946 105.05,13 91.267,13',
      '78.449,120.82 99.367,84.322 134.69,13 91.267,13',
      '91.267,13 102.3,13 126.34,62.04 114.77,90.8 110.14,102.3 101.53,112.67 92.811,121',
    ]);
  });

  it('forward merged edge keeps its head clip and loses its tail clip', () => {
    const src = graphOf(['sh0006:p->sh0007:q[minlen=2];', 'sh0006:p->sh0007:q[minlen=2];']);
    expect(layout(src)).toEqual([
      'e,58,13 32.5,168 32.5,102.55 116.27,23.588 69.219,13.974',
      'e,58.407,13.001 32.5,168 32.5,102.81 115.6,24.225 69.782,14.093',
    ]);
  });

  it('back edge merged into its opposite clears both of its own clips', () => {
    const src = graphOf(['sh0006:p->sh0007:q[minlen=2];', 'sh0007:q->sh0006:p[minlen=2];']);
    expect(layout(src)).toEqual([
      'e,58,13 32.5,168 32.5,102.55 116.27,23.588 69.219,13.974',
      'e,32.5,168 58,13 124.13,13 42.094,89.438 33.257,156.84',
    ]);
  });
});
