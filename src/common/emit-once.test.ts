// SPDX-License-Identifier: EPL-2.0

import { describe, expect, it } from 'vitest';
import { emitOnce } from './emit-once.js';
import { resetRenderState } from './render-state.js';

describe('emitOnce', () => {
  it('returns true the first time a string is seen and false after', () => {
    resetRenderState();
    expect(emitOnce('color foo')).toBe(true);
    expect(emitOnce('color foo')).toBe(false);
    expect(emitOnce('color bar')).toBe(true);
  });

  it('is cleared by the per-render reset', () => {
    resetRenderState();
    expect(emitOnce('color foo')).toBe(true);
    resetRenderState();
    expect(emitOnce('color foo')).toBe(true);
  });
});
