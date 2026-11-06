// SPDX-License-Identifier: EPL-2.0
//
// neato's stress, hier, ipsep and sgd solvers under `dim=3 dimen=3`, plus the
// subset and circuit models, a three-component pack and start=regular, against
// native graphviz 16.1.0 `-Kneato -Txdot/-Tdot`. Fixtures under __fixtures__/dim/
// are the oracle's own output (part-10 AD-3: byte-equal or within 0.01).
//
// mode=hier reaches the smart initial layout (stress.c's subspace estimate) three
// ways: above 2-D, for the (dim-1)-D seed; with no directed edge, which takes a
// graph without edges, since `acyclic` gives `dir=none` edges a direction; and when
// compute_hierarchy finds no level, which takes edges too short for abs_tol. NATIVE_PATH
// holds the calls an lldb run of the native plugin counted for each case.
// @see lib/neatogen/neatoinit.c:majorization, initRegular, dfsCycle
// @see lib/neatogen/stuff.c:initial_positions, randompos
// @see lib/neatogen/constrained_majorization.c:stress_majorization_with_hierarchy
// @see lib/neatogen/sgd.c:sgd
import { readFileSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { parse, render } from '../../index.js';
import { drand48, srand48 } from '../../common/random.js';
import { compareXdot, XDOT_TOLERANCE } from '../../../test/golden/compare-xdot.js';
import * as embed from './embed-graph.js';
import { neatoInitGraphDim } from './init-dim.js';
import { neatoInitNode } from './init.js';
import * as pca from './pca.js';
import { initialPositions } from './sgd.js';
import { initRegular } from './start.js';
import * as smartIni from './smart-ini-x.js';

vi.mock('./embed-graph.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./embed-graph.js')>();
  return { ...actual, embedGraph: vi.fn(actual.embedGraph) };
});
vi.mock('./pca.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./pca.js')>();
  return { ...actual, iterativePCA1D: vi.fn(actual.iterativePCA1D) };
});
vi.mock('./smart-ini-x.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./smart-ini-x.js')>();
  return { ...actual, imdsGivenDim: vi.fn(actual.imdsGivenDim) };
});

const FIXTURES = new URL('./__fixtures__/dim/', import.meta.url);
/** `compareXdot` tests `delta > tolerance` strictly; one printed unit needs the slack. */
const POSITION_TOLERANCE = XDOT_TOLERANCE + 1e-9;
const read = (name: string): string => readFileSync(new URL(name, FIXTURES), 'utf8');

/** Coordinates per node in `pos`, and for mode=hier the native calls of one render. */
interface Case { coords: number; path?: { embed: number; ipca: number; imds: number } }

const seed3 = { embed: 1, ipca: 1, imds: 0 }; // dim 3: the 2-D seed
const seed4 = { embed: 1, ipca: 0, imds: 0 }; // dim 4: the 3-D seed
const CASES: Readonly<Record<string, Case>> = {
  'dim3-dimen3': { coords: 3 },
  'ipsep-dim3': { coords: 3 },
  'sgd-dim3': { coords: 3 },
  'subset-dim3': { coords: 3 },
  'circuit-dim3': { coords: 3 },
  'pack-dim3': { coords: 3 },
  'regular-dim3': { coords: 3 },
  'hier-dim3': { coords: 3, path: seed3 },
  'hier-dim4': { coords: 4, path: seed4 },
  'hier-subset-dim3': { coords: 3, path: seed3 },
  'hier-stresswt1-dim3': { coords: 3, path: seed3 },
  'hier-stresswt1-dim4': { coords: 4, path: seed4 },
  'hier-circuit-dim3': { coords: 3, path: seed3 },
  'hier-len-dim3': { coords: 3, path: seed3 },
  'hier-two-dim3': { coords: 3, path: seed3 },
  'hier-ring-dim3': { coords: 3, path: seed3 },
  'hier-star-dim3': { coords: 3, path: seed3 },
  'hier-pack-dim3': { coords: 3, path: { embed: 3, ipca: 3, imds: 0 } },
  'hier-big-dim3': { coords: 3, path: seed3 },
  'hier-big-dim4': { coords: 4, path: seed4 },
  'hier-big-subset-dim3': { coords: 3, path: seed3 },
  'hier-big110-dim3': { coords: 3, path: seed3 },
  // `dir=none` does not stop `acyclic` directing the edges: 2-D still takes IMDS
  'hier-dirnone-dim2': { coords: 2, path: { embed: 0, ipca: 0, imds: 1 } },
  'hier-dirnone-dim3': { coords: 3, path: seed3 },
  // no directed edge
  'hier-noedge-dim2': { coords: 2, path: { embed: 1, ipca: 1, imds: 0 } },
  'hier-noedge-big': { coords: 2, path: { embed: 1, ipca: 1, imds: 0 } },
  'hier-noedge-dim3': { coords: 3, path: seed4 },
  'hier-noedge-dim4': { coords: 4, path: seed4 },
  // no hierarchy: dim 3 seeds in 2-D, then finds no level and solves in 3-D
  'hier-nohier-dim2': { coords: 2, path: { embed: 1, ipca: 1, imds: 0 } },
  'hier-nohier-dim3': { coords: 3, path: { embed: 2, ipca: 1, imds: 0 } },
};

