// SPDX-License-Identifier: EPL-2.0
/**
 * findStopColor / parseSegs diagnostics for node, cluster and HTML fills.
 * Expectations are native dot 16.1.0's stderr (follow-up items 75, 77, 82).
 * @see lib/common/emit.c:parseSegs
 * @see lib/common/emit.c:findStopColor
 * @see lib/common/htmltable.c:setFill
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import { agerrorf, agwarningf } from './agerr.js';
import { findStopColor } from './style-resolve.js';
import { parseSegs } from './multicolor.js';
import { resetRenderState } from './render-state.js';

const MANY = 'Warning: More than 2 colors specified for a gradient - ignoring remaining';
const TOTAL_NODE = 'Warning: Total size > 1 in "red;0.6:blue;0.6" color spec ';

function capture(): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return lines;
}

function run(src: string): { err: string[]; svg: string } {
  const err = capture();
  const svg = String(render(parse(src), 'svg', { engine: 'dot' }));
  return { err, svg };
}

const table = (bg: string): string =>
  `digraph{a[label=<<TABLE BGCOLOR="${bg}"><TR><TD>x</TD></TR></TABLE>>]}`;

beforeEach(() => { resetRenderState(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('findStopColor', () => {
  it('returns null for an over-full list (parseSegs rv 3), leaving the line open', () => {
    const err = capture();
    expect(findStopColor('red;0.6:blue;0.6')).toBeNull();
    expect(err).toEqual([]);
    agwarningf('next');
    expect(err).toEqual([`${TOTAL_NODE}Warning: next`]);
  });

  it('warns once for three colours and keeps the first two', () => {
    const err = capture();
    expect(findStopColor('red:blue:green')).toEqual({ fillColor: 'red', stopColor: 'blue', frac: 0 });
    expect(err).toEqual([MANY]);
  });

  it('is silent when the weights already fill two stops', () => {
    const err = capture();
    expect(findStopColor('red;0.5:blue;0.5:green;0.5')?.frac).toBe(0.5);
    expect(err).toEqual([]);
  });

  it('returns null without a first colour', () => {
    capture();
    expect(findStopColor(':red')).toBeNull();
  });
});

describe('parseSegs partial line', () => {
  it('holds the Total-size text until the next message', () => {
    const err = capture();
    expect(parseSegs('red;0.6:blue;0.6').error).toBe(3);
    expect(err).toEqual([]);
    agerrorf('later');
    expect(err).toEqual([`${TOTAL_NODE}Error: later`]);
  });

  it('completes the line with the caller context', () => {
    const err = capture();
    parseSegs('red;0.6:blue;0.6', () => 'in edge a -> b');
    expect(err).toEqual([`${TOTAL_NODE}in edge a -> b`]);
  });
});

describe('native stderr parity', () => {
  it('node: Total-size line joined to the unknown-colour warning', () => {
    const { err } = run('digraph{a[style=filled fillcolor="red;0.6:blue;0.6"]}');
    expect(err).toEqual([`${TOTAL_NODE}Warning: red;0.6 is not a known color.`]);
  });

  it('node: three colours warn once', () => {
    expect(run('digraph{a[style=filled fillcolor="red:blue:green"]}').err).toEqual([MANY]);
  });

  it('cluster: weighted fill joins and names the first colour only', () => {
    const { err } = run('digraph{subgraph cluster_a{style=filled fillcolor="red;0.7:blue;0.6:green";a}}');
    expect(err).toEqual([
      'Warning: Total size > 1 in "red;0.7:blue;0.6:green" color spec Warning: red;0.7 is not a known color.',
    ]);
  });

  it('cluster: three colours warn, exact weights do not', () => {
    expect(run('digraph{subgraph cluster_a{style=filled fillcolor="red:blue:green";a}}').err).toEqual([MANY]);
    resetRenderState();
    expect(run('digraph{subgraph cluster_a{style=filled fillcolor="red;0.5:blue;0.5:green;0.5";a}}').err)
      .toEqual([]);
  });

  it('table: weighted BGCOLOR joins like the node case', () => {
    expect(run(table('red;0.7:blue;0.6')).err).toEqual([
      'Warning: Total size > 1 in "red;0.7:blue;0.6" color spec Warning: red;0.7 is not a known color.',
    ]);
  });

  it('table: the Error precedes the colour warning', () => {
    expect(run(table('red;x:blue')).err).toEqual([
      "Error: Illegal value in \"red;x:blue\" color attribute; float expected after ';'",
      'Warning: red;x is not a known color.',
    ]);
  });

  it('table: a leading colon warns with an empty name and fills opaque black', () => {
    const { err, svg } = run(table(':red'));
    expect(err).toEqual(['Warning:  is not a known color.']);
    expect(svg).toContain('<polygon fill="#000000" stroke="none"');
  });

  it('table: three colours warn once', () => {
    expect(run(table('red:blue:green')).err).toEqual([MANY]);
  });
});
