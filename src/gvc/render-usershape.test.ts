// SPDX-License-Identifier: EPL-2.0
// gvrender_usershape + poly_gencode usershape branch + core_loadimage_xdot.
// Expected strings are native graphviz 16.1.0 output (40x20 px r.png, 30x40 px
// t.png, installed via the image sizer).
import { describe, it, expect, afterEach } from 'vitest';
import { parse, render } from '../index.js';
import { setImageSizer } from './usershape.js';
import { getImagepos, getImagescale } from './render-usershape.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';

const SIZES: Record<string, { w: number; h: number }> = {
  'r.png': { w: 40, h: 20 },
  't.png': { w: 30, h: 40 },
};

afterEach(() => setImageSizer(null));

const draw = (src: string, format: 'svg' | 'xdot', engine = 'dot'): string => {
  setImageSizer((s) => SIZES[s] ?? null);
  return render(parse(src), format, { engine });
};

const svgImage = (svg: string): string[] => svg.match(/<image [^>]*\/>/g) ?? [];
const xdotImage = (xdot: string): string[] =>
  (xdot.match(/I [-\d. ]+ \d+ -[^ ]+ /g) ?? []).map((s) => s.trim());

const IMAGE_PREFIX = '<image xlink:href="t.png" ';
const IMAGE_ASPECT = 'preserveAspectRatio="xMinYMin meet" ';
const POS_BOX = (pos: string, scale: string): string =>
  `digraph{a[shape=box width=1.5 height=1 image="t.png" imagepos=${pos} imagescale=${scale}]}`;

