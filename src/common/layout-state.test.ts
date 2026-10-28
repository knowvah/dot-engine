// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import { GVBEGIN, GVSPLINES, getState, setState } from './layout-state.js';
import { resetRenderState } from './render-state.js';

describe('layout-state', () => {
  it('matches the C const.h values', () => {
    expect(GVBEGIN).toBe(0);
    expect(GVSPLINES).toBe(1);
  });

  it('setState is observable and resetRenderState restores GVBEGIN', () => {
    setState(GVSPLINES);
    expect(getState()).toBe(GVSPLINES);
    resetRenderState();
    expect(getState()).toBe(GVBEGIN);
  });
});
