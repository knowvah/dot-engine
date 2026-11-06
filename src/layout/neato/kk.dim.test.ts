// SPDX-License-Identifier: EPL-2.0
//
// mode=KK under `dim` and `dimen` against native graphviz 16.1.0
// `-Kneato -Txdot/-Tdot`. Fixtures under __fixtures__/dim/ are the oracle's own
// output (part-10 AD-3: byte-equal or within 0.01). Each repeats over 8 native
// runs. `kk-dim4-dimen4` and `kk-pins-dim3` are KK twins of the default-solver
// cases `dim4-dimen4` and `pins-dim3`.
// @see lib/neatogen/stuff.c:randompos, initial_positions, move_node
import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import type { Graph } from '../../model/graph.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import { drand48, srand48 } from '../../common/random.js';
import { kkNeato } from './kk.js';

const FIXTURES = new URL('./__fixtures__/dim/', import.meta.url);
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const KK_CASES = ['kk-dim3', 'kk-dim4-dimen4', 'kk-pins-dim3'] as const;
const SEED = 7;
/** The model argument of `kkNeato` that selects shortest paths. */
const MODEL_SHORTPATH = 0;

const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

afterEach(() => { vi.restoreAllMocks(); });

/** Every node's `pos` and `z`, by node name, from `-Tdot` text. */
function nodeCoords(text: string): Map<string, number[]> {
  const nodes = new Map<string, number[]>();
  for (const m of text.matchAll(/^\t(\w+)\t\[height=[^\]]*?pos="([^"]+)"[^\]]*\]/gms)) {
    nodes.set(m[1]!, m[2]!.split(',').map(Number));
  }
  return nodes;
}

/** Captures console.warn and console.error as native's stderr lines. */
function captureStderr(): string[] {
  const lines: string[] = [];
  const push = (m: unknown): void => { lines.push(`${String(m)}\n`); };
  vi.spyOn(console, 'warn').mockImplementation(push);
  vi.spyOn(console, 'error').mockImplementation(push);
  return lines;
}

function neato(id: string, format: 'dot' | 'xdot'): string {
  return String(render(parse(read(`${id}.gv`)), format, { engine: 'neato' }));
}

/** A graph with `ndim` on its root and a zeroed `pos` of that length on each node. */
function prepared(src: string, ndim: number): Graph {
  const g = parse(src);
  g.info.ndim = ndim;
  for (const n of g.nodes.values()) n.info.pos = new Array<number>(ndim).fill(0);
  return g;
}

/** The next `count` values of the drand48 stream `checkStart` seeds with SEED. */
function stream(count: number): number[] {
  srand48(SEED);
  return Array.from({ length: count }, () => drand48());
}

describe('mode=KK under dim matches native', () => {
  it.each(KK_CASES)('%s xdot and stderr', (id) => {
    const stderr = captureStderr();
    const xdot = neato(id, 'xdot');
    expect(compareXdot(xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
    expect(stderr.join('')).toBe(read(`${id}.stderr`));
  });

  it.each(KK_CASES)('%s prints the same node coordinates as native -Tdot', (id) => {
    const native = nodeCoords(read(`${id}.dot`));
    const port = nodeCoords(neato(id, 'dot'));
    expect(native.size).toBeGreaterThan(0);
    expect([...port.keys()]).toEqual([...native.keys()]);
    for (const [name, coords] of native) {
      const got = port.get(name)!;
      expect(got.length).toBe(coords.length);
      coords.forEach((c, k) => { expect(Math.abs(got[k]! - c)).toBeLessThanOrEqual(POSITION_TOLERANCE); });
    }
  });

  it('kk-pins-dim3 keeps the pinned node at z = 3 inches', () => {
    const dot = neato('kk-pins-dim3', 'dot');
    expect(nodeCoords(dot).get('a')![2]).toBe(216);
    expect(dot).toMatch(/z=216\.000000/);
  });
});

describe('randompos and initial_positions draw ndim values per node', () => {
  const FIRST_POS = `start=${SEED}; maxiter=0; a--b`;

  it.each([3, 4, 10])('fills all %d coordinates in node order, in C draw order', (ndim) => {
    captureStderr();
    const g = prepared(`graph g { ${FIRST_POS} }`, ndim);
    kkNeato(g, 2, MODEL_SHORTPATH);
    const draws = stream(2 * ndim);
    expect(g.nodes.get('a')!.info.pos).toEqual(draws.slice(0, ndim));
    expect(g.nodes.get('b')!.info.pos).toEqual(draws.slice(ndim));
  });

  it('still draws two per node on a graph whose ndim is unset', () => {
    captureStderr();
    const g = parse(`graph g { ${FIRST_POS} }`);
    for (const n of g.nodes.values()) n.info.pos = [0, 0];
    kkNeato(g, 2, MODEL_SHORTPATH);
    const draws = stream(4);
    expect(g.nodes.get('a')!.info.pos).toEqual(draws.slice(0, 2));
    expect(g.nodes.get('b')!.info.pos).toEqual(draws.slice(2));
  });

  it('skips a node with a position, keeping all its coordinates', () => {
    captureStderr();
    const g = prepared(`graph g { ${FIRST_POS} }`, 3);
    const a = g.nodes.get('a')!;
    a.info.pos = [5, 6, 7];
    a.info.posSet = true;
    kkNeato(g, 2, MODEL_SHORTPATH);
    expect(a.info.pos).toEqual([5, 6, 7]);
    expect(g.nodes.get('b')!.info.pos).toEqual(stream(3));
  });
});

describe('move_node works in ndim dimensions', () => {
  it.each([[3, 3], [4, 2], [10, 2]])('one move at ndim %d over %d nodes draws one damping factor per dimension', (ndim, n) => {
    captureStderr();
    const names = ['a', 'b', 'c'].slice(0, n);
    const g = prepared(`graph g { start=${SEED}; maxiter=1; ${names.join('--')} }`, ndim);
    kkNeato(g, n, MODEL_SHORTPATH);
    const next = drand48();
    const moveDraws = n * ndim + ndim;
    expect(next).toBe(stream(moveDraws + 1)[moveDraws]);
  });

  it('solves distance in every coordinate and leaves a pinned node alone', () => {
    captureStderr();
    const g = prepared(`graph g { start=${SEED}; a--b--c--a }`, 3);
    const a = g.nodes.get('a')!;
    a.info.pos = [0.25, 0.5, 0.75];
    a.info.pinned = true;
    const b = g.nodes.get('b')!;
    const c = g.nodes.get('c')!;
    kkNeato(g, 3, MODEL_SHORTPATH);
    expect(a.info.pos).toEqual([0.25, 0.5, 0.75]);
    // All three unit edges settle at length 1 only if every coordinate is solved.
    const length = (p: number[], q: number[]): number => Math.hypot(...p.map((v, k) => v - q[k]!));
    expect(length(a.info.pos, b.info.pos!)).toBeCloseTo(1, 2);
    expect(length(a.info.pos, c.info.pos!)).toBeCloseTo(1, 2);
    expect(length(b.info.pos!, c.info.pos!)).toBeCloseTo(1, 2);
  });
});
