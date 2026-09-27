// SPDX-License-Identifier: EPL-2.0

/**
 * dot_sameports shared-port placement, oracle-checked.
 *
 * sameport.c builds the shared port by clipping a straight Bezier with the
 * node's own insidefn (shape_clip). For a peripheries=0 polygon (plaintext /
 * HTML label) poly_inside tests the raw vertex ring with no penwidth outline,
 * so the port lies on the node box itself.
 * @see docs/graphviz-issues/22-sametail-port-plaintext-lr-clip-offset.md
 * @see lib/dotgen/sameport.c:sameport
 * @see lib/common/splines.c:shape_clip
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../render/index.js';

const TABLE =
  '<<TABLE BORDER="0" CELLBORDER="0" CELLSPACING="0" CELLPADDING="0"><TR>' +
  '<TD FIXEDSIZE="TRUE" WIDTH="81.3625" HEIGHT="36"></TD></TR></TABLE>>';

function sametailSrc(rankdir: string): string {
  return `digraph g { ${rankdir}
a [shape=plaintext,label=${TABLE}];
b [shape=rect,label="",width=0.57,height=0.67]; c [shape=rect,label="",width=0.57,height=0.67];
a->b[sametail=x]; a->c[sametail=x]; }`;
}

/** First spline point of each edge in -Tdot output, as "x,y" strings. */
function edgeStarts(src: string): string[] {
  const out = render(parse(src), 'dot');
  return [...out.matchAll(/pos="e,[^ ]+ ([-\d.]+,[-\d.]+)/g)].map((m) => m[1]);
}

describe('dot_sameports on a plaintext HTML node', () => {
  // Native dot 15.1: pos="e,132.79,78.393 97,57.12 ..." for both edges.
  it('rankdir=LR: shared tail port sits on the node box (x=97)', () => {
    expect(edgeStarts(sametailSrc('rankdir=LR;'))).toEqual(['97,57.12', '97,57.12']);
  });

  // Native dot 15.1: pos="e,32.148,48.425 49.52,83.24 ..." for both edges.
  it('rankdir=TB: shared tail port matches the oracle', () => {
    expect(edgeStarts(sametailSrc(''))).toEqual(['49.52,83.24', '49.52,83.24']);
  });
});
