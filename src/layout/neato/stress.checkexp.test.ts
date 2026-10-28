// SPDX-License-Identifier: EPL-2.0
// @see lib/neatogen/neatoinit.c:checkExp
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse } from '../../parser/index.js';
import { checkExp, OPT_EXP_FLAG, OPT_SMART_INIT } from './stress.js';

afterEach(() => { vi.restoreAllMocks(); });

const WARNING = 'stresswt attribute value must be 1 or 2 - ignoring';

function exp(src: string): { value: number; warnings: string[] } {
  const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  const value = checkExp(parse(src));
  const warnings = warn.mock.calls.map((c) => String(c[0]));
  warn.mockRestore();
  return { value, warnings };
}

describe('checkExp', () => {
  it('defaults to 2 without a warning when stresswt is unset', () => {
    expect(exp('graph{a--b}')).toEqual({ value: 2, warnings: [] });
  });
  it('accepts 1 and 2', () => {
    expect(exp('graph{stresswt=1;a--b}')).toEqual({ value: 1, warnings: [] });
    expect(exp('graph{stresswt=2;a--b}')).toEqual({ value: 2, warnings: [] });
  });
  it('warns and returns 2 for 3, 0 and negatives clamped to 0', () => {
    for (const v of ['3', '0', '-4']) {
      const r = exp(`graph{stresswt=${v};a--b}`);
      expect(r.value).toBe(2);
      expect(r.warnings).toHaveLength(1);
      expect(r.warnings[0]).toContain(WARNING);
    }
  });
  it('defaults without a warning for an empty or non-numeric value', () => {
    expect(exp('graph{stresswt="";a--b}')).toEqual({ value: 2, warnings: [] });
    expect(exp('graph{stresswt=x;a--b}')).toEqual({ value: 2, warnings: [] });
  });
});

describe('stress option bits', () => {
  it('match stress.h', () => {
    expect(OPT_EXP_FLAG).toBe(0x3);
    expect(OPT_SMART_INIT).toBe(0x4);
  });
});
