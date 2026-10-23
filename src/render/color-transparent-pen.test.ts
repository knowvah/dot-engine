// SPDX-License-Identifier: EPL-2.0
/**
 * The `transparent` pen of peripheries=0 filled nodes and clusters goes through
 * gvrender_set_pencolor, so under a colorscheme the non-SVG renderers report
 * `transparent is not a known color.`; a striped cluster's colours resolve in
 * the cluster's scheme window. Expectations are native dot 16.1.0's stderr.
 * @see lib/common/shapes.c:3012-3016 poly_gencode
 * @see lib/common/emit.c:3892-3916 emit_clusters
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';

type Format = 'svg' | 'xdot' | 'json' | 'cmapx' | 'plain';
const NON_SVG: readonly Format[] = ['xdot', 'json', 'cmapx', 'plain'];
const TRANSPARENT = ['Warning: transparent is not a known color.'];

function stderrOf(src: string, format: Format): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  render(parse(src), format, { engine: 'dot' });
  return lines;
}

afterEach(() => { vi.restoreAllMocks(); });

describe('transparent pen under a colorscheme', () => {
  const NODE = 'digraph{a[colorscheme=blues3;style=filled;peripheries=0]}';
  const NODE_TWO = 'digraph{a[colorscheme=blues3;style=filled;fillcolor=2;peripheries=0]}';
  const CLUSTER = 'digraph{subgraph cluster_x{colorscheme=blues3;style=filled;peripheries=0;b}}';

  it.each(NON_SVG)('reports it for a peripheries=0 filled node (%s)', (f) => {
    expect(stderrOf(NODE, f)).toEqual(TRANSPARENT);
  });

  it.each(NON_SVG)('reports it before the scheme-index fill warning (%s)', (f) => {
    expect(stderrOf(NODE_TWO, f)).toEqual(TRANSPARENT);
  });

  it.each(NON_SVG)('reports it for a peripheries=0 filled cluster (%s)', (f) => {
    expect(stderrOf(CLUSTER, f)).toEqual(TRANSPARENT);
  });

  it.each([NODE, NODE_TWO, CLUSTER])('prints nothing for svg (%#)', (src) => {
    expect(stderrOf(src, 'svg')).toEqual([]);
  });
});

describe('striped cluster under a colorscheme', () => {
  const STRIPED = 'digraph{subgraph cluster_x{colorscheme=blues3;style=striped;fillcolor="1:2";b}}';
  const STRIPED_ROOT = 'digraph{colorscheme=blues3;subgraph cluster_x{style=striped;fillcolor="1:2";b}}';

  it.each(['svg', ...NON_SVG] as Format[])('resolves stripe indices in the scheme (%s)', (f) => {
    expect(stderrOf(STRIPED, f)).toEqual([]);
  });

  it('resolves stripe indices in the root scheme for svg', () => {
    expect(stderrOf(STRIPED_ROOT, 'svg')).toEqual([]);
  });

  it('reports the transparent pen of a peripheries=0 striped cluster once (xdot)', () => {
    const src = STRIPED.replace('b}', 'peripheries=0;b}');
    expect(stderrOf(src, 'xdot')).toEqual(TRANSPARENT);
  });
});