/** The coordinates of each node's `pos`, in output order. */
function nodePos(text: string): number[][] {
  return [...text.matchAll(/\bpos="([^"]+)",\s*\n?\s*(?:width|z)/g)]
    .map((m) => m[1]!.split(',').map(Number));
}

function maxDelta(actual: number[][], expected: number[][]): number {
  let max = 0;
  expected.forEach((p, i) => p.forEach((v, k) => { max = Math.max(max, Math.abs(actual[i]![k]! - v)); }));
  return max;
}

beforeEach(() => {
  vi.mocked(embed.embedGraph).mockClear();
  vi.mocked(pca.iterativePCA1D).mockClear();
  vi.mocked(smartIni.imdsGivenDim).mockClear();
});
afterEach(() => { vi.restoreAllMocks(); });

describe.each(Object.keys(CASES))('%s matches native', (id) => {
  const src = (): string => read(`${id}.gv`);

  it('xdot', () => {
    const xdot = String(render(parse(src()), 'xdot', { engine: 'neato' }));
    expect(compareXdot(xdot, read(`${id}.xdot`), POSITION_TOLERANCE).diffs).toEqual([]);
  });

  it('dot pos, every coordinate', () => {
    const actual = nodePos(String(render(parse(src()), 'dot', { engine: 'neato' })));
    const expected = nodePos(read(`${id}.dot`));
    expect(actual.map((p) => p.length)).toEqual(expected.map((p) => p.length));
    expect(expected[0]!.length).toBe(CASES[id]!.coords);
    expect(maxDelta(actual, expected)).toBeLessThanOrEqual(POSITION_TOLERANCE);
  });

  it('stderr', () => {
    const lines: string[] = [];
    vi.spyOn(console, 'warn').mockImplementation((m: unknown) => { lines.push(String(m)); });
    render(parse(src()), 'xdot', { engine: 'neato' });
    expect(lines.join('\n')).toBe(read(`${id}.stderr`).trimEnd());
  });

});

describe.each(Object.keys(CASES).filter((id) => CASES[id]!.path !== undefined))('%s', (id) => {
  it('takes the native path', () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    render(parse(read(`${id}.gv`)), 'plain', { engine: 'neato' });
    expect({
      embed: vi.mocked(embed.embedGraph).mock.calls.length,
      ipca: vi.mocked(pca.iterativePCA1D).mock.calls.length,
      imds: vi.mocked(smartIni.imdsGivenDim).mock.calls.length,
    }).toEqual(CASES[id]!.path);
  });
});

describe('initRegular', () => {
  const CYCLE = 'graph { a -- b -- c }';

  it('draws z after x and y of each node, nG times drand48', () => {
    const g = parse(CYCLE);
    g.root.info.ndim = 3;
    srand48(7);
    const draws = [drand48(), drand48(), drand48()];
    srand48(7);
    initRegular(g, 3);
    const a = (2 * Math.PI) / 3;
    expect([...g.nodes.values()].map((n) => n.info.pos)).toEqual([
      [3, 0, 3 * draws[0]!],
      [3 * Math.cos(a), 3 * Math.sin(a), 3 * draws[1]!],
      [3 * Math.cos(a + a), 3 * Math.sin(a + a), 3 * draws[2]!],
    ]);
  });

  it('fills every dimension above 2', () => {
    const g = parse(CYCLE);
    g.root.info.ndim = 5;
    initRegular(g, 3);
    expect([...g.nodes.values()].map((n) => n.info.pos!.length)).toEqual([5, 5, 5]);
  });

  it('draws nothing in 2-D', () => {
    const g = parse(CYCLE);
    srand48(7);
    const first = drand48();
    srand48(7);
    initRegular(g, 3);
    expect(drand48()).toBe(first);
    expect([...g.nodes.values()].map((n) => n.info.pos!.length)).toEqual([2, 2, 2]);
  });
});

describe('initialPositions', () => {
  const setup = (src: string, ndim: number): ReturnType<typeof parse> => {
    const g = parse(src);
    neatoInitGraphDim(g);
    for (const n of g.nodes.values()) neatoInitNode(n, ndim);
    return g;
  };

  it('randompos draws x, y, then z of each node in [0,1)', () => {
    srand48(1);
    const d = Array.from({ length: 6 }, () => drand48());
    const g = setup('graph { dim=3; a -- b }', 3);
    initialPositions(g, 2);
    expect([...g.nodes.values()].map((n) => n.info.pos)).toEqual([d.slice(0, 3), d.slice(3, 6)]);
  });

  it('randompos draws only x and y in 2-D', () => {
    srand48(1);
    const d = Array.from({ length: 4 }, () => drand48());
    const g = setup('graph { a -- b }', 2);
    initialPositions(g, 2);
    expect([...g.nodes.values()].map((n) => n.info.pos)).toEqual([d.slice(0, 2), d.slice(2, 4)]);
  });
});
