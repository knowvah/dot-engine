// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRenderState } from './render-state.js';
import {
  agerr, agerrFinished, agerrLineOn, agerrPartial, agerrorf, agseterrf, agwarningf, escapeControl,
} from './agerr.js';

afterEach(() => {
  agseterrf(null);
  vi.restoreAllMocks();
});

describe('escapeControl', () => {
  it('writes control characters as three-digit octal', () => {
    expect(escapeControl('a\x01b\x7fc\x00\x1f')).toBe('a\\001b\\177c\\000\\037');
  });
  it('keeps white space, printable and non-ASCII text', () => {
    expect(escapeControl('x\ty\nz\v\f\r é€ ')).toBe('x\ty\nz\v\f\r é€ ');
  });
});

describe('agerr', () => {
  it('prefixes errors and writes them on console.error', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    agerrorf('bad \x01 thing');
    expect(err.mock.calls).toEqual([['Error: bad \\001 thing']]);
  });
  it('prefixes warnings and writes them on console.warn', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    agwarningf('careful\x7f');
    expect(warn.mock.calls).toEqual([['Warning: careful\\177']]);
  });
  it('continues the previous level without a prefix', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    agerr('warning', 'first');
    agerr('prev', 'more\x02');
    agerr('error', 'second');
    agerr('prev', 'again');
    expect(warn.mock.calls).toEqual([['Warning: first'], ['more\\002']]);
    expect(err.mock.calls).toEqual([['Error: second'], ['again']]);
  });
  it('starts a render at AGWARN, which AGPREV then continues', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    agerr('error', 'x');
    resetRenderState();
    agerr('prev', 'cont');
    expect(warn.mock.calls).toEqual([['cont']]);
  });
  it('keeps tab and newline raw', () => {
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    agerr('error', 'a\tb\n');
    expect(err.mock.calls).toEqual([['Error: a\tb\n']]);
  });
});

describe('finished lines', () => {
  it('picks the channel from the prefix and escapes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    agerrFinished('Warning: w\x01');
    agerrFinished('Error: e\x01');
    agerrLineOn('warn', 'bare\x01');
    expect(warn.mock.calls).toEqual([['Warning: w\\001'], ['bare\\001']]);
    expect(err.mock.calls).toEqual([['Error: e\\001']]);
  });
});

describe('partial lines (AD-7)', () => {
  const NATIVE_75 =
    'Warning: Total size > 1 in "red;0.6:blue;0.6" color spec Warning: red;0.6 is not a known color.';
  const quiet = () => ({
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    err: vi.spyOn(console, 'error').mockImplementation(() => {}),
  });
  it('joins a partial warning with the next warning into native line 75', () => {
    const { warn, err } = quiet();
    agerrPartial('warning', 'Total size > 1 in "red;0.6:blue;0.6" color spec ');
    expect(warn.mock.calls).toEqual([]);
    agwarningf('red;0.6 is not a known color.');
    expect(warn.mock.calls).toEqual([[NATIVE_75]]);
    expect(err.mock.calls).toEqual([]);
  });
  it('appends an AGPREV message without a prefix', () => {
    const { warn } = quiet();
    agerrPartial('warning', 'a ');
    agerr('prev', 'b\x01');
    expect(warn.mock.calls).toEqual([['Warning: a b\\001']]);
  });
  it('lets the first message set the channel', () => {
    const { warn, err } = quiet();
    agerrPartial('error', 'first ');
    agwarningf('second');
    expect(err.mock.calls).toEqual([['Error: first Warning: second']]);
    expect(warn.mock.calls).toEqual([]);
  });
  it('keeps a chain of partials open until a finishing message', () => {
    const { warn } = quiet();
    agerrPartial('warning', 'a ');
    agerrPartial('prev', 'b ');
    expect(warn.mock.calls).toEqual([]);
    agerr('prev', 'c');
    expect(warn.mock.calls).toEqual([['Warning: a b c']]);
  });
  it('flushes a held line exactly once on render-state reset', () => {
    const { warn } = quiet();
    agerrPartial('warning', 'held ');
    resetRenderState();
    resetRenderState();
    expect(warn.mock.calls).toEqual([['Warning: held ']]);
  });
  it('prints a held line before a finished line', () => {
    const { warn } = quiet();
    agerrPartial('warning', 'held ');
    agerrFinished('Warning: whole');
    expect(warn.mock.calls).toEqual([['Warning: held '], ['Warning: whole']]);
  });
  it('leaves ordinary calls unchanged when nothing is held', () => {
    const { warn } = quiet();
    agwarningf('plain');
    expect(warn.mock.calls).toEqual([['Warning: plain']]);
  });
});

describe('agseterrf', () => {
  /** Install a sink that records every piece it is given. */
  const capture = (): string[] => {
    const got: string[] = [];
    agseterrf((message) => { got.push(message); return 0; });
    return got;
  };
  const quiet = () => ({
    warn: vi.spyOn(console, 'warn').mockImplementation(() => {}),
    err: vi.spyOn(console, 'error').mockImplementation(() => {}),
  });

  it('returns the previous function, null at first', () => {
    const f = () => 0;
    expect(agseterrf(f)).toBeNull();
    expect(agseterrf(null)).toBe(f);
  });
  it('hands over the pieces C\'s out() writes: prefix, separator, message', () => {
    const { warn, err } = quiet();
    const got = capture();
    agwarningf('careful');
    agerrorf('bad');
    expect(got).toEqual(['Warning', ': ', 'careful\n', 'Error', ': ', 'bad\n']);
    expect(warn.mock.calls).toEqual([]);
    expect(err.mock.calls).toEqual([]);
  });
  it('writes AGPREV with no prefix', () => {
    const got = capture();
    agwarningf('table size too small for content');
    agerr('prev', 'in label of node a');
    expect(got).toEqual(['Warning', ': ', 'table size too small for content\n', 'in label of node a\n']);
  });
  it('does not escape: that is default_usererrf\'s job', () => {
    const got = capture();
    agwarningf('a\x01b');
    expect(got).toEqual(['Warning', ': ', 'a\x01b\n']);
  });
  it('streams a partial message at once, with no line end', () => {
    const got = capture();
    agerrPartial('warning', 'Total size > 1 ');
    expect(got).toEqual(['Warning', ': ', 'Total size > 1 ']);
    agwarningf('red;0.6 is not a known color.');
    expect(got.join('')).toBe('Warning: Total size > 1 Warning: red;0.6 is not a known color.\n');
  });
  it('gets an assembled line whole, ended once', () => {
    const got = capture();
    agerrFinished('Warning: whole');
    agerrLineOn('error', 'bare');
    expect(got).toEqual(['Warning: whole\n', 'bare\n']);
  });
  it('hands a line held before it was set to the new function', () => {
    quiet();
    agerrPartial('warning', 'held ');
    const got = capture();
    agwarningf('next');
    expect(got.join('')).toBe('Warning: held \nWarning: next\n');
  });
  it('survives a render-state reset, as C\'s static does', () => {
    const got = capture();
    resetRenderState();
    agwarningf('after');
    expect(got).toEqual(['Warning', ': ', 'after\n']);
  });
  it('gives the console back once cleared', () => {
    const { warn } = quiet();
    capture();
    agseterrf(null);
    agwarningf('plain');
    expect(warn.mock.calls).toEqual([['Warning: plain']]);
  });
});
