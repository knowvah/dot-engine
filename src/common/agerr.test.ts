// SPDX-License-Identifier: EPL-2.0
import { afterEach, describe, expect, it, vi } from 'vitest';
import { resetRenderState } from './render-state.js';
import {
  agerr, agerrFinished, agerrLineOn, agerrorf, agwarningf, escapeControl,
} from './agerr.js';

afterEach(() => vi.restoreAllMocks());

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
