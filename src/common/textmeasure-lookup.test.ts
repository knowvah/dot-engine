// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRenderState } from './render-state.js';
import { getFamilyMetrics } from './textmeasure-lookup.js';

/** Native's text: the C literal carries "Warning: " and agwarningf adds another. */
const BOGUS_WARNING =
  "Warning: Warning: no hard-coded metrics for 'Bogus'.  Falling back to 'Times' metrics";

describe('getFamilyMetrics fallback warning', () => {
  afterEach(() => {
    resetRenderState();
    vi.restoreAllMocks();
  });

  it('prints the doubled prefix exactly as native', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getFamilyMetrics('Bogus');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([BOGUS_WARNING]);
  });

  it('prints once for repeated lookups of the same face', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    getFamilyMetrics('Bogus');
    getFamilyMetrics('Bogus');
    expect(warn.mock.calls.map((c) => String(c[0]))).toEqual([BOGUS_WARNING]);
  });
});
