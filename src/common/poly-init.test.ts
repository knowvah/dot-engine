// SPDX-License-Identifier: EPL-2.0

/**
 * poly_init image branches keyed on the bound usershape (item 97).
 * Expected stderr is the T0 native capture in gvc/__fixtures__/p7/images/97-*.
 * @see lib/common/shapes.c:2021-2051
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render } from '../gvc/device.js';

const SIZE = { w: 54, h: 27 }; // 40x20 pt at the default 96 dpi
const FIXTURES = new URL('../gvc/__fixtures__/p7/images/', import.meta.url);

async function fixture(name: string): Promise<string> {
  const { readFile } = await import('node:fs/promises');
  return (await readFile(new URL(name, FIXTURES), 'utf8')).trimEnd();
}

function layoutWarnings(dot: string, withSizer: boolean): string[] {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
  const ctx = createDefaultContext();
  if (withSizer) ctx.imageSizer = () => SIZE;
  const g = parse(dot);
  ctx.layout(g, 'dot');
  render(ctx, g, 'svg', false);
  const lines = warn.mock.calls.map((c) => String(c[0]));
  warn.mockRestore();
  return lines;
}

describe('poly_init usershape keying', () => {
  afterEach(() => vi.restoreAllMocks());

  it('custom without a shapefile warns with <nil> and no open line', async () => {
    const src = await fixture('97-custom.gv');
    const expected = (await fixture('97-custom.svg.stderr')).split('\n');
    expect(layoutWarnings(src, false)).toEqual(expected);
  });

  it('unknown shape with image= warns once and still sizes the image', async () => {
    const src = await fixture('97-nosuch-image.gv');
    const expected = (await fixture('97-nosuch-image.svg.stderr')).split('\n');
    const got = layoutWarnings(src, true);
    expect(got).toEqual(expected);
  });

  it('unknown shape without a sizer reports the image warnings after the shape line', () => {
    const got = layoutWarnings('digraph{a[shape=nosuch image="r.png"]}', false);
    expect(got).toEqual([
      'Warning: using box for unknown shape nosuch',
      'Warning: No such file or directory while opening r.png',
      'Warning: No or improper image="r.png" for node "a"',
    ]);
  });

  it('warns once per unknown name across nodes', () => {
    const got = layoutWarnings('digraph{a[shape=nosuch]; b[shape=nosuch]}', false);
    expect(got).toEqual(['Warning: using box for unknown shape nosuch']);
  });

  it('shapefile on a node forces custom and warns with the shapefile', () => {
    const got = layoutWarnings('digraph{a[shape=ellipse shapefile="s.png"]}', false);
    expect(got).toEqual([
      'Warning: No such file or directory while opening s.png',
      'Warning: No or improper shapefile="s.png" for node "a"',
    ]);
  });

  it('warns again in a second render of the same graph source', () => {
    const dot = 'digraph{a[shape=nosuch]}';
    const line = 'Warning: using box for unknown shape nosuch';
    expect(layoutWarnings(dot, false)).toEqual([line]);
    expect(layoutWarnings(dot, false)).toEqual([line]);
  });

  describe('custom shapefile sized by the caller (shapes.c:2027-2038)', () => {
    const DOT = 'digraph{a[shape=custom shapefile="s.png"]}';
    const PNG20 = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, ...new Array<number>(12).fill(0)];

    function run(hooks: (ctx: ReturnType<typeof createDefaultContext>) => void): { warns: string[]; svg: string } {
      const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const ctx = createDefaultContext();
      hooks(ctx);
      const g = parse(DOT);
      ctx.layout(g, 'dot');
      const svg = String(render(ctx, g, 'svg', false));
      const warns = warn.mock.calls.map((c) => String(c[0]));
      warn.mockRestore();
      return { warns, svg };
    }

    it('prints nothing when the per-context sizer sizes it', () => {
      expect(run((c) => { c.imageSizer = () => SIZE; }).warns).toEqual([]);
    });

    it('a 200x100 px shapefile grows the node to max(dimen, size + 2)', () => {
      // 200x100 px at 96 dpi = 150x75 pt (int trunc); +2 padding = 152x77 pt,
      // bigger than the 54x36 default, so bb = imagesize; graph adds 4pt margin each side.
      const { svg } = run((c) => { c.imageSizer = () => ({ w: 200, h: 100 }); });
      expect(svg).toContain('width="160pt" height="85pt"');
    });

    it('bad resolver bytes give the FT_NULL pair', () => {
      const { warns } = run((c) => { c.imageSizer = () => SIZE; c.imageResolver = () => new Uint8Array([104, 101, 108, 108, 111]); });
      expect(warns).toEqual([
        'Warning: "s.png" was not found as a file or as a shape library member',
        'Warning: No or improper shapefile="s.png" for node "a"',
      ]);
    });

    it('recognized resolver bytes with a sizer print nothing', () => {
      expect(run((c) => { c.imageSizer = () => SIZE; c.imageResolver = () => new Uint8Array(PNG20); }).warns).toEqual([]);
    });
  });
});
