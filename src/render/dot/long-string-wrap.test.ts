// SPDX-License-Identifier: EPL-2.0
//
// Long strings wrap as write.c does (part 11 T3, AD-2; follow-ups 127, 135). The refs under
// plans/post-16-1-followups-11/harness/T0 are native 16.1.0's: poly40 is a 40-sided polygon whose
// _draw_ wraps 3 times (poly40-ll80 5 times, poly40-ll0 never). SECOND_XDOT is native's second xdot
// render of poly40 on one graph (harness/T5/twice.c print mode), repeated 8 of 8.
// @see lib/cgraph/write.c:_write_canonstr
// @see lib/cgraph/write.c:agwrite
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { parseXDot } from '../../xdot/index.js';
import { createDefaultContext } from '../../gvc/default-context.js';
import { render as deviceRender } from '../../gvc/device.js';
import { agstrcanonText } from '../map.js';
import { linelengthOf } from './agwrite-linelength.js';

const HARNESS = new URL('../../../plans/post-16-1-followups-11/harness/T0/', import.meta.url);
const read = (name: string): string => readFileSync(new URL(name, HARNESS), 'latin1');
const CONTINUATION = '\\\n';
type Fmt = 'dot' | 'xdot';

const ref = (name: string, fmt: Fmt): string => read(`${name}.${fmt}`);

/** Lay out and render the poly40-family source `name` in `fmt` on a fresh context. */
const renderRef = (name: string, fmt: Fmt): string => {
  const ctx = createDefaultContext();
  const g = parse(read(`${name}.gv`));
  ctx.layout(g, 'dot');
  return deviceRender(ctx, g, fmt);
};

const wraps = (s: string): number => s.split(CONTINUATION).length - 1;

describe('poly40 wraps its _draw_ as native does', () => {
  it.each(['dot', 'xdot'] as const)('%s output equals native', (fmt) => {
    expect(renderRef('poly40', fmt)).toBe(ref('poly40', fmt));
  });

  it('xdot wraps 3 times', () => {
    expect(wraps(renderRef('poly40', 'xdot'))).toBe(3);
  });
});

describe('linelength', () => {
  it.each(['dot', 'xdot'] as const)('0 (no wrap) %s equals native', (fmt) => {
    const out = renderRef('poly40-ll0', fmt);
    expect(out).toBe(ref('poly40-ll0', fmt));
    expect(wraps(out)).toBe(0);
  });

  it.each(['dot', 'xdot'] as const)('80 %s equals native', (fmt) => {
    expect(renderRef('poly40-ll80', fmt)).toBe(ref('poly40-ll80', fmt));
  });

  it('80 wraps xdot 5 times', () => {
    expect(wraps(renderRef('poly40-ll80', 'xdot'))).toBe(5);
  });

  it('is restored to 128 after a write', () => {
    renderRef('poly40-ll0', 'xdot');
    expect(wraps(agstrcanonText('a '.repeat(200)))).toBe(3);
  });

  it.each([
    [undefined, undefined],
    ['', undefined],
    ['x80', undefined],
    ['59', undefined],
    ['60', 60],
    ['0', 0],
    ['80abc', 80],
    ['2147483647', 2147483647],
    ['2147483648', undefined],
  ] as const)('linelengthOf(%s) is %s', (s, expected) => {
    expect(linelengthOf(s)).toBe(expected);
  });
});

const SECOND_XDOT = `digraph {
	graph [_draw_="c 9 -#fffffe00 C 7 -#ffffff P 4 0 0 0 108 54 108 54 0 c 9 -#fffffe00 C 7 -#ffffff P 4 0 0 0 108 54 108 54 0 ",
		bb="0,0,54,108",
		xdotversion=1.7
	];
	node [label="\\N"];
	a	[_draw_="c 7 -#000000 p 40 33.32 72.44 37.36 73.32 41.15 74.61 44.59 76.27 47.59 78.27 50.09 80.57 52.02 83.09 53.34 85.78 54 88.58 54 91.42 \\
53.34 94.22 52.02 96.91 50.09 99.43 47.59 101.73 44.59 103.73 41.15 105.39 37.36 106.68 33.32 107.56 29.12 108 24.88 108 20.68 107.56 \\
16.64 106.68 12.85 105.39 9.41 103.73 6.41 101.73 3.91 99.43 1.98 96.91 0.66 94.22 0 91.42 0 88.58 0.66 85.78 1.98 83.09 3.91 80.57 \\
6.41 78.27 9.41 76.27 12.85 74.61 16.64 73.32 20.68 72.44 24.88 72 29.12 72 ",
		_ldraw_="F 14 11 -Times-Roman c 7 -#000000 T 27 85.8 0 6.21 1 -a ",
		height=0.5,
		pos="27,90",
		shape=polygon,
		sides=40,
		width=0.75];
	b	[_draw_="c 7 -#000000 e 27 18 27 18 ",
		_ldraw_="F 14 11 -Times-Roman c 7 -#000000 T 27 13.8 0 7 1 -b ",
		height=0.5,
		pos="27,18",
		width=0.75];
	a -> b	[_draw_="c 7 -#000000 B 4 27 71.7 27 64.41 27 55.73 27 47.54 ",
		_hdraw_="S 5 -solid c 7 -#000000 C 7 -#000000 P 3 30.5 47.62 27 37.62 23.5 47.62 ",
		pos="e,27,36.104 27,71.697 27,64.407 27,55.726 27,47.536"];
}
`;

describe('a second xdot render', () => {
  it('wraps the replayed _draw_ as native does', () => {
    const ctx = createDefaultContext();
    const g = parse(read('poly40.gv'));
    ctx.layout(g, 'dot');
    expect(deviceRender(ctx, g, 'xdot')).toBe(ref('poly40', 'xdot'));
    ctx.freeLayout(g, 'dot');
    ctx.layout(g, 'dot');
    expect(deviceRender(ctx, g, 'xdot')).toBe(SECOND_XDOT);
  });
});

describe('the xdot parser reads the wrapped _draw_', () => {
  /** The `_draw_` of node a after the DOT reader has joined the continuation lines. */
  const drawOf = (xdot: string): string => {
    const draw = parse(xdot).nodes.get('a')?.attrs.get('_draw_');
    if (draw === undefined) throw new Error('node a has no _draw_');
    return draw;
  };

  it('yields the ops of the unwrapped string', () => {
    expect(ref('poly40', 'xdot').includes(CONTINUATION)).toBe(true);
    expect(ref('poly40-ll0', 'xdot').includes(CONTINUATION)).toBe(false);
    const wrapped = drawOf(ref('poly40', 'xdot'));
    const unwrapped = drawOf(ref('poly40-ll0', 'xdot'));
    expect(wrapped).toBe(unwrapped);
    const ops = parseXDot(wrapped);
    expect(ops?.ops.map((o) => o.kind)).toEqual(['pen_color', 'unfilled_polygon']);
    expect(ops).toEqual(parseXDot(unwrapped));
  });
});
