// SPDX-License-Identifier: EPL-2.0
//
// pack.c's int arithmetic on the polyRects path (osage `putRects`), which in C
// shares computeStep / GRID / fits with polyGraphs. The native arm64 build
// (objdump of libgvc `_computeStep`, `_genBox`, `_placeGraph`, `_fits`):
// `(int)l1` is `fcvtzs w` (saturates; NaN → 0), GRID's `(int)ceil(x/s)` is
// `fcvtps w` (saturates), and fits' `step * x` is a 32-bit `mul w` (wraps)
// before it is widened to double. Expectations are native 16.1 output
// (`dot -Kosage -v3` packing trace and -Txdot) for tests/1314.dot with
// packmode="graph", which sends osage's top-level pack through polyRects.
// @see lib/pack/pack.c:computeStep / GRID / fits / polyRects

import { PointSet } from '../../common/pointset.js';
import { describe, it, expect } from 'vitest';
import { parse } from '../../index.js';
import { render } from '../../render/public.js';
import { computeStep, gridCells, fits, type GInfo, type PlaceCtx } from './poly-pack.js';

const INT_MAX = 2147483647;

/** 1314.dot with packmode="graph": a 1.7e12-point node `s` and node `n0`. */
const SRC = 'digraph {\n packmode="graph"\n  s [   fontsize = "991836031967s8"]\nn0}\n';

/** `_draw_` of node `name` in an xdot string (line continuations removed). */
function nodeDraw(out: string, name: string): string {
  const m = new RegExp(`\\t${name}\\t\\[[^\\]]*?_draw_="([^"]*)"`).exec(out);
  return m === null ? '' : m[1]!;
}

describe('polyRects int arithmetic at extreme coordinates', () => {
  it('computeStep saturates (int)l1 at INT_MAX', () => {
    const bbs = [
      { ll: { x: -272931242819, y: -841600780840 }, ur: { x: 272931242819, y: 841600780840 } },
      { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } },
    ];
    expect(computeStep(2, bbs, 8)).toBe(INT_MAX);
  });

  it('gridCells saturates (int)ceil(x/s) at INT_MAX', () => {
    expect(gridCells(1e300, 1)).toBe(INT_MAX);
  });

  it('fits wraps step * x in 32 bits (native: cc at (129,-129) → (2147483519,-2147483519))', () => {
    const info: GInfo = { perim: 2, cells: [{ x: 0, y: 0 }], index: 0 };
    const ctx: PlaceCtx = {
      ps: new PointSet(),
      step: INT_MAX,
      bbs: [{ ll: { x: 0, y: 0 }, ur: { x: 54, y: 36 } }],
    };
    expect(fits(129, -129, info, ctx)).toEqual({ x: 2147483519, y: -2147483519 });
  });

  it('osage packmode=graph packs 1314 with the wrapped int placement (native -Txdot)', () => {
    const out = render(parse(SRC), 'xdot', { engine: 'osage' }).replace(/\\\n/g, '');
    expect(out).toContain('bb="0,0,5.4586e+11,1.6853e+12"');
    expect(nodeDraw(out, 'n0')).toBe('c 7 -#000000 e 4294967067 18 27 18 ');
    expect(nodeDraw(out, 's')).toBe(
      'c 7 -#000000 e 272931242819.48 843748264751.48 272931242819.48 841600780840.48 ',
    );
  });
});
