// SPDX-License-Identifier: EPL-2.0
//
// Cluster style=striped (follow-up 62). C: emit_clusters (emit.c:3892-3906)
// draws stripedBox(bb corners, fillcolor, rotate=0) then an unfilled
// gvrender_box; striped is tested after rounded, before the plain box, and is
// drawn even for peripheries=0 / unfilled (pen "transparent"). Expected values
// are the native 16.1.0 output.

import { describe, it, expect } from 'vitest';
import { render, renderSvg, parse } from '../index.js';

const STRIPED = 'digraph{subgraph cluster_a{style=striped;fillcolor="red:green:blue";a}}';
const NO_PERIPHERIES =
  'digraph{subgraph cluster_a{style=striped;fillcolor="red:green:blue";peripheries=0;a}}';
const ROUNDED = 'digraph{subgraph cluster_a{style="striped,rounded";fillcolor="red:green:blue";a}}';
const FILLED = 'digraph{subgraph cluster_b{style="striped,filled";fillcolor="red:green";color=blue;b}}';

function clusterGroup(svg: string): string {
  const t = svg.indexOf('class="cluster"');
  return svg.slice(t, svg.indexOf('</g>', t));
}

describe('cluster style=striped (svg)', () => {
  it('draws one thin band per colour then an unfilled outline', () => {
    const g = clusterGroup(renderSvg(STRIPED, 'dot'));
    expect(g).toContain('<polygon fill="red" stroke="black" stroke-width="0.5" points="8,-8 31.33,-8 31.33,-60 8,-60 8,-8"/>');
    expect(g).toContain('<polygon fill="green" stroke="black" stroke-width="0.5" points="31.33,-8 54.67,-8 54.67,-60 31.33,-60 31.33,-8"/>');
    expect(g).toContain('<polygon fill="blue" stroke="black" stroke-width="0.5" points="54.67,-8 78,-8 78,-60 54.67,-60 54.67,-8"/>');
    expect(g).toContain('<polygon fill="none" stroke="black" points="8,-8 8,-60 78,-60 78,-8 8,-8"/>');
  });

  it('uses a transparent pen for peripheries=0 but still draws the stripes', () => {
    const g = clusterGroup(renderSvg(NO_PERIPHERIES, 'dot'));
    expect(g).toContain('<polygon fill="red" stroke="none" stroke-width="0.5" points="8,-8 31.33,-8 31.33,-60 8,-60 8,-8"/>');
    expect(g).toContain('<polygon fill="none" stroke="none" points="8,-8 8,-60 78,-60 78,-8 8,-8"/>');
  });

  it('rounded takes precedence over striped', () => {
    const g = clusterGroup(renderSvg(ROUNDED, 'dot'));
    expect(g).toContain('<path fill="none" stroke="black"');
    expect(g).not.toContain('fill="red"');
  });

  it('striped,filled uses the pen colour and the stripes, not a solid fill', () => {
    const g = clusterGroup(renderSvg(FILLED, 'dot'));
    expect(g).toContain('<polygon fill="red" stroke="blue" stroke-width="0.5"');
    expect(g).toContain('<polygon fill="none" stroke="blue" points=');
  });
});

describe('cluster style=striped (xdot)', () => {
  it('emits the thin-pen stripes in the cluster _draw_', () => {
    const out = render(parse(STRIPED), 'xdot', { engine: 'dot' });
    expect(out).toContain('S 17 -setlinewidth(0.5) c 7 -#000000 C 7 -#ff0000 P 4 8 8 31.33 8 31.33 60 8 60 ');
  });

  it('uses the transparent pen colour for peripheries=0', () => {
    const out = render(parse(NO_PERIPHERIES), 'xdot', { engine: 'dot' });
    expect(out).toContain('S 17 -setlinewidth(0.5) c 9 -#fffffe00 C 7 -#ff0000 P 4 8 8 31.33 8 31.33 60 8 60 ');
  });
});
