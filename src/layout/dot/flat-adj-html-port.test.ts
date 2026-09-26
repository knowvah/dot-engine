// SPDX-License-Identifier: EPL-2.0

/**
 * Adjacent flat edge to an HTML cell port that touches no table side.
 *
 * make_flat_adj_edges routes through the rotated aux graph whenever either
 * end has a *defined* port (ED_*_port(e).defined), whatever its side. An
 * interior cell's port has side 0, and gating on the side instead dropped the
 * edge to a stub fitter ("triangulation failed").
 * @see docs/graphviz-issues/19-flat-edge-ignores-html-table-port.md
 * @see lib/dotgen/dotsplines.c:make_flat_adj_edges (ports detection)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

// Bisected from plantuml class/sefazi-02-defe499: port "h" is the centre cell
// of a 3x3 table, so it lies on no side of the node.
const SRC = `digraph unix {
sh0007->sh0008:h[arrowtail=none,arrowhead=none,minlen=0];
sh0007 [shape=rect,label="",width=0.996181,height=0.666667];
sh0008 [shape=plaintext,label=<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR><TD></TD><TD FIXEDSIZE="TRUE" WIDTH="1.0" HEIGHT="0.0"></TD><TD></TD></TR><TR><TD FIXEDSIZE="TRUE" WIDTH="56.15" HEIGHT="1.0"></TD><TD FIXEDSIZE="TRUE" WIDTH="71.725" HEIGHT="48.0" PORT="h"></TD><TD FIXEDSIZE="TRUE" WIDTH="0.0" HEIGHT="1.0"></TD></TR><TR><TD></TD><TD FIXEDSIZE="TRUE" WIDTH="1.0" HEIGHT="0.0"></TD><TD></TD></TR></TABLE>>];
}`;

describe('make_flat_adj_edges with a side-less HTML cell port', () => {
  it('routes to the port cell as native dot does', () => {
    const out = render(parse(SRC), 'dot');
    // Native dot 15.1 -Tdot.
    expect(out).toContain('pos="71.884,28 96.453,28 129.14,28 153.55,28"');
  });
});
