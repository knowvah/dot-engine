// SPDX-License-Identifier: EPL-2.0

/**
 * Argument checks on the process-global host-hook setters.
 *
 * @see plans/error-hierarchy/decisions.md ADR-3
 */

import { afterEach, describe, expect, it } from 'vitest';
import { setImageSizer, findImageSize } from './usershape.js';
import { setImageResolver, findImageBytes } from './image-resolver.js';
import {
  setTextMeasurer,
  getTextMeasurer,
} from '../common/textmeasure-factory.js';
import type { TextMeasurer } from '../common/textmeasure.js';

const CODE = 'ERR_INVALID_ARG_TYPE';

function thrown(fn: () => void): unknown {
  try {
    fn();
  } catch (e) {
    return e;
  }
  return undefined;
}

function expectInvalidArg(fn: () => void, param: string, expected: string): void {
  const e = thrown(fn);
  expect(e).toBeInstanceOf(TypeError);
  expect((e as { code?: string }).code).toBe(CODE);
  expect((e as Error).message).toContain(`"${param}"`);
  expect((e as Error).message).toContain(expected);
}

const fakeMeasurer: TextMeasurer = { measure: () => ({ w: 1, h: 2 }) };

describe('host hook argument checks', () => {
  afterEach(() => {
    setImageSizer(null);
    setImageResolver(null);
    setTextMeasurer(undefined);
  });

  describe('setImageSizer', () => {
    it.each(['x', 42, undefined, {}])('rejects %j', (bad) => {
      expectInvalidArg(
        () => setImageSizer(bad as never),
        'sizer',
        'function or null',
      );
    });

    it('accepts a function and null (clears)', () => {
      setImageSizer(() => ({ w: 3, h: 4 }));
      expect(findImageSize('a.png')).toEqual({ w: 3, h: 4 });
      setImageSizer(null);
      expect(findImageSize('a.png')).toBeNull();
    });

    it('keeps the previous sizer when the argument is rejected', () => {
      setImageSizer(() => ({ w: 3, h: 4 }));
      expect(thrown(() => setImageSizer('x' as never))).toBeInstanceOf(TypeError);
      expect(findImageSize('a.png')).toEqual({ w: 3, h: 4 });
    });
  });

  describe('setImageResolver', () => {
    it.each(['x', 7, undefined, {}])('rejects %j', (bad) => {
      expectInvalidArg(
        () => setImageResolver(bad as never),
        'resolver',
        'function or null',
      );
    });

    it('accepts a function and null (clears)', () => {
      setImageResolver(() => new Uint8Array([1]));
      expect(findImageBytes('a.png')?.bytes).toEqual(new Uint8Array([1]));
      setImageResolver(null);
      expect(findImageBytes('a.png')).toBeNull();
    });
  });

  describe('setTextMeasurer', () => {
    it.each([{}, null, 'x', 5, { measure: 1 }])('rejects %j', (bad) => {
      expectInvalidArg(
        () => setTextMeasurer(bad as never),
        'measurer',
        'TextMeasurer or undefined',
      );
    });

    it('accepts a measurer and undefined (clears)', () => {
      setTextMeasurer(fakeMeasurer);
      expect(getTextMeasurer()).toBe(fakeMeasurer);
      setTextMeasurer(undefined);
      expect(getTextMeasurer()).toBeUndefined();
    });
  });
});
