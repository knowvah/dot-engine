// SPDX-License-Identifier: EPL-2.0

import { describe, test, expect } from 'vitest';
import {
  KNOWN_FAILING_SUFFIX,
  isListed,
  knownFailingName,
  selectTestFn,
  validateKnownFailing,
} from './known-failing.js';

describe('validateKnownFailing', () => {
  test('accepts empty lists', () => {
    expect(validateKnownFailing({ goldens: [], ptIssue: [] })).toEqual({
      goldens: [],
      ptIssue: [],
    });
  });

  test('accepts sorted unique lists and returns them unchanged', () => {
    const raw = { goldens: ['a', 'b', 'c'], ptIssue: ['23', '30'] };
    expect(validateKnownFailing(raw)).toEqual(raw);
  });

  test('rejects a non-object root', () => {
    expect(() => validateKnownFailing([])).toThrow(/root must be an object/);
    expect(() => validateKnownFailing(null)).toThrow(/root must be an object/);
  });

  test('rejects unknown keys, naming the key', () => {
    expect(() =>
      validateKnownFailing({ goldens: [], ptIssue: [], extra: [] }),
    ).toThrow(/unknown key "extra"/);
  });

  test('rejects a missing list', () => {
    expect(() => validateKnownFailing({ goldens: [] })).toThrow(
      /"ptIssue" must be an array/,
    );
  });

  test('rejects non-string entries', () => {
    expect(() =>
      validateKnownFailing({ goldens: ['a', 7], ptIssue: [] }),
    ).toThrow(/"goldens"\[1\] must be a string/);
  });

  test('rejects duplicate ids', () => {
    expect(() =>
      validateKnownFailing({ goldens: ['a', 'a'], ptIssue: [] }),
    ).toThrow(/"goldens" has duplicate id "a"/);
  });

  test('rejects unsorted lists', () => {
    expect(() =>
      validateKnownFailing({ goldens: [], ptIssue: ['30', '23'] }),
    ).toThrow(/"ptIssue" is not sorted: "23" must precede "30"/);
  });
});

describe('selection helpers', () => {
  const known = { goldens: ['dot-x'], ptIssue: ['23'] };

  test('isListed checks membership in the requested list', () => {
    expect(isListed(known, 'goldens', 'dot-x')).toBe(true);
    expect(isListed(known, 'goldens', '23')).toBe(false);
    expect(isListed(known, 'ptIssue', '23')).toBe(true);
  });

  test('selectTestFn picks the registrar by listing', () => {
    const calls: string[] = [];
    const plain = (n: string): void => void calls.push(`plain:${n}`);
    const fails = (n: string): void => void calls.push(`fails:${n}`);
    selectTestFn(true, plain, fails)('t');
    selectTestFn(false, plain, fails)('t');
    expect(calls).toEqual(['fails:t', 'plain:t']);
  });

  test('knownFailingName appends the suffix only when listed', () => {
    expect(KNOWN_FAILING_SUFFIX).toBe('[known-failing 16.1]');
    expect(knownFailingName('n', true)).toBe('n [known-failing 16.1]');
    expect(knownFailingName('n', false)).toBe('n');
  });
});
