// SPDX-License-Identifier: EPL-2.0
// @see lib/neatogen/neatoinit.c:1280-1287
import { describe, it, expect } from 'vitest';
import { neatoMaxIter, MODE_KK, MODE_MAJOR, MODE_HIER, MODE_IPSEP, MODE_SGD } from './init.js';

describe('neatoMaxIter', () => {
  it('uses 100*n for ipsep, hier and kk when maxiter is unset', () => {
    expect(neatoMaxIter(undefined, MODE_IPSEP, 7)).toBe(700);
    expect(neatoMaxIter(undefined, MODE_HIER, 300)).toBe(30000);
    expect(neatoMaxIter(undefined, MODE_KK, 5)).toBe(500);
  });
  it('uses 200 for major and 30 for sgd when unset', () => {
    expect(neatoMaxIter(undefined, MODE_MAJOR, 1000)).toBe(200);
    expect(neatoMaxIter(undefined, MODE_SGD, 1000)).toBe(30);
  });
  it('applies atoi to maxiter in every mode', () => {
    expect(neatoMaxIter('7', MODE_MAJOR, 50)).toBe(7);
    expect(neatoMaxIter('7', MODE_IPSEP, 50)).toBe(7);
    expect(neatoMaxIter('', MODE_IPSEP, 50)).toBe(0);
    expect(neatoMaxIter('12x', MODE_HIER, 50)).toBe(12);
    expect(neatoMaxIter('x12', MODE_MAJOR, 50)).toBe(0);
    expect(neatoMaxIter('  -3', MODE_MAJOR, 50)).toBe(-3);
    expect(neatoMaxIter('2.9', MODE_MAJOR, 50)).toBe(2);
  });
});
