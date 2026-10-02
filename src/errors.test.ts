// SPDX-License-Identifier: EPL-2.0
import { describe, it, expect } from 'vitest';
import {
  FRIENDLY_MESSAGES,
  friendlyMessageFor,
  DotEngineError,
  InternalError,
  RenderError,
  invalidArgType,
  invalidArgValue,
  outOfRange,
  invalidState,
  isUsageError,
  isGvError,
  type GvErrorCode,
} from './errors.js';

const ALL_CODES: GvErrorCode[] = [
  'SYNTAX_ERROR',
  'SYNTAX_UNEXPECTED_EOF',
  'EDGE_OP_DIRECTED_IN_UNDIRECTED',
  'EDGE_OP_UNDIRECTED_IN_DIRECTED',
  'HTML_PARSE_ERROR',
  'RENDER_ERROR',
  'GENERIC_ERROR',
  'INTERNAL_ERROR',
  'UNKNOWN_LAYOUT',
  'UNSUPPORTED_FEATURE',
];

describe('FRIENDLY_MESSAGES', () => {
  it('maps every code to a non-empty string', () => {
    for (const code of ALL_CODES) {
      expect(typeof FRIENDLY_MESSAGES[code]).toBe('string');
      expect(FRIENDLY_MESSAGES[code].length).toBeGreaterThan(0);
    }
  });

  it('has exactly the ten known codes', () => {
    expect(Object.keys(FRIENDLY_MESSAGES).sort()).toEqual([...ALL_CODES].sort());
  });
});

describe('friendlyMessageFor', () => {
  it('returns a non-empty string for GENERIC_ERROR', () => {
    expect(friendlyMessageFor('GENERIC_ERROR')).toBe(
      FRIENDLY_MESSAGES.GENERIC_ERROR,
    );
    expect(friendlyMessageFor('GENERIC_ERROR').length).toBeGreaterThan(0);
  });

  it('returns the mapped message for each code', () => {
    for (const code of ALL_CODES) {
      expect(friendlyMessageFor(code)).toBe(FRIENDLY_MESSAGES[code]);
    }
  });
});

describe('RenderError', () => {
  it('defaults to RENDER_ERROR with render type and the given message', () => {
    const e = new RenderError('boom');
    expect(e.type).toBe('render');
    expect(e.code).toBe('RENDER_ERROR');
    expect(e.message).toBe('boom');
    expect(e.friendlyMessage).toBe(FRIENDLY_MESSAGES.RENDER_ERROR);
    expect(e.name).toBe('RenderError');
  });

  it('honors an explicit GENERIC_ERROR code', () => {
    const e = new RenderError('x', 'GENERIC_ERROR');
    expect(e.code).toBe('GENERIC_ERROR');
    expect(e.friendlyMessage).toBe(FRIENDLY_MESSAGES.GENERIC_ERROR);
  });

  it('is an Error instance', () => {
    expect(new RenderError('x') instanceof Error).toBe(true);
  });
});

describe('RenderError hierarchy', () => {
  it('is a DotEngineError', () => {
    expect(new RenderError('m') instanceof DotEngineError).toBe(true);
    expect(new RenderError('m').code).toBe('RENDER_ERROR');
  });

  it.each(['UNKNOWN_LAYOUT', 'UNSUPPORTED_FEATURE'] as const)(
    'types %s as semantic',
    (code) => {
      const e = new RenderError('m', code);
      expect(e.type).toBe('semantic');
      expect(e.code).toBe(code);
      expect(e.friendlyMessage).toBe(FRIENDLY_MESSAGES[code]);
    },
  );

  it('types RENDER_ERROR and GENERIC_ERROR as render', () => {
    expect(new RenderError('m', 'GENERIC_ERROR').type).toBe('render');
    expect(new RenderError('m').type).toBe('render');
  });

  it('forwards ErrorOptions cause', () => {
    const c = new Error('c');
    const e = new RenderError('m', 'RENDER_ERROR', { cause: c });
    expect(e.cause).toBe(c);
  });

  it('cannot instantiate the abstract base', () => {
    // @ts-expect-error DotEngineError is abstract
    const e: unknown = new DotEngineError('x');
    expect(e instanceof Error).toBe(true);
  });
});

