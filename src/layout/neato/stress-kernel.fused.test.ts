// SPDX-License-Identifier: EPL-2.0
// stressMajorizationKDMkernel runs the oracle's fused conjugate-gradient and right-multiply.
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Node } from '../../model/node.js';
import { srand48 } from '../../common/random.js';
import * as fused from './conjgrad-mkernel.js';
import { computeApspPacked, stressMajorizationKDMkernel } from './stress-kernel.js';
import type { VtxData } from './dijkstra.js';

vi.mock('./conjgrad-mkernel.js', async (orig) => {
  const actual = await orig<typeof import('./conjgrad-mkernel.js')>();
  return {
    ...actual,
    conjugateGradientMkernelFused: vi.fn(actual.conjugateGradientMkernelFused),
    rightMultWithVectorFFFused: vi.fn(actual.rightMultWithVectorFFFused),
  };
});
afterEach(() => { vi.clearAllMocks(); });

/** Path graph 0-1-2-3 as vtx_data. */
function path4(): VtxData[] {
  const adj = [[1], [0, 2], [1, 3], [2]];
  return adj.map((e) => ({ nedges: e.length + 1, edges: [0, ...e], ewgts: [] }) as unknown as VtxData);
}

function freshNodes(n: number): Node[] {
  return Array.from({ length: n }, () => ({ info: {} }) as unknown as Node);
}

describe('stressMajorizationKDMkernel', () => {
  it('solves each axis with the fused CG and evaluates stress with the fused right-multiply', () => {
    const n = 4;
    const coords = [new Float64Array(n), new Float64Array(n)];
    const iters = stressMajorizationKDMkernel(computeApspPacked(path4(), n), n, coords, freshNodes(n), {
      dim: 2, opts: 2, maxi: 3, epsilon: 1e-4,
    });
    expect(iters).toBe(3);
    expect(vi.mocked(fused.conjugateGradientMkernelFused)).toHaveBeenCalledTimes(2 * iters);
    // per iteration: dim lap1 products + dim lap2 products for the stress; CG adds its own
    expect(vi.mocked(fused.rightMultWithVectorFFFused).mock.calls.length).toBeGreaterThanOrEqual(4 * iters);
  });

  it('runs cola kernels for mode=ipsep: the shared fused CG, an unfused right-multiply', () => {
    const n = 4;
    const coords = [new Float64Array(n), new Float64Array(n)];
    const iters = stressMajorizationKDMkernel(computeApspPacked(path4(), n), n, coords, freshNodes(n), {
      dim: 2, opts: 2, maxi: 3, epsilon: 1e-4, cola: true,
    });
    expect(iters).toBe(3);
    expect(vi.mocked(fused.conjugateGradientMkernelFused)).toHaveBeenCalledTimes(2 * iters);
    expect(vi.mocked(fused.rightMultWithVectorFFFused)).not.toHaveBeenCalled();
    expect(coords[0]!.every(Number.isFinite)).toBe(true);
  });

  /**
   * Coordinates the 16.1 oracle's own `stress_majorization_kD_mkernel` (libneatogen.a, srand48(1),
   * opts 2, unit edge lengths) leaves for the kD probe graph a--b--c--d--a, a--c, b--d, e--a:
   * every bit, 78 iterations.
   */
  it('reproduces the oracle bit for bit on the kD probe graph', () => {
    const adj = [[1, 3, 2, 4], [0, 2, 3], [1, 3, 0], [2, 0, 1], [0]];
    const vtx = adj.map((e, i) => ({ nedges: e.length + 1, edges: [i, ...e], ewgts: [] }) as unknown as VtxData);
    srand48(1);
    const coords = [new Float64Array(5), new Float64Array(5)];
    const iters = stressMajorizationKDMkernel(computeApspPacked(vtx, 5), 5, coords, freshNodes(5), {
      dim: 2, opts: 2, maxi: 200, epsilon: 1e-4,
    });
    expect(iters).toBe(78);
    expect([...coords[0]!]).toEqual([
      -0.19806225597858429, 0.57778608798980713, -0.23763599991798401, 0.69466656446456909, -0.8367544412612915,
    ]);
    expect([...coords[1]!]).toEqual([
      0.21462653577327728, -0.68519026041030884, -0.68067926168441772, 0.11846987158060074, 1.0327730178833008,
    ]);
  });
});
