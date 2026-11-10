// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { agseterrf } from '../../common/agerr.js';
import { conjugateGradient, conjugateGradientF } from './conjgrad.js';
import type { VtxData } from './dijkstra.js';

/** C's text at `lib/neatogen/conjgrad.c:65,141,217`, without its trailing `\n`. */
const ZERO_LENGTH_TEXT = 'conjugate_gradient: unexpected length 0 vector';

/** A diagonal 1e30 matrix and a 1e-170 right-hand side: r.r underflows to 0. */
function underflowDouble(): number {
  const A: VtxData[] = [0, 1].map((i) => ({ nedges: 1, edges: [i], ewgts: [1e30] }));
  return conjugateGradient(A, new Float64Array(2), Float64Array.of(1e-170, -1e-170), 2, 0, 3);
}

function underflowF(): number {
  const A = [Float32Array.of(1e30, 0), Float32Array.of(0, 1e30)];
  return conjugateGradientF(A, new Float64Array(2), Float64Array.of(1e-170, -1e-170), 2,
    { tol: 0, maxIterations: 3, ortho1: false });
}

const SITES: ReadonlyArray<readonly [string, () => number]> = [
  ['conjugate_gradient', underflowDouble],
  ['conjugate_gradient_f', underflowF],
];

afterEach(() => {
  agseterrf(null);
  vi.restoreAllMocks();
});

describe.each(SITES)('%s zero-length residual', (_name, run) => {
  it('prints exactly one console line without a trailing newline', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(run()).toBe(1);
    expect(err.mock.calls).toEqual([[`Error: ${ZERO_LENGTH_TEXT}`]]);
  });

  it('gives an agseterrf sink C\'s three pieces with one trailing newline', () => {
    const pieces: string[] = [];
    agseterrf((m) => { pieces.push(m); });
    expect(run()).toBe(1);
    expect(pieces).toEqual(['Error', ': ', `${ZERO_LENGTH_TEXT}\n`]);
  });
});