describe('InternalError', () => {
  it('carries the internal-error contract', () => {
    const c = new Error('c');
    const e = new InternalError('x', { cause: c });
    expect(e instanceof InternalError).toBe(true);
    expect(e instanceof DotEngineError).toBe(true);
    expect(e instanceof Error).toBe(true);
    expect(e.name).toBe('InternalError');
    expect(e.code).toBe('INTERNAL_ERROR');
    expect(e.type).toBe('render');
    expect(e.cause).toBe(c);
    expect(e.message).toBe('x');
    expect(e.friendlyMessage).toBe(FRIENDLY_MESSAGES.INTERNAL_ERROR);
    expect(e.friendlyMessage).toMatch(/bug/);
    expect(e.friendlyMessage).toMatch(/report/);
  });

  it('works without options', () => {
    expect(new InternalError('x').cause).toBeUndefined();
  });
});

describe('usage errors', () => {
  const codeOf = (e: unknown): unknown => (e as { code?: unknown }).code;

  it('invalidArgType', () => {
    const e = invalidArgType('dotSource', 'string', null);
    expect(e instanceof TypeError).toBe(true);
    expect(e instanceof DotEngineError).toBe(false);
    expect(e.name).toBe('TypeError');
    expect(codeOf(e)).toBe('ERR_INVALID_ARG_TYPE');
    expect(e.message).toBe(
      'The "dotSource" argument must be of type string. Received null',
    );
  });

  it.each([
    [undefined, 'undefined'],
    [42, 'number 42'],
    ['hi', 'string "hi"'],
    [true, 'boolean true'],
    [10n, 'bigint 10'],
    [[1], 'an instance of Array'],
    [{}, 'an instance of Object'],
    [Object.create(null), 'an object'],
    [() => 1, 'a function'],
    [Symbol('s'), 'a symbol'],
  ])('describes received value %s', (actual, text) => {
    expect(invalidArgType('p', 'string', actual).message).toBe(
      `The "p" argument must be of type string. Received ${text}`,
    );
  });

  it('invalidArgValue', () => {
    const e = invalidArgValue('engine', 'nope', ['dot', 'neato']);
    expect(e instanceof TypeError).toBe(true);
    expect(e.name).toBe('TypeError');
    expect(codeOf(e)).toBe('ERR_INVALID_ARG_VALUE');
    expect(e.message).toBe(
      'The argument "engine" is invalid. Received "nope"; allowed: dot, neato',
    );
  });

  it('outOfRange', () => {
    const e = outOfRange('dpi', '>= 0', -1);
    expect(e instanceof RangeError).toBe(true);
    expect(e.name).toBe('RangeError');
    expect(codeOf(e)).toBe('ERR_OUT_OF_RANGE');
    expect(e.message).toBe(
      'The value of "dpi" is out of range. It must be >= 0. Received -1',
    );
  });

  it('invalidState', () => {
    const e = invalidState('layout has not run');
    expect(e.name).toBe('Error');
    expect(codeOf(e)).toBe('ERR_INVALID_STATE');
    expect(e.message).toBe('layout has not run');
  });

  it('isUsageError accepts the four factories only', () => {
    expect(isUsageError(invalidArgType('p', 't', 1))).toBe(true);
    expect(isUsageError(invalidArgValue('p', 'v', []))).toBe(true);
    expect(isUsageError(outOfRange('p', 'r', 1))).toBe(true);
    expect(isUsageError(invalidState('s'))).toBe(true);
    expect(isUsageError(new TypeError('x'))).toBe(false);
    expect(isUsageError(new RenderError('x'))).toBe(false);
    expect(isUsageError(null)).toBe(false);
    expect(isUsageError('ERR_INVALID_STATE')).toBe(false);
  });
});

describe('isGvError', () => {
  it('accepts a plain object with string type and code', () => {
    expect(isGvError({ type: 'syntax', code: 'SYNTAX_ERROR', message: 'm' })).toBe(
      true,
    );
  });

  it('accepts DotEngineError instances', () => {
    expect(isGvError(new InternalError('x'))).toBe(true);
  });

  it.each([
    [new TypeError('x')],
    [null],
    [undefined],
    ['str'],
    [{ type: 1, code: 'X' }],
    [{ type: 'x', code: 2 }],
    [{ type: 'x' }],
  ])('rejects %s', (v) => {
    expect(isGvError(v)).toBe(false);
  });
});
