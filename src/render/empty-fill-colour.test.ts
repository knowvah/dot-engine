// SPDX-License-Identifier: EPL-2.0
/**
 * A leading ':' leaves an empty first colour; gvrender_set_fillcolor hands it
 * to colorxlate, which warns once and fills opaque black. Expectations are
 * native dot 16.1.0's (svg, xdot, json).
 * @see lib/gvc/gvrender.c:gvrender_set_fillcolor
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import { resetRenderState } from '../common/render-state.js';

const WARNING = 'Warning:  is not a known color.';
const FORMATS = ['svg', 'xdot', 'json'] as const;

const CASES: Record<string, string> = {
  node: 'digraph{a[style=filled fillcolor=":red"]}',
  'node ga90': 'digraph{a[style=filled fillcolor=":red" gradientangle=90]}',
  'cluster fillcolor': 'digraph{subgraph cluster_x{style=filled fillcolor=":red"; a}}',
  'cluster fillcolor ga90':
    'digraph{subgraph cluster_x{style=filled fillcolor=":red" gradientangle=90; a}}',
  'cluster bgcolor': 'digraph{subgraph cluster_x{bgcolor=":red"; a}}',
};

function run(src: string, fmt: (typeof FORMATS)[number]): { out: string; err: string[] } {
  const err: string[] = [];
  const sink = (...a: unknown[]): void => { err.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return { out: String(render(parse(src), fmt, { engine: 'dot' })), err };
}

describe('empty first colour in a fill', () => {
  beforeEach(() => { resetRenderState(); });
  afterEach(() => { vi.restoreAllMocks(); });

  for (const [name, src] of Object.entries(CASES)) {
    for (const fmt of FORMATS) {
      it(`${name} -T${fmt}: one warning, opaque black`, () => {
        const { out, err } = run(src, fmt);
        expect(err.filter((l) => l.includes('not a known color'))).toEqual([WARNING]);
        if (fmt === 'svg') expect(out).toMatch(/<(ellipse|polygon) fill="#000000"/);
        else if (fmt === 'xdot') expect(out).toContain('c 7 -#000000 C 7 -#000000');
        else expect(out).toMatch(/"op": "C",\s+"grad": "none",\s+"color": "#000000"/);
      });
    }
  }

  it('a trailing empty colour is still a gradient, silently', () => {
    const { out, err } = run('digraph{a[style=filled fillcolor="red:"]}', 'svg');
    expect(err).toEqual([]);
    expect(out).toContain('linearGradient');
  });
});
