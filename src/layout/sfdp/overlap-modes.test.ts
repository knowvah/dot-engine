// SPDX-License-Identifier: EPL-2.0

/**
 * sfdp non-prism overlap modes: after layout C runs removeOverlapWith
 * (single component and per component), so every adjuster adjustNodesFull
 * dispatches must be reachable from sfdp.
 * @see lib/sfdpgen/sfdpinit.c:sfdp_layout (:272, :283)
 */

import { describe, it, expect } from 'vitest';
import { parse } from '../../parser/index.js';
import { RenderError } from '../../errors.js';
import { render } from '../../index.js';

const BIG_NODES = 'node [shape=box, width=3, height=2];';
const SINGLE = 'a -- b; a -- c; a -- d;';
const MULTI = 'a -- b; a -- c; a -- d; x -- y; x -- z; x -- w;';

function plainOf(overlap: string, body: string): string {
  return render(
    parse(`graph G { overlap=${overlap}; ${BIG_NODES} ${body} }`), 'plain', { engine: 'sfdp' });
}

function nodeCoords(plain: string): Map<string, [number, number]> {
  return new Map(
    plain.split('\n').filter((l) => l.startsWith('node ')).map((l) => {
      const f = l.split(' ');
      return [f[1]!, [Number(f[2]), Number(f[3])] as [number, number]];
    }));
}

describe('sfdp overlap=voronoi', () => {
  it.each([
    ['single component', SINGLE],
    ['multi component', MULTI],
  ])('throws UNSUPPORTED_FEATURE with overlapping nodes (%s)', (_l, body) => {
    expect(() => plainOf('voronoi', body)).toThrowError(RenderError);
    try {
      plainOf('voronoi', body);
    } catch (e) {
      expect((e as RenderError).code).toBe('UNSUPPORTED_FEATURE');
    }
  });

  it('does not throw when no pair of nodes overlaps', () => {
    const plain = render(
      parse('graph G { overlap=voronoi; node[shape=box,width=0.2,height=0.2]; a -- b; }'),
      'plain', { engine: 'sfdp' });
    expect(nodeCoords(plain).size).toBe(2);
  });
});

/** Native sfdp -Tplain node x/y (inches) for `overlap=scale` + MULTI. */
const NATIVE_SCALE_MULTI: Record<string, [number, number]> = {
  a: [4.6991, 4.6414], b: [4.787, 1], c: [7.8102, 6.5401], d: [1.5, 6.3878],
  x: [12.255, 7.4748], y: [12.343, 3.8333], z: [15.366, 9.3734], w: [9.0556, 9.2212],
};
const TOLERANCE = 0.5;

describe('sfdp overlap=scale', () => {
  it('matches native on a multi-component graph', () => {
    const got = nodeCoords(plainOf('scale', MULTI));
    for (const [name, [x, y]] of Object.entries(NATIVE_SCALE_MULTI)) {
      expect(Math.abs(got.get(name)![0] - x)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(got.get(name)![1] - y)).toBeLessThanOrEqual(TOLERANCE);
    }
  });

  it('is deterministic across repeated layouts', () => {
    expect(plainOf('scale', SINGLE)).toBe(plainOf('scale', SINGLE));
  });
});
