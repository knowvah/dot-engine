// SPDX-License-Identifier: EPL-2.0
//
// Argument checks on the remaining public GvcContext surface (constructor,
// register) and renderWithContext (plans/error-hierarchy T8b, ADR-3).
import { describe, expect, it } from 'vitest';
import { GvcContext } from './context.js';
import { render as renderWithContext } from './device.js';
import { createDefaultContext } from './default-context.js';
import { EstimateTextMeasurer } from '../common/textmeasure.js';
import { parse } from '../parser/index.js';

const NULL = null as never;

function codeOf(fn: () => unknown): { ctor: string; code: unknown } {
  try {
    fn();
  } catch (e: unknown) {
    return { ctor: (e as Error).constructor.name, code: (e as { code?: unknown }).code };
  }
  throw new Error('expected a throw');
}

const INVALID_TYPE = { ctor: 'UsageTypeError', code: 'ERR_INVALID_ARG_TYPE' };

describe('GvcContext constructor', () => {
  it('rejects a measurer without a measure function', () => {
    expect(codeOf(() => new GvcContext({} as never))).toEqual(INVALID_TYPE);
    expect(codeOf(() => new GvcContext(NULL))).toEqual(INVALID_TYPE);
  });

  it('rejects non-object options', () => {
    expect(codeOf(() => new GvcContext(new EstimateTextMeasurer(), 'x' as never)))
      .toEqual(INVALID_TYPE);
  });

  it('accepts a measurer with and without options', () => {
    expect(new GvcContext(new EstimateTextMeasurer()).debug).toBeUndefined();
    expect(new GvcContext(new EstimateTextMeasurer(), {}).debug).toBeUndefined();
  });
});

describe('GvcContext.register', () => {
  const ctx = (): GvcContext => new GvcContext(new EstimateTextMeasurer());

  it('rejects null and objects without a string type', () => {
    expect(codeOf(() => ctx().register(NULL))).toEqual(INVALID_TYPE);
    expect(codeOf(() => ctx().register({ layout() {} } as never))).toEqual(INVALID_TYPE);
  });

  it('rejects a layout engine missing layout/cleanup functions', () => {
    expect(codeOf(() => ctx().register({ type: 'x', layout() {} } as never)))
      .toEqual(INVALID_TYPE);
  });

  it('rejects a renderer whose quality is not a number', () => {
    expect(codeOf(() => ctx().register({ type: 'svg', quality: 'hi' } as never)))
      .toEqual(INVALID_TYPE);
  });
});

describe('renderWithContext', () => {
  it('rejects a non-GvcContext ctx and a null graph', () => {
    const g = parse('digraph { a }');
    expect(codeOf(() => renderWithContext({} as never, g, 'svg'))).toEqual(INVALID_TYPE);
    expect(codeOf(() => renderWithContext(createDefaultContext(), NULL, 'svg')))
      .toEqual(INVALID_TYPE);
  });

  it('rejects a non-string format and an unknown one', () => {
    const ctx = createDefaultContext();
    const g = parse('digraph { a }');
    ctx.layout(g, 'dot');
    expect(codeOf(() => renderWithContext(ctx, g, 7 as never))).toEqual(INVALID_TYPE);
    expect(codeOf(() => renderWithContext(ctx, g, 'pdf')))
      .toEqual({ ctor: 'UsageTypeError', code: 'ERR_INVALID_ARG_VALUE' });
  });
});
