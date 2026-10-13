// SPDX-License-Identifier: EPL-2.0
//
// pack.c's int arithmetic at extreme coordinates, as the native arm64 build
// computes it (objdump of libgvc `_computeStep`, `_placeGraph`, `_fits`):
// computeStep's `(int)l1` is `fcvtzs w` (saturates at INT_MAX), GRID's
// `(int)ceil(x/s)` is `fcvtps w` (saturating), and fits' `step * x` is a
// 32-bit `mul w` (wraps) before it is widened to double. Expectations are
// native 16.1 output (`dot -Kcirco -v5` packing trace and -Txdot) for
// tests/1314.dot, a two-component graph with a 1.7e12-point node.
// @see lib/pack/pack.c:computeStep / GRID / fits

import { describe, it, expect } from 'vitest';
import { parse } from '../../index.js';
import { render } from '../../render/public.js';
import { computeStep } from './poly-place.js';

const INT_MAX = 2147483647;

/** 1314.dot: a huge-fontsize node `s` and an ordinary node `n0`. */
const SRC_1314 = 'digraph {\n  s [   fontsize = "991836031967s8"]\nn0}\n';

/** `_draw_` of node `name` in an xdot string (line continuations removed). */
function nodeDraw(out: string, name: string): string {
  const m = new RegExp(`\\t${name}\\t\\[[^\\]]*?_draw_="([^"]*)"`).exec(out);
  return m === null ? '' : m[1]!;
}

describe('pack.c int arithmetic at extreme coordinates', () => {
  it('computeStep saturates (int)l1 at INT_MAX', () => {
    // native trace: root 2147483647 (73780101054.314819)
    const bbs = [
      { ll: { x: -272931242819, y: -841600780840 }, ur: { x: 272931242819, y: 841600780840 } },
      { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } },
    ];
    expect(computeStep(bbs, 8)).toBe(INT_MAX);
  });

  it('computeStep keeps ordinary steps', () => {
    const bbs = [
      { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } },
      { ll: { x: -27, y: -18 }, ur: { x: 27, y: 18 } },
    ];
    expect(computeStep(bbs, 8)).toBe(6);
  });

  it('circo 1314 packs with the wrapped int placement (native -Txdot)', () => {
    // fits: cc_1 at cell (129,-129) → place = (int)(INT_MAX*129) + 27 =
    // 2147483546, (int)(INT_MAX*-129) + 18 = -2147483501.
    const out = render(parse(SRC_1314), 'xdot', { engine: 'circo' }).replace(/\\\n/g, '');
    expect(out).toContain('bb="0,0,5.4586e+11,1.6853e+12"');
    expect(nodeDraw(out, 'n0')).toBe('c 7 -#000000 e 4294967067.48 18 27 18 ');
    expect(nodeDraw(out, 's')).toBe(
      'c 7 -#000000 e 272931242819.48 843748264751 272931242819.48 841600780840.48 ',
    );
  });
});
