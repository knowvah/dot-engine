// SPDX-License-Identifier: EPL-2.0

/**
 * Items 98-99 (part 7, T3): gvrender_set_fillcolor cuts a colour list at the
 * first ':' for point nodes and for the edge fill used by arrowheads. Expected
 * output and stderr are the native 16.1 fixtures under __fixtures__/p7/colors.
 *
 * @see lib/gvc/gvrender.c:456 gvrender_set_fillcolor
 * @see lib/common/emit.c:2397-2434,2541-2547 emit_edge_graphics
 */

import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';

const FIXTURES = new URL('./__fixtures__/p7/colors/', import.meta.url);

function fixture(name: string): string {
  return readFileSync(new URL(name, FIXTURES), 'utf8');
}

/** Every `c`/`C` colour op in a JSON tree, in document order (e.g. "C #ff0000"). */
function colorOps(node: unknown): string[] {
  if (Array.isArray(node)) return node.flatMap(colorOps);
  if (typeof node !== 'object' || node === null) return [];
  const rec = node as Record<string, unknown>;
  const own = (rec['op'] === 'c' || rec['op'] === 'C') && typeof rec['color'] === 'string'
    ? [`${String(rec['op'])} ${rec['color']}`] : [];
  return own.concat(Object.values(rec).flatMap(colorOps));
}

/** Drawing content only: the banner, ids and graph name differ per build. */
function drawing(text: string, format: string): string {
  if (format === 'json') return colorOps(JSON.parse(text) as unknown).join(' ');
  const keep = format === 'svg' ? /^<(polygon|ellipse|path)/ : /_(h|t)?draw_/;
  return text.split('\n').filter((l) => keep.test(l)).join('\n');
}

/** Render one probe in `format` on a fresh context; returns output + stderr. */
function renderProbe(gv: string, format: string, engine = 'dot'): { out: string; stderr: string } {
  const spy = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const ctx = createDefaultContext();
  const g = parse(gv);
  ctx.layout(g, engine);
  const out = deviceRender(ctx, g, format);
  ctx.freeLayout(g, engine);
  const stderr = spy.mock.calls.map((c) => String(c[0]) + '\n').join('');
  spy.mockRestore();
  return { out, stderr };
}

const PROBES = ['98-point', '99-edge', '99-edge-color', '99-edge-red-colon'] as const;
const FORMATS = ['svg', 'xdot', 'json'] as const;

describe('fill names cut at the first colon (items 98-99)', () => {
  afterEach(() => vi.restoreAllMocks());

  for (const probe of PROBES) {
    for (const format of FORMATS) {
      it(`${probe} -T${format} matches native output and stderr`, () => {
        const gv = fixture(`${probe}.gv`);
        const { out, stderr } = renderProbe(gv, format);
        expect(drawing(out, format)).toBe(drawing(fixture(`${probe}.${format}`), format));
        expect(stderr).toBe(fixture(`${probe}.${format}.stderr`));
      });
    }
  }

  it('an edge without fillcolor still fills the arrowhead with the pen colour', () => {
    const { out, stderr } = renderProbe('digraph{a->b[color=blue]}', 'svg');
    expect(out).toContain('<polygon fill="blue" stroke="blue"');
    expect(stderr).toBe('');
  });

  it('a plain fillcolor name fills the arrowhead and leaves the pen', () => {
    const { out } = renderProbe('digraph{a->b[color=blue fillcolor=green]}', 'svg');
    expect(out).toContain('<polygon fill="green" stroke="blue"');
  });

  // emit_edge_graphics resolves no colour when the edge has no spline
  // (`if (ED_spl(e))`, emit.c:2366); patchwork routes none. Native 16.1
  // -Kpatchwork prints nothing for both graphs in svg, xdot and json.
  it.each(FORMATS)('an edge without a spline resolves no fill or pen name (%s)', (format) => {
    expect(renderProbe('digraph{a->b[color=blqck]}', format, 'patchwork').stderr).toBe('');
    expect(renderProbe('digraph{a->b[fillcolor=":red"]}', format, 'patchwork').stderr).toBe('');
  });
});
