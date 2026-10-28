// SPDX-License-Identifier: EPL-2.0
/**
 * HTML BGCOLOR gradient specs resolve through C's findStopColor (parseSegs),
 * not a split at the first ':'. Expectations are native dot 16.1.0's.
 * @see lib/common/emit.c:findStopColor
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import { findHtmlStopColor } from './htmltable-emit-fill.js';
import { resetRenderState } from './render-state.js';

const OVER = 'red;0.7:blue;0.6';

function cell(bg: string): string {
  return `digraph{a[shape=none label=<<table><tr><td bgcolor="${bg}">x</td></tr></table>>]}`;
}

function run(bg: string): { svg: string; err: string[] } {
  const err: string[] = [];
  const sink = (...a: unknown[]): void => { err.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return { svg: String(render(parse(cell(bg)), 'svg', { engine: 'dot' })), err };
}

describe('findHtmlStopColor', () => {
  beforeEach(() => { resetRenderState(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('keeps names with spaces', () => {
    expect(findHtmlStopColor('light blue:red', true)).toEqual({ fill: 'light blue', stop: 'red', frac: 0 });
  });
  it('reads the leading fraction', () => {
    expect(findHtmlStopColor('red;0.3:blue', true)).toEqual({ fill: 'red', stop: 'blue', frac: 0.3 });
  });
  it('derives frac from the second fraction', () => {
    expect(findHtmlStopColor('red:blue;0.4', true)).toEqual({ fill: 'red', stop: 'blue', frac: 0.6 });
  });
  it('ignores colors beyond the second', () => {
    expect(findHtmlStopColor('red:green:blue', true)?.stop).toBe('green');
  });
  it('is not a gradient on the first over-full spec (rv 3)', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    expect(findHtmlStopColor(OVER)).toBeNull();
  });
  it('is not a gradient for a single color or empty first color', () => {
    expect(findHtmlStopColor('red', true)).toBeNull();
    expect(findHtmlStopColor(':red', true)).toBeNull();
  });
  it('defaults a missing stop color to null', () => {
    expect(findHtmlStopColor('red:', true)?.stop).toBeNull();
  });
});

describe('HTML BGCOLOR render', () => {
  beforeEach(() => { resetRenderState(); });
  afterEach(() => { vi.restoreAllMocks(); });

  it('light blue:red is a gradient starting at "light blue"', () => {
    const { svg, err } = run('light blue:red');
    expect(svg).toContain('<linearGradient');
    expect(err).toEqual(['Warning: light blue is not a known color.']);
  });
  it('red;0.3:blue offsets the stops at 0.3', () => {
    const { svg } = run('red;0.3:blue');
    expect(svg).toContain('<stop offset="0.299" style="stop-color:red;stop-opacity:1.;"/>');
    expect(svg).toContain('<stop offset="0.300" style="stop-color:blue;stop-opacity:1.;"/>');
  });
  it('an over-full spec warns on one line then falls back to a solid fill', () => {
    const { svg, err } = run(OVER);
    expect(svg).not.toContain('<linearGradient');
    // Native joins these on one line (the Total-size text has no newline).
    expect(err).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec Warning: red;0.7 is not a known color.`,
    ]);
  });
  it('more than two colors warns per paint', () => {
    const { err } = run('red:green:blue');
    expect(err.filter((l) => l.includes('More than 2 colors'))).toHaveLength(1);
  });
});
