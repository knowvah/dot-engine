// SPDX-License-Identifier: EPL-2.0
/**
 * removeOverlapWith runs normalize() and simpleScale() before it looks at the
 * overlap mode, so `normalize` and `scale` apply under neato, twopi, circo
 * and (when doAdjust) sfdp. Expected positions are native
 * `dot -K<engine> -Tplain` node centres (inches).
 *
 * @see lib/neatogen/adjust.c:removeOverlapWith (normalize, simpleScale)
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { simpleScale } from './simple-scale.js';
import { normalizeG } from '../fdp/normalize.js';
import { Edge } from '../../model/edge.js';

type Engine = 'neato' | 'twopi' | 'circo' | 'sfdp' | 'fdp';

/**
 * twopi/circo match native to plain's rounding; neato and sfdp carry their
 * existing no-attribute residuals (≈0.001 / 0.003 in), scaled by `scale`.
 */
const TOL: Record<Engine, number> = { twopi: 0.001, circo: 0.001, neato: 0.01, sfdp: 0.01, fdp: 0.001 };
const BODY = 'a--b--c--d--a; a--e; e--f';

const plain = (src: string, engine: Engine): string =>
  String(render(parse(src), 'plain', { engine }));

function positions(out: string): Map<string, [number, number]> {
  return new Map(out.split('\n').filter((l) => l.startsWith('node ')).map((l) => {
    const t = l.split(' ');
    return [t[1]!, [Number(t[2]), Number(t[3])]];
  }));
}

function expected(spec: string): Map<string, [number, number]> {
  return new Map(spec.split(' ').map((s) => {
    const [name, xy] = s.split(':') as [string, string];
    const [x, y] = xy.split(',').map(Number) as [number, number];
    return [name, [x, y]];
  }));
}

afterEach(() => { vi.restoreAllMocks(); });

const NATIVE: readonly (readonly [Engine, string, string])[] = [
  ['neato', 'normalize=45;',
    'a:1.0633,2.304 b:1.8423,3.083 c:1.1535,3.9375 d:0.375,3.1625 e:0.99197,1.2604 f:1.0656,0.25'],
  ['neato', 'scale="0.5,3";',
    'a:1.3921,2.8899 b:1.7235,0.25 c:2.1946,1.9388 d:1.8652,4.5756 e:0.8804,3.5383 f:0.375,3.7421'],
  ['neato', 'normalize=30; scale=1.5;',
    'a:1.1691,3.2269 b:2.6001,4.0531 c:1.9339,5.5586 d:0.50507,4.7381 e:0.66054,1.7426 f:0.375,0.25'],
  ['neato', 'normalize=true; overlap=scale;',
    'a:1.8257,1.704 b:2.9274,1.704 c:3.0446,2.7953 d:1.9461,2.7978 e:1.0374,1.0166 f:0.375,0.25'],
  ['twopi', 'normalize=true;',
    'a:2.375,0.25 b:5.375,0.25 c:4.375,0.25 d:3.375,0.25 e:1.375,0.25 f:0.375,0.25'],
  ['twopi', 'scale=2;',
    'a:0.375,6.25 b:0.375,0.25 c:0.375,2.25 d:0.375,4.25 e:0.375,8.25 f:0.375,10.25'],
  ['circo', 'normalize=-120;',
    'a:2.5272,1.6145 b:1.7395,0.25 c:0.375,1.0378 d:1.1628,2.4022 e:3.8554,1.9703 f:5.5458,2.4233'],
  ['circo', 'scale="2,1";',
    'a:4.8313,1.3641 b:2.6032,0.25 c:0.375,1.3641 d:2.6032,2.4782 e:7.5813,1.3641 f:11.081,1.3641'],
  ['sfdp', 'overlap=true; scale=2;',
    'a:3.8878,1.0443 b:5.338,0.25 c:6.5129,1.0449 d:5.3387,1.8382 e:1.9667,1.0445 f:0.375,1.0447'],
  ['sfdp', 'overlap=true; normalize=90;',
    'a:1.0717,1.7906 b:1.0717,2.6173 c:0.44086,2.9416 d:0.375,2.2361 e:1.533,0.94805 f:1.9152,0.25'],
];

