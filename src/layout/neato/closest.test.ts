// SPDX-License-Identifier: EPL-2.0
// lib/neatogen/closest.c against the native values of
// __fixtures__/dim/smart-units.json (plans/post-16-1-followups-10/harness/T7/smart-units-harness.c), the libc rand()
// stream included: every tie in the heap draws from it.
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { crand, csrand } from '../../common/crand.js';
import { closestPairs2Graph, findClosestPairs } from './closest.js';

interface GraphCase { graph: { edges: number[]; ewgts: number[] }[]; next: number }
const NATIVE = JSON.parse(readFileSync(new URL('./__fixtures__/dim/smart-units.json', import.meta.url), 'utf8')) as {
  closestDistinct: GraphCase; closestTies: GraphCase; closestFew: GraphCase;
};

const DISTINCT = Float64Array.of(3.5, 0.25, 9.75, 1.5, 6.125, 2.0, 12.5, 7.0);
const TIES = Float64Array.of(0, 1, 1, 2, 3, 3, 3, 5, 7);

function run(place: Float64Array, numPairs: number): GraphCase {
  csrand(1);
  const g = closestPairs2Graph(place, place.length, numPairs);
  return { graph: g.map((v) => ({ edges: v.edges, ewgts: v.ewgts })), next: crand() };
}

describe('closest_pairs2graph', () => {
  it('asks for more pairs than exist on distinct places', () => {
    expect(run(DISTINCT, 32)).toEqual(NATIVE.closestDistinct);
  });

  it('breaks ties from the rand() stream', () => {
    expect(run(TIES, 36)).toEqual(NATIVE.closestTies);
  });

  it('stops at numPairs', () => {
    expect(run(TIES, 3)).toEqual(NATIVE.closestFew);
  });

  it('keeps nedges in step with the edges', () => {
    csrand(1);
    const g = closestPairs2Graph(DISTINCT, 8, 32);
    expect(g.map((v) => v.nedges)).toEqual(g.map((v) => v.edges.length));
  });
});

describe('find_closest_pairs', () => {
  it('extracts consecutive pairs by distance, then their descendants', () => {
    csrand(1);
    const stack = findClosestPairs(Float64Array.of(0, 1, 3, 7), 4, 6);
    expect(stack.map((p) => [p.left, p.right, p.dist])).toEqual([
      [0, 1, 1], [1, 2, 2], [0, 2, 3], [2, 3, 4], [1, 3, 6], [0, 3, 7],
    ]);
  });
});
