// SPDX-License-Identifier: EPL-2.0

/**
 * T4 (item 100) — core_loadimage_svg rotation branch.
 * Expected `<image>` line is native graphviz 16.1.0 output
 * (src/gvc/__fixtures__/p7/images/100-rotate.svg).
 * @see plugin/core/gvloadimage_core.c:core_loadimage_svg
 */

import { afterEach, describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { render } from './public.js';
import { setImageSizer } from '../gvc/usershape.js';

const SIZE = { w: 40, h: 20 };
const imageLine = (svg: string): string =>
  svg.split('\n').find((l) => l.startsWith('<image')) ?? '';

describe('svg usershape rotation', () => {
  afterEach(() => setImageSizer(null));

  it('rotate=90 matches native <image> line', () => {
    setImageSizer(() => SIZE);
    const svg = render(parse('digraph{rotate=90;a[image="r.png"]}'), 'svg');
    expect(imageLine(svg)).toBe(
      '<image xlink:href="r.png" width="20px" height="40px" '
      + 'preserveAspectRatio="xMidYMid meet" x="7" y="-28" '
      + 'transform="rotate(90 7 -28)"/>');
  });

  it('rotate=0 keeps the unrotated form', () => {
    setImageSizer(() => SIZE);
    const svg = render(parse('digraph{a[image="r.png"]}'), 'svg');
    expect(imageLine(svg)).toBe(
      '<image xlink:href="r.png" width="40px" height="20px" '
      + 'preserveAspectRatio="xMinYMin meet" x="7" y="-28"/>');
  });
});
