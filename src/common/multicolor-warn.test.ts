// SPDX-License-Identifier: EPL-2.0
/**
 * parseSegs' once-per-process `Total size > 1` warning and `Illegal value`
 * error, with the caller's AGPREV context. Expectations are native dot 16.1.0's
 * stderr for the same input.
 * @see lib/common/emit.c:470 parseSegs
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../index.js';
import { agwarningf } from './agerr.js';
import { parseSegs, parseSegsSilent } from './multicolor.js';
import { resetRenderState } from './render-state.js';

const OVER = 'red;0.6:blue;0.6';
const BAD = 'red;x:blue';
const FORMATS = ['svg', 'xdot'] as const;
const WARN_EDGE = `Warning: Total size > 1 in "${OVER}" color spec in edge a -> b`;

function capture(): string[] {
  const lines: string[] = [];
  const sink = (...a: unknown[]): void => { lines.push(a.map(String).join(' ')); };
  vi.spyOn(console, 'error').mockImplementation(sink);
  vi.spyOn(console, 'warn').mockImplementation(sink);
  return lines;
}

function stderrOf(src: string, format: 'svg' | 'xdot'): string[] {
  const lines = capture();
  render(parse(src), format, { engine: 'dot' });
  return lines;
}

beforeEach(() => { resetRenderState(); });
afterEach(() => { vi.restoreAllMocks(); });

describe('parseSegs messages', () => {
  it('warns with the context on the same line', () => {
    const lines = capture();
    expect(parseSegs(OVER, () => 'in edge a -> b').error).toBe(3);
    expect(lines).toEqual([WARN_EDGE]);
  });

  it('warns once per process, then returns rv 0', () => {
    const lines = capture();
    expect(parseSegs(OVER).error).toBe(3);
    expect(parseSegs(OVER).error).toBe(0);
    expect(lines).toEqual([]);
    agwarningf('next');
    // The text has no newline in C: the next message continues the line.
    expect(lines).toEqual([`Warning: Total size > 1 in "${OVER}" color spec Warning: next`]);
  });

  it('shares the flag with the Illegal-value error, in both orders', () => {
    const lines = capture();
    expect(parseSegs(BAD, () => 'in edge a -> b').error).toBe(2);
    expect(parseSegs(OVER).error).toBe(0);
    expect(parseSegs(BAD).error).toBe(1);
    expect(lines).toEqual([
      `Error: Illegal value in "${BAD}" color attribute; float expected after ';'`,
      'in edge a -> b',
    ]);
    resetRenderState();
    expect(parseSegs(OVER).error).toBe(3);
    expect(parseSegs(BAD).error).toBe(1);
  });

  it('silent parse neither prints nor consumes the flag', () => {
    const lines = capture();
    expect(parseSegsSilent(OVER).error).toBe(0);
    expect(parseSegsSilent(BAD).error).toBe(1);
    expect(lines).toEqual([]);
    expect(parseSegs(OVER).error).toBe(3);
  });
});

describe.each(FORMATS)('Total size warning by caller — %s', (format) => {
  it('edge', () => {
    expect(stderrOf(`digraph{a->b[color="${OVER}"]}`, format)).toEqual([WARN_EDGE]);
  });

  it('undirected edge uses --', () => {
    expect(stderrOf(`graph{a--b[color="${OVER}"]}`, format)).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec in edge a -- b`,
    ]);
  });

  it('two edges warn once', () => {
    const src = `digraph{a->b[color="${OVER}"];c->d[color="red;0.7:blue;0.7"]}`;
    expect(stderrOf(src, format)).toEqual([WARN_EDGE]);
  });

  it('cluster', () => {
    const src = `digraph{subgraph cluster0{style=striped;fillcolor="${OVER}";a}}`;
    expect(stderrOf(src, format)).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec in cluster cluster0`,
    ]);
  });

  it('striped node, then an edge of another kind: once', () => {
    const src = `digraph{a[shape=box,style=striped,fillcolor="${OVER}"];a->b[color="red;0.7:blue;0.7"]}`;
    expect(stderrOf(src, format)).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec in node a`,
    ]);
  });

  it('wedged node', () => {
    expect(stderrOf(`digraph{a[style=wedged,fillcolor="${OVER}"]}`, format)).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec in node a`,
    ]);
  });

  it('nodes are emitted before edges, so the node claims it', () => {
    const src = `digraph{a->b[color="red;0.7:blue;0.7"];b[shape=box,style=striped,fillcolor="${OVER}"]}`;
    expect(stderrOf(src, format)).toEqual([
      `Warning: Total size > 1 in "${OVER}" color spec in node b`,
    ]);
  });

  it('illegal value then a warning-class spec: error only, with context', () => {
    const src = `digraph{a->b[color="${BAD}"];c->d[color="${OVER}"]}`;
    expect(stderrOf(src, format)).toEqual([
      `Error: Illegal value in "${BAD}" color attribute; float expected after ';'`,
      'in edge a -> b',
    ]);
  });
});
