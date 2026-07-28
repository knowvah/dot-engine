// SPDX-License-Identifier: EPL-2.0
//
// Tests for xdotId's DOT identifier quoting — agwrite's agcanonStr.
// @see lib/cgraph/write.c:113 _agstrcanon
//
// Every "matches native" expectation below was taken from the oracle
// (`dot -Tdot` on a one-node graph with that name); this path had no coverage,
// which is why an unparseable trailing-backslash case survived unnoticed.

import { describe, it, expect } from 'vitest';
import { xdotId } from './xdot-ops.js';

describe('xdotId — bare vs quoted', () => {
  it('leaves a bare identifier unquoted', () => {
    expect(xdotId('abc')).toBe('abc');
    expect(xdotId('_a1')).toBe('_a1');
  });

  it('leaves a numeral unquoted', () => {
    expect(xdotId('12')).toBe('12');
    expect(xdotId('-1.5')).toBe('-1.5');
    expect(xdotId('.5')).toBe('.5');
  });

  it('quotes anything else', () => {
    expect(xdotId('a b')).toBe('"a b"');
    expect(xdotId('1a')).toBe('"1a"');
    expect(xdotId('')).toBe('""');
  });
});

describe('xdotId — backslash handling matches _agstrcanon', () => {
  // C copies backslashes through verbatim; doubling them would corrupt stored
  // escapes. Each of these was verified byte-identical against the oracle.
  it('does not double a backslash that starts an escape', () => {
    expect(xdotId('a\\nb')).toBe('"a\\nb"');
    expect(xdotId('a\\lb\\rc')).toBe('"a\\lb\\rc"');
  });

  it('does not double an interior escaped backslash', () => {
    expect(xdotId('a\\\\b')).toBe('"a\\\\b"');
  });

  it('escapes a bare quote', () => {
    expect(xdotId('a"b')).toBe('"a\\"b"');
    expect(xdotId('"q"')).toBe('"\\"q\\""');
  });

  it('leaves an even trailing backslash run alone', () => {
    expect(xdotId('a\\\\')).toBe('"a\\\\"');
  });
});

describe('xdotId — output always reparses', () => {
  /** True if the quoted form terminates: the closing quote is not escaped. */
  function terminates(quoted: string): boolean {
    if (!quoted.startsWith('"')) return true;
    const inner = quoted.slice(1, -1);
    return (/\\*$/.exec(inner)![0].length) % 2 === 0;
  }

  it('pads an odd trailing backslash so the close quote is not escaped', () => {
    // C emits `"a\"` here, which does not reparse. Unreachable from DOT text —
    // only the programmatic API can supply such a name.
    expect(xdotId('a\\')).toBe('"a\\\\"');
    expect(terminates(xdotId('a\\'))).toBe(true);
  });

  it('never emits an unterminated string for any backslash/quote mix', () => {
    const names = [
      'a\\', 'a\\\\', 'a\\\\\\', 'a"b', 'a\\"b', 'a\\nb', '\\', '\\\\',
      '"', '\\"', 'a"\\', 'a\\\\"', '', ' ', 'a\\\\\\\\',
    ];
    for (const n of names) {
      expect(terminates(xdotId(n)), `name ${JSON.stringify(n)}`).toBe(true);
    }
  });
});
