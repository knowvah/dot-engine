// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { parse } from '../../parser/index.js';
import { render } from '../../index.js';
import { getInputscale } from '../../common/utils-inputscale.js';

type Pt = [number, number];

function nodes(src: string, engine: 'neato' | 'fdp'): Map<string, Pt> {
  const out = new Map<string, Pt>();
  for (const line of render(parse(src), 'plain', { engine }).split('\n')) {
    const f = line.split(' ');
    if (f[0] === 'node') out.set(f[1]!, [Number(f[2]), Number(f[3])]);
  }
  return out;
}

const body = 'a [pos="72,72!"]; b [pos="216,72!"]; a--b;';
const withScale = (v: string): string => `graph G { inputscale=${v}; ${body} }`;

describe('getInputscale', () => {
  const g = (v?: string) =>
    parse(v === undefined ? 'graph{a}' : `graph{inputscale=${v}; a}`);
  it('absent and unparseable give -1', () => {
    expect(getInputscale(g())).toBe(-1);
    expect(getInputscale(g('abc'))).toBe(-1);
  });
  it('0 and negatives give 72', () => {
    expect(getInputscale(g('0'))).toBe(72);
    expect(getInputscale(g('-5'))).toBe(72);
  });
  it('positive values pass through', () => {
    expect(getInputscale(g('36'))).toBe(36);
  });
});

describe.each(['neato', 'fdp'] as const)('%s inputscale', (engine) => {
  const dx = (src: string): number => {
    const n = nodes(src, engine);
    return n.get('b')![0] - n.get('a')![0];
  };
  it('72 divides pos to inches: b-a spans 2 in', () => {
    expect(dx(withScale('72'))).toBeCloseTo(2, 1);
  });
  it('0 and -5 behave as 72', () => {
    expect(dx(withScale('0'))).toBeCloseTo(dx(withScale('72')), 6);
    expect(dx(withScale('-5'))).toBeCloseTo(dx(withScale('72')), 6);
  });
  it('36 doubles the span relative to 72', () => {
    expect(dx(withScale('36'))).toBeCloseTo(4, 1);
  });
  it('unparseable leaves pos in points', () => {
    expect(dx(withScale('abc'))).toBeCloseTo(144 / 72 * 72, 1);
  });
});

describe('fdp cluster coords honour inputscale', () => {
  // The root `coords=""` declares the attribute graph-wide (C's agattr on the
  // root), which is what turns hasCoords on in the port (layout.ts:63).
  // Expected values are native `dot -Kfdp -Tplain` output for this graph.
  const src = (v: string): string =>
    `graph G { coords=""; inputscale=${v}; subgraph cluster_0 { coords="36,36,144,144"; x; y; x--y } subgraph cluster_1 { coords="216,36,324,144!"; z; w; z--w } x--z; y--w; q [pos="180,180"]; q--x; }`;
  const pos = (v: string): Map<string, Pt> => nodes(src(v), 'fdp');
  it('72 divides the coords box (native z = 3.0415, 0.42618)', () => {
    const z = pos('72').get('z')!;
    expect(z[0]).toBeCloseTo(3.0415, 0);
    expect(z[1]).toBeCloseTo(0.42618, 0);
  });
  it('0 and -5 behave as 72', () => {
    expect(pos('0')).toEqual(pos('72'));
    expect(pos('-5')).toEqual(pos('72'));
  });
  it('unparseable leaves coords in points (native z.x = 158.41)', () => {
    expect(pos('abc').get('z')![0]).toBeCloseTo(158.41, 0);
  });
});