describe('normalize and scale against the native oracle', () => {
  it.each(NATIVE)('%s %s', (engine, attrs, spec) => {
    const got = positions(plain(`graph g { start=3; ${attrs} ${BODY} }`, engine));
    for (const [name, [x, y]] of expected(spec)) {
      expect(Math.abs(got.get(name)![0] - x), `${name}.x`).toBeLessThan(TOL[engine]);
      expect(Math.abs(got.get(name)![1] - y), `${name}.y`).toBeLessThan(TOL[engine]);
    }
  });

  it('leaves fdp unchanged: its derived graphs never carry normalize/scale', () => {
    const base = plain(`graph g { start=3; ${BODY} }`, 'fdp');
    expect(plain(`graph g { start=3; scale=2; ${BODY} }`, 'fdp')).toBe(base);
    expect(plain(`graph g { start=3; normalize=45; ${BODY} }`, 'fdp')).toBe(base);
  });

  it('leaves sfdp with default prism0 unchanged (removeOverlapWith not called)', () => {
    const base = plain(`graph g { start=3; ${BODY} }`, 'sfdp');
    expect(plain(`graph g { start=3; scale=2; ${BODY} }`, 'sfdp')).toBe(base);
  });
});

/** Two nodes a(1,2), b(3,5) joined by a->b. */
function twoNodes(attrs: Record<string, string>): Graph {
  const g = new Graph('g', 'directed');
  for (const [k, v] of Object.entries(attrs)) g.attrs.set(k, v);
  const a = new Node(0, 'a', g); const b = new Node(1, 'b', g);
  a.info.pos = [1, 2]; b.info.pos = [3, 5];
  g.nodes.set('a', a); g.nodes.set('b', b);
  g.edges.push(new Edge(a, b, 'ab'));
  return g;
}
const posOf = (g: Graph): number[][] => [...g.nodes.values()].map((n) => [...n.info.pos!]);

describe('simpleScale (C sscanf "%lf,%lf")', () => {
  it.each([
    ['2', [[2, 4], [6, 10]]],
    ['2,0.5', [[2, 1], [6, 2.5]]],
    // "%lf,%lf" stops at the space before ',' → one value, applied to both axes.
    [' 2 ,3', [[2, 4], [6, 10]]],
    [' 2,3', [[2, 6], [6, 15]]],
    ['+1.5e0', [[1.5, 3], [4.5, 7.5]]],
  ])('scale=%j scales positions', (scale, want) => {
    const g = twoNodes({ scale });
    expect(simpleScale(g)).toBe(1);
    expect(posOf(g)).toEqual(want);
  });

  it.each([['1'], ['1,1'], ['0'], ['2,0'], ['x'], [''], ['1e-10']])(
    'scale=%j is a no-op returning 0', (scale) => {
      const g = twoNodes({ scale });
      expect(simpleScale(g)).toBe(0);
      expect(posOf(g)).toEqual([[1, 2], [3, 5]]);
    });

  it('is a no-op without the attribute', () => {
    const g = twoNodes({});
    expect(simpleScale(g)).toBe(0);
  });
});

describe('normalizeG return value (C normalize)', () => {
  it('returns 0 without the attribute and moves nothing', () => {
    const g = twoNodes({});
    expect(normalizeG(g)).toBe(0);
    expect(posOf(g)).toEqual([[1, 2], [3, 5]]);
  });

  it('returns 1 when it translates and rotates', () => {
    const g = twoNodes({ normalize: '0' });
    expect(normalizeG(g)).toBe(1);
    const [[ax, ay], [bx, by]] = posOf(g) as [[number, number], [number, number]];
    expect([ax, ay]).toEqual([0, 0]);
    expect(by).toBeCloseTo(0, 12);
    expect(bx).toBeCloseTo(Math.hypot(2, 3), 12);
  });

  it('returns 0 when the first node is at the origin and the edge already has the angle', () => {
    const g = twoNodes({ normalize: '90' });
    g.nodes.get('a')!.info.pos = [0, 0];
    g.nodes.get('b')!.info.pos = [0, 4];
    expect(normalizeG(g)).toBe(0);
  });

  it('parses a strtod angle with leading whitespace and sign', () => {
    const g = twoNodes({ normalize: ' +90' });
    normalizeG(g);
    const [, [bx, by]] = posOf(g) as [unknown, [number, number]];
    expect(bx).toBeCloseTo(0, 12);
    expect(by).toBeCloseTo(Math.hypot(2, 3), 12);
  });
});
