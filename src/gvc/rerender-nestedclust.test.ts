// SPDX-License-Identifier: EPL-2.0
//
// tests/graphs/nestedclust.gv laid out three times on one graph with no
// gvFreeLayout between the layouts (part-11 item 129). Fixtures are native
// 16.1.0's renders in one process (__fixtures__/rerender/regen.sh, twice.c
// nofree).
//
// Layout 2 ranks e and f together and leaves every edge out of the rank
// arrays; layout 3 ranks them apart and collects b -> c alone. Two things
// decide it: decompose's Cmark is a process static that layout 3 continues, so
// the ND_mark that layout 2 left on e and f does not equal it, and dot_splines_
// routes only the edges it collects from the rank arrays, so every other edge
// keeps the route it already had.
// @see lib/dotgen/decomp.c:decompose (static size_t Cmark)
// @see lib/dotgen/dotsplines.c:dot_splines_
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../parser/index.js';
import { createDefaultContext } from './default-context.js';
import { render as deviceRender } from './device.js';

const FIXTURES = new URL('./__fixtures__/rerender/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** Layouts with no free between them, one render after each, on one context. */
function noFreeRenders(fmt: string, count: number): string[] {
  const g = parse(read('nestedclust.gv'));
  const ctx = createDefaultContext();
  return Array.from({ length: count }, () => {
    ctx.layout(g, 'dot');
    return deviceRender(ctx, g, fmt);
  });
}

/**
 * Native xdot breaks a long quoted string with a backslash-newline at 128
 * columns (write.c:_write_canonstr); the port's xdot writer does not yet
 * (part-11 T3). Joining the breaks on both sides compares the values.
 */
const unwrap = (s: string): string => s.replaceAll('\\\n', '');

describe('nestedclust.gv, three dot layouts with no free', () => {
  it('-Tdot renders 1, 2 and 3 equal native', () => {
    const native = [1, 2, 3].map((n) => read(`nestedclust.dot.dot.nofree.${n}`));
    expect(noFreeRenders('dot', 3)).toEqual(native);
  });

  it('-Txdot renders 1, 2 and 3 equal native, long strings joined', () => {
    const native = [1, 2, 3].map((n) => unwrap(read(`nestedclust.dot.xdot.nofree.${n}`)));
    expect(noFreeRenders('xdot', 3).map(unwrap)).toEqual(native);
  });

  it('layout 2 adds no route: each edge keeps the one bezier layout 1 gave it', () => {
    const [, second] = noFreeRenders('dot', 2);
    expect(second).toContain('a -> b\t[pos="e,99,124.1 99,159.7 99,152.41 99,143.73 99,135.54"]');
    expect(second).toContain('e -> f\t[pos="e,27,124.1 27,159.7 27,152.41 27,143.73 27,135.54"]');
    expect(second).toContain('pos="1,106"');
  });

  it('layout 3 ranks f below e and routes b -> c alone', () => {
    const third = noFreeRenders('dot', 3)[2];
    expect(third).toContain(
      'b -> c\t[pos="e,99,52.104 99,87.697 99,80.407 99,71.726 99,63.536;'
      + 'e,0,52.104 0,87.697 0,80.407 0,71.726 0,63.536"]',
    );
    expect(third).toContain('f\t[height=0.5,\n\t\t\tpos="0,106"');
  });
});
