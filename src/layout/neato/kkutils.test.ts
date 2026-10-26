// SPDX-License-Identifier: EPL-2.0
import { describe, expect, it } from 'vitest';
import { TIE_FIXTURES } from '../../../test/helpers/hier-graphs.js';
import { quicksortPlace, quicksortPlacef } from './kkutils.js';

const identity = (n: number): Int32Array => Int32Array.from({ length: n }, (_, i) => i);

describe('quicksortPlace (libc qsort tie order)', () => {
  it.each(TIE_FIXTURES.map((t, i) => [i, t] as const))('fixture %i matches native', (_i, t) => {
    const ordering = identity(t.v.length);
    quicksortPlace(Float64Array.from(t.v), ordering, t.v.length);
    expect([...ordering]).toEqual(t.place);
  });

  it('sorts only the first `size` entries', () => {
    const ordering = Int32Array.of(2, 1, 0, 3);
    quicksortPlace(Float64Array.of(0, 1, 2, 3), ordering, 3);
    expect([...ordering]).toEqual([0, 1, 2, 3]);
  });

  it('leaves a single element and an empty range alone', () => {
    const ordering = Int32Array.of(5);
    quicksortPlace(new Float64Array(6), ordering, 1);
    quicksortPlace(new Float64Array(6), ordering, 0);
    expect([...ordering]).toEqual([5]);
  });
});

describe('quicksortPlacef', () => {
  it.each(TIE_FIXTURES.map((t, i) => [i, t] as const))('fixture %i matches native', (_i, t) => {
    const ordering = identity(t.v.length);
    quicksortPlacef(Float32Array.from(t.v), ordering, 0, t.v.length - 1);
    expect([...ordering]).toEqual(t.placef);
  });

  it('sorts first..last inclusive and nothing else', () => {
    const ordering = Int32Array.of(3, 2, 1, 0);
    quicksortPlacef(Float32Array.of(0, 1, 2, 3), ordering, 1, 2);
    expect([...ordering]).toEqual([3, 1, 2, 0]);
  });

  it('is a no-op when first >= last', () => {
    const ordering = Int32Array.of(1, 0);
    quicksortPlacef(Float32Array.of(0, 1), ordering, 1, 1);
    quicksortPlacef(Float32Array.of(0, 1), ordering, 1, 0);
    expect([...ordering]).toEqual([1, 0]);
  });
});
