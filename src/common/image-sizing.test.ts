// SPDX-License-Identifier: EPL-2.0

/**
 * Item 83 (AD-10): `image=` and `<IMG>` sizing through the installed sizer,
 * compared against the native -Tplain node line (graphviz 16.1.0, x.png 40x30
 * and big.png 200x150).
 */

import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from '../gvc/default-context.js';
import { render as deviceRender } from '../gvc/device.js';
import { setImageSizer, type ImageSizer } from '../gvc/usershape.js';
import { setImageResolver, type ImageResolver } from '../gvc/image-resolver.js';

const TOL = 1e-4;
const SMALL = { w: 40, h: 30 };
const BIG = { w: 200, h: 150 };
const NODE_IMAGE = (f: string): string => `digraph{a[image="${f}"]}`;
const NODE_IMG = (f: string): string =>
  `digraph{a[label=<<TABLE><TR><TD><IMG SRC="${f}"/></TD></TR></TABLE>>]}`;

/** `node a x y w h` numbers from -Tplain. */
function plainNode(dot: string, hooks: { sizer?: ImageSizer; resolver?: ImageResolver }): number[] {
  const ctx = createDefaultContext();
  if (hooks.sizer !== undefined) ctx.imageSizer = hooks.sizer;
  if (hooks.resolver !== undefined) ctx.imageResolver = hooks.resolver;
  const g = parse(dot);
  ctx.layout(g, 'dot');
  const out = deviceRender(ctx, g, 'plain');
  ctx.freeLayout(g, 'dot');
  const line = out.split('\n').find((l) => l.startsWith('node a '));
  return line!.split(' ').slice(2, 6).map(Number);
}

const CASES: [string, string, { w: number; h: number }, number[]][] = [
  ['image= 40x30', NODE_IMAGE('x.png'), SMALL, [0.375, 0.25, 0.75, 0.5]],
  ['image= 200x150', NODE_IMAGE('big.png'), BIG, [1.4928, 1.1196, 2.9856, 2.2392]],
  ['IMG 40x30', NODE_IMG('x.png'), SMALL, [0.56961, 0.41248, 1.1392, 0.82496]],
  ['IMG 200x150', NODE_IMG('big.png'), BIG, [1.7481, 1.2964, 3.4963, 2.5927]],
];

describe('image sizing vs native -Tplain', () => {
  afterEach(() => {
    setImageSizer(null);
    setImageResolver(null);
    vi.restoreAllMocks();
  });

  it.each(CASES)('%s', (_name, dot, size, native) => {
    const got = plainNode(dot, { sizer: () => size });
    got.forEach((v, i) => expect(Math.abs(v - native[i]!)).toBeLessThan(TOL));
  });

  it('the graph dpi converts pixels to points (truncating)', () => {
    // dpi=72: 200x150 px stay 200x150 pt; dpi 96: 267x200 px -> (int)200.25, 150
    const at72 = plainNode('digraph{dpi=72 a[image="b.png"]}', { sizer: () => BIG });
    const at96 = plainNode('digraph{a[image="b.png"]}', { sizer: () => ({ w: 267, h: 200 }) });
    expect(at72).toEqual(at96);
    // native -Tplain (dpi=72, big.png): node a 1.9838 1.4928 3.9677 2.9856
    expect(at72[2]).toBeCloseTo(3.9677, 4);
    expect(at72[3]).toBeCloseTo(2.9856, 4);
  });

  it('sets GD_has_images when the image is sized', () => {
    const ctx = createDefaultContext();
    ctx.imageSizer = () => SMALL;
    const g = parse(NODE_IMAGE('x.png'));
    ctx.layout(g, 'dot');
    expect(g.info.has_images).toBe(true);
    ctx.freeLayout(g, 'dot');
  });

  it('with no sizer the size is the default and the warning is unchanged', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const got = plainNode(NODE_IMAGE('x.png'), {});
    expect(got).toEqual([0.375, 0.25, 0.75, 0.5]);
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([
      'Warning: No such file or directory while opening x.png',
      'Warning: No or improper image="x.png" for node "a"',
    ]);
  });

  it('a resolver alone suppresses the <IMG> open warning', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    plainNode(NODE_IMG('x.png'), { resolver: () => new Uint8Array([1]) });
    const text = [...err.mock.calls, ...warn.mock.calls].map((c) => String(c[0])).join('\n');
    expect(text).not.toContain('while opening');
    expect(text).toContain('No or improper image file="x.png"');
  });

  it('without a resolver the <IMG> open warning prints', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    plainNode(NODE_IMG('x.png'), {});
    const text = [...err.mock.calls, ...warn.mock.calls].map((c) => String(c[0])).join('\n');
    expect(text).toContain('No such file or directory while opening x.png');
  });
});
