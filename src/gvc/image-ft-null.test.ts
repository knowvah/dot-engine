// SPDX-License-Identifier: EPL-2.0
// Item 104 / AD-6: layout-time FT_NULL warning for resolver bytes of unknown magic.
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { parse, renderWithContext } from '../index.js';
import { createDefaultContext } from './default-context.js';
import { getGlobalImageSizer, setImageSizer } from './usershape.js';
import { getGlobalImageResolver, setImageResolver } from './image-resolver.js';

const P7 = new URL('./__fixtures__/p7/images/', import.meta.url);
const P8 = new URL('./__fixtures__/p8/', import.meta.url);
const read = (d: URL, n: string): string => readFileSync(new URL(n, d), 'utf8');
const FORMATS = ['svg', 'xdot', 'json', 'dot', 'plain', 'cmapx'] as const;
const HELLO = new Uint8Array(readFileSync(new URL('bad.png', P7)));
const SIZE = { w: 16, h: 16 };

const lines = (s: string): string[] => s.split('\n').filter(l => l !== '');

function run(dot: string, fmt: string, withSize: boolean): { msgs: string[]; out: string } {
  const msgs: string[] = [];
  const spies = (['warn', 'error'] as const).map(ch =>
    vi.spyOn(console, ch).mockImplementation((m: unknown) => { msgs.push(String(m).replace(/\n$/, '')); }));
  let out = '';
  try {
    const ctx = createDefaultContext();
    ctx.imageResolver = () => HELLO;
    if (withSize) ctx.imageSizer = () => SIZE;
    const g = parse(dot);
    ctx.layout(g, 'dot');
    out = String(renderWithContext(ctx, g, fmt));
  } finally { for (const s of spies) s.mockRestore(); }
  return { msgs, out };
}

afterEach(() => { setImageSizer(null); setImageResolver(null); vi.restoreAllMocks(); });

describe('global hook accessors', () => {
  it('return what was registered, else null', () => {
    expect(getGlobalImageSizer()).toBeNull();
    expect(getGlobalImageResolver()).toBeNull();
    const sizer = () => SIZE;
    const resolver = () => HELLO;
    setImageSizer(sizer);
    setImageResolver(resolver);
    expect(getGlobalImageSizer()).toBe(sizer);
    expect(getGlobalImageResolver()).toBe(resolver);
  });
});

describe('node image= with unrecognized bytes', () => {
  for (const id of ['bad', 'svgbare'] as const) {
    const dot = read(P7, `101-${id}.gv`);
    it.each(FORMATS)(`${id} -T%s: native stderr, sizer ignored`, fmt => {
      const { msgs } = run(dot, fmt, true);
      expect(msgs).toEqual(lines(read(P7, `101-${id}.${fmt}.stderr`)));
    });
  }

  it('draws nothing and sizes nothing', () => {
    const { out } = run(read(P7, '101-bad.gv'), 'svg', true);
    expect(out).not.toContain('<image');
    expect(out).toContain('width="62pt" height="44pt"');
    expect(read(P7, '101-bad.svg')).toContain('width="62pt" height="44pt"');
  });

  it('a global resolver with bad bytes warns the same pair', () => {
    setImageResolver(() => HELLO);
    setImageSizer(() => SIZE);
    const msgs: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { msgs.push(String(m).replace(/\n$/, '')); });
    const g = parse(read(P7, '101-bad.gv'));
    createDefaultContext().layout(g, 'dot');
    expect(msgs).toEqual(lines(read(P7, '101-bad.svg.stderr')));
  });
});

describe('HTML <IMG> with unrecognized bytes', () => {
  it.each(['xdot', 'svg'] as const)('-T%s: native stderr (p8 fixture)', fmt => {
    const { msgs } = run(read(P8, 'html-img-bad.gv'), fmt, true);
    expect(msgs).toEqual(lines(read(P8, `html-img-bad.${fmt}.stderr`)));
  });
});