// [imagepos, imagescale, svg attrs (width..y), xdot I op]
const POS_CASES: [string, string, string, string][] = [
  ['tl', 'false', 'width="30px" height="40px" x="0" y="-72"/>', 'I 0 32 30 40 5 -t.png'],
  ['tl', 'true', 'width="54px" height="72px" x="0" y="-72"/>', 'I 0 0 54 72 5 -t.png'],
  ['tl', 'width', 'width="108px" height="40px" x="0" y="-72"/>', 'I 0 32 108 40 5 -t.png'],
  ['tl', 'height', 'width="30px" height="72px" x="0" y="-72"/>', 'I 0 0 30 72 5 -t.png'],
  ['tl', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['tc', 'false', 'width="30px" height="40px" x="39" y="-72"/>', 'I 39 32 30 40 5 -t.png'],
  ['tc', 'true', 'width="54px" height="72px" x="27" y="-72"/>', 'I 27 0 54 72 5 -t.png'],
  ['tc', 'width', 'width="108px" height="40px" x="0" y="-72"/>', 'I 0 32 108 40 5 -t.png'],
  ['tc', 'height', 'width="30px" height="72px" x="39" y="-72"/>', 'I 39 0 30 72 5 -t.png'],
  ['tc', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['tr', 'false', 'width="30px" height="40px" x="78" y="-72"/>', 'I 78 32 30 40 5 -t.png'],
  ['tr', 'true', 'width="54px" height="72px" x="54" y="-72"/>', 'I 54 0 54 72 5 -t.png'],
  ['tr', 'width', 'width="108px" height="40px" x="0" y="-72"/>', 'I 0 32 108 40 5 -t.png'],
  ['tr', 'height', 'width="30px" height="72px" x="78" y="-72"/>', 'I 78 0 30 72 5 -t.png'],
  ['tr', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['ml', 'false', 'width="30px" height="40px" x="0" y="-56"/>', 'I 0 16 30 40 5 -t.png'],
  ['ml', 'true', 'width="54px" height="72px" x="0" y="-72"/>', 'I 0 0 54 72 5 -t.png'],
  ['ml', 'width', 'width="108px" height="40px" x="0" y="-56"/>', 'I 0 16 108 40 5 -t.png'],
  ['ml', 'height', 'width="30px" height="72px" x="0" y="-72"/>', 'I 0 0 30 72 5 -t.png'],
  ['ml', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['mc', 'false', 'width="30px" height="40px" x="39" y="-56"/>', 'I 39 16 30 40 5 -t.png'],
  ['mc', 'true', 'width="54px" height="72px" x="27" y="-72"/>', 'I 27 0 54 72 5 -t.png'],
  ['mc', 'width', 'width="108px" height="40px" x="0" y="-56"/>', 'I 0 16 108 40 5 -t.png'],
  ['mc', 'height', 'width="30px" height="72px" x="39" y="-72"/>', 'I 39 0 30 72 5 -t.png'],
  ['mc', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['mr', 'false', 'width="30px" height="40px" x="78" y="-56"/>', 'I 78 16 30 40 5 -t.png'],
  ['mr', 'true', 'width="54px" height="72px" x="54" y="-72"/>', 'I 54 0 54 72 5 -t.png'],
  ['mr', 'width', 'width="108px" height="40px" x="0" y="-56"/>', 'I 0 16 108 40 5 -t.png'],
  ['mr', 'height', 'width="30px" height="72px" x="78" y="-72"/>', 'I 78 0 30 72 5 -t.png'],
  ['mr', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['bl', 'false', 'width="30px" height="40px" x="0" y="-40"/>', 'I 0 0 30 40 5 -t.png'],
  ['bl', 'true', 'width="54px" height="72px" x="0" y="-72"/>', 'I 0 0 54 72 5 -t.png'],
  ['bl', 'width', 'width="108px" height="40px" x="0" y="-40"/>', 'I 0 0 108 40 5 -t.png'],
  ['bl', 'height', 'width="30px" height="72px" x="0" y="-72"/>', 'I 0 0 30 72 5 -t.png'],
  ['bl', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['bc', 'false', 'width="30px" height="40px" x="39" y="-40"/>', 'I 39 0 30 40 5 -t.png'],
  ['bc', 'true', 'width="54px" height="72px" x="27" y="-72"/>', 'I 27 0 54 72 5 -t.png'],
  ['bc', 'width', 'width="108px" height="40px" x="0" y="-40"/>', 'I 0 0 108 40 5 -t.png'],
  ['bc', 'height', 'width="30px" height="72px" x="39" y="-72"/>', 'I 39 0 30 72 5 -t.png'],
  ['bc', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
  ['br', 'false', 'width="30px" height="40px" x="78" y="-40"/>', 'I 78 0 30 40 5 -t.png'],
  ['br', 'true', 'width="54px" height="72px" x="54" y="-72"/>', 'I 54 0 54 72 5 -t.png'],
  ['br', 'width', 'width="108px" height="40px" x="0" y="-40"/>', 'I 0 0 108 40 5 -t.png'],
  ['br', 'height', 'width="30px" height="72px" x="78" y="-72"/>', 'I 78 0 30 72 5 -t.png'],
  ['br', 'both', 'width="108px" height="72px" x="0" y="-72"/>', 'I 0 0 108 72 5 -t.png'],
];

describe('imagepos x imagescale on a 1.5x1 box (native references)', () => {
  it.each(POS_CASES)('%s %s', (pos, scale, svgAttrs, op) => {
    const src = POS_BOX(pos, scale);
    const w = svgAttrs.match(/width="([^"]+)" height="([^"]+)" x="([^"]+)" y="([^"]+)"/)!;
    expect(svgImage(draw(src, 'svg'))).toEqual([
      `${IMAGE_PREFIX}width="${w[1]}" height="${w[2]}" ${IMAGE_ASPECT}x="${w[3]}" y="${w[4]}"/>`,
    ]);
    expect(xdotImage(draw(src, 'xdot'))).toEqual([op]);
  });
});

// [description, source, engine, svg <image>, xdot I op]
const NAMED_CASES: [string, string, string, string, string][] = [
  ['default mc', 'digraph{a[image="r.png"]}', 'dot', '<image xlink:href="r.png" width="40px" height="20px" preserveAspectRatio="xMinYMin meet" x="7" y="-28"/>', 'I 7 8 40 20 5 -r.png'],
  ['box imagescale=true imagepos=tl', 'digraph{a[shape=box image="r.png" imagescale=true imagepos=tl]}', 'dot', '<image xlink:href="r.png" width="54px" height="27px" preserveAspectRatio="xMinYMin meet" x="0" y="-36"/>', 'I 0 9 54 27 5 -r.png'],
  ['filled node', 'digraph{a[image="r.png" style=filled fillcolor=yellow]}', 'dot', '<image xlink:href="r.png" width="40px" height="20px" preserveAspectRatio="xMinYMin meet" x="7" y="-28"/>', 'I 7 8 40 20 5 -r.png'],
  ['peripheries=2', 'digraph{a[image="r.png" peripheries=2]}', 'dot', '<image xlink:href="r.png" width="40px" height="20px" preserveAspectRatio="xMinYMin meet" x="11" y="-32"/>', 'I 11 12 40 20 5 -r.png'],
  ['dpi=144', 'digraph{dpi=144;a[image="r.png"]}', 'dot', '<image xlink:href="r.png" width="20px" height="10px" preserveAspectRatio="xMinYMin meet" x="17" y="-23"/>', 'I 17 13 20 10 5 -r.png'],
  ['HTML IMG', 'digraph{a[shape=plain label=<<TABLE><TR><TD><IMG SRC="r.png"/></TD></TR></TABLE>>]}', 'dot', '<image xlink:href="r.png" width="30px" height="15px" preserveAspectRatio="xMinYMin meet" x="6" y="-21"/>', 'I 6 6 30 15 5 -r.png'],
  ['HTML IMG SCALE=BOTH in fixed cell', 'digraph{a[shape=plain label=<<TABLE><TR><TD FIXEDSIZE="TRUE" WIDTH="60" HEIGHT="60"><IMG SRC="t.png" SCALE="BOTH"/></TD></TR></TABLE>>]}', 'dot', '<image xlink:href="t.png" width="54px" height="54px" preserveAspectRatio="xMinYMin meet" x="6" y="-60"/>', 'I 6 6 54 54 5 -t.png'],
  ['neato', 'digraph{a[image="r.png"]}', 'neato', '<image xlink:href="r.png" width="40px" height="20px" preserveAspectRatio="xMinYMin meet" x="7" y="-28"/>', 'I 7 8 40 20 5 -r.png'],
];

describe('node and HTML images (native references)', () => {
  it.each(NAMED_CASES)('%s', (_d, src, engine, svg, op) => {
    expect(svgImage(draw(src, 'svg', engine))).toEqual([svg]);
    expect(xdotImage(draw(src, 'xdot', engine))).toEqual([op]);
  });

  it('rotate=90 xdot carries the unrotated I op', () => {
    expect(xdotImage(draw('digraph{rotate=90;a[image="r.png"]}', 'xdot'))).toEqual(['I 7 8 40 20 5 -r.png']);
  });

  it('draws the filled ellipse before the image, in the node _draw_', () => {
    const xdot = draw('digraph{a[image="r.png" style=filled fillcolor=yellow]}', 'xdot');
    expect(xdot).toContain('c 7 -#000000 C 7 -#ffff00 E 27 18 27 18 I 7 8 40 20 5 -r.png ');
  });

  it('draws nothing without a sizer (output unchanged)', () => {
    setImageSizer(null);
    const src = 'digraph{a[image="r.png"]}';
    expect(svgImage(render(parse(src), 'svg', { engine: 'dot' }))).toEqual([]);
    expect(xdotImage(render(parse(src), 'xdot', { engine: 'dot' }))).toEqual([]);
  });

  it('draws nothing when the size is zero in both dimensions', () => {
    setImageSizer(() => ({ w: 0, h: 0 }));
    const src = 'digraph{a[image="r.png"]}';
    expect(svgImage(render(parse(src), 'svg', { engine: 'dot' }))).toEqual([]);
  });

  it('draws nothing for -Tdot (no loadimage engine)', () => {
    setImageSizer((s) => SIZES[s] ?? null);
    const out = render(parse('digraph{a[image="r.png"]}'), 'dot', { engine: 'dot' });
    expect(out).not.toContain('I 7 8');
  });

  it('draws nothing for an empty image attribute', () => {
    expect(svgImage(draw('digraph{a[image=""]}', 'svg'))).toEqual([]);
  });
});

describe('get_imagescale / get_imagepos', () => {
  it('parses scale names case-insensitively and falls back through mapbool', () => {
    expect(['', 'WIDTH', 'Height', 'both', 'yes', '1', 'no', 'junk'].map(getImagescale)).toEqual(
      ['false', 'width', 'height', 'both', 'true', 'true', 'false', 'false']);
  });

  it('defaults an empty or unknown position to mc', () => {
    expect(['', 'TL', 'br', 'zz'].map(getImagepos)).toEqual(['mc', 'tl', 'br', 'mc']);
  });
});

describe('per-context sizer reaches every HTML IMG (native references)', () => {
  const ctxImages = (src: string): string[] => {
    const ctx = createDefaultContext();
    ctx.imageSizer = (s) => SIZES[s] ?? null;
    const g = parse(src);
    ctx.layout(g, 'dot');
    return svgImage(deviceRender(ctx, g, 'svg'));
  };
  const IMG = '<TABLE><TR><TD><IMG SRC="r.png"/></TD></TR></TABLE>';
  const at = (x: number, y: number): string =>
    `<image xlink:href="r.png" width="30px" height="15px" ${IMAGE_ASPECT}x="${x}" y="${y}"/>`;

  it.each([
    ['edge label', `digraph{a->b[label=<${IMG}>]}`, at(33, -75)],
    ['graph label', `digraph{label=<${IMG}>; a}`, at(14, -25)],
    ['cluster label', `digraph{subgraph cluster_x{label=<${IMG}>; a}}`, at(28, -85)],
  ])('%s', (_name, src, expected) => {
    expect(ctxImages(src)).toEqual([expected]);
  });
});
