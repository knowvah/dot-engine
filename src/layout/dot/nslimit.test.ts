// SPDX-License-Identifier: EPL-2.0
/**
 * dot `nslimit` — x-coordinate network simplex iteration cap.
 *
 * @see lib/dotgen/position.c:nsiter2
 */

import { describe, it, expect } from 'vitest';
import { Graph } from '../../model/graph.js';
import { Node } from '../../model/node.js';
import { parse, render } from '../../index.js';
import { nsiter2 } from './position.js';

const INT_MAX = 2147483647;

function graphWithNodes(n: number, nslimit?: string): Graph {
  const g = new Graph('G', 'directed');
  for (let i = 0; i < n; i++) g.nodes.set(`n${i}`, new Node(i, `n${i}`, g));
  if (nslimit !== undefined) g.attrs.set('nslimit', nslimit);
  return g;
}

describe('nsiter2', () => {
  it('returns INT_MAX when nslimit is unset', () => {
    expect(nsiter2(graphWithNodes(5))).toBe(INT_MAX);
  });

  it('scales nslimit by the node count', () => {
    expect(nsiter2(graphWithNodes(10, '2'))).toBe(20);
    expect(nsiter2(graphWithNodes(10, '0.5'))).toBe(5);
  });

  it('truncates a tiny nslimit to zero iterations', () => {
    expect(nsiter2(graphWithNodes(10, '0.01'))).toBe(0);
  });

  it('reads a subgraph-only nslimit as the root default "" (atof → 0)', () => {
    // C declares the attribute on the root with default "" (native output
    // equals nslimit=0), so maxiter is 0, not INT_MAX.
    const g = graphWithNodes(10);
    g.declaredGraphAttrs.add('nslimit');
    expect(nsiter2(g)).toBe(0);
  });

  it('clamps a negative nslimit to zero', () => {
    expect(nsiter2(graphWithNodes(10, '-3'))).toBe(0);
  });

  it('treats a non-numeric nslimit as atof does (0)', () => {
    expect(nsiter2(graphWithNodes(10, 'abc'))).toBe(0);
  });
});

function xPositions(src: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const line of String(render(parse(src), 'plain', { engine: 'dot' })).split('\n')) {
    const m = /^node (\S+) (\S+) /.exec(line);
    if (m) out.set(m[1], Number(m[2]));
  }
  return out;
}

function synthetic(nslimit: string): string {
  const lines = [`digraph G { ${nslimit}`];
  let s = 12345;
  const rnd = (k: number): number => { s = (s * 1103515245 + 12345) % 2147483648; return s % k; };
  const n = 40;
  for (let i = 0; i < n; i++) lines.push(`n${i} [width=${[0.5, 1, 1.5, 2][rnd(4)]}];`);
  for (let e = 0; e < 80; e++) {
    const a = rnd(n - 1);
    const b = a + 1 + rnd(n - 1 - a);
    lines.push(`n${a}->n${b} [weight=${1 + rnd(5)}];`);
  }
  return `${lines.join('\n')}\n}`;
}

describe('nslimit end-to-end', () => {
  it('changes x-coordinates when nslimit truncates network simplex', () => {
    const free = xPositions(synthetic(''));
    const capped = xPositions(synthetic('nslimit=0.01;'));
    let maxDx = 0;
    for (const [id, x] of free) maxDx = Math.max(maxDx, Math.abs(x - (capped.get(id) ?? NaN)));
    expect(maxDx).toBeGreaterThan(1);
  });

  it('leaves output unchanged for a generous nslimit', () => {
    const free = xPositions(synthetic(''));
    const big = xPositions(synthetic('nslimit=1000;'));
    expect([...big]).toEqual([...free]);
  });
});
